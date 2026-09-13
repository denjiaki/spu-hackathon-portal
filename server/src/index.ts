import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, schema } from "./db.js";
import {
  createSession, destroySession, getSessionUser, hashPassword,
  newId, publicUser, requireAuth, verifyPassword,
} from "./auth.js";
import { admin } from "./admin.js";
import { RUBRIC, totalScore, validateScores } from "./rubric.js";
import { runSeed } from "./seed.js";

// Auto-seed a fresh database so ephemeral hosts (e.g. Heroku dynos) always
// boot with demo data. A populated database is never touched.
const hasUsers = db.select().from(schema.users).limit(1).all().length > 0;
if (!hasUsers) {
  console.log("Empty database detected — loading demo seed data.");
  await runSeed();
}

const app = new Hono();
app.use("*", logger());

const api = new Hono();

// ---------- Authentication ----------

api.post("/auth/register", async (c) => {
  const body = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(8),
  }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Provide a valid email, name, and a password of 8+ characters" }, 400);

  const email = body.data.email.toLowerCase();
  const existing = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (existing) return c.json({ error: "An account with that email already exists" }, 409);

  const id = newId();
  db.insert(schema.users).values({
    id,
    email,
    name: body.data.name,
    passwordHash: hashPassword(body.data.password),
    role: "participant",
    qrToken: newId(),
    createdAt: new Date().toISOString(),
  }).run();
  createSession(c, id);
  const user = db.select().from(schema.users).where(eq(schema.users.id, id)).get()!;
  return c.json(publicUser(user));
});

api.post("/auth/login", async (c) => {
  const body = z.object({ email: z.string().email(), password: z.string() }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid credentials" }, 400);
  const user = db.select().from(schema.users)
    .where(eq(schema.users.email, body.data.email.toLowerCase())).get();
  if (!user || !verifyPassword(body.data.password, user.passwordHash)) {
    return c.json({ error: "Email or password is incorrect" }, 401);
  }
  createSession(c, user.id);
  return c.json(publicUser(user));
});

api.post("/auth/logout", (c) => {
  destroySession(c);
  return c.json({ ok: true });
});

api.get("/auth/me", (c) => {
  const user = getSessionUser(c);
  return user ? c.json(publicUser(user)) : c.json(null);
});

// ---------- Public / participant ----------

// The rubric criteria are public; the point WEIGHTS are internal to the
// judging team, so `max` is stripped unless a judge/admin session asks.
api.get("/rubric", (c) => {
  const user = getSessionUser(c);
  const seesWeights = user !== null && (user.role === "judge" || user.role === "admin");
  return c.json(seesWeights ? RUBRIC : RUBRIC.map(({ max, ...criterion }) => criterion));
});

api.get("/schedule", (c) => {
  const events = db.select().from(schema.scheduleEvents)
    .orderBy(schema.scheduleEvents.startTime).all();
  return c.json(events);
});

api.get("/announcements", (c) => {
  const items = db.select().from(schema.announcements)
    .orderBy(sql`${schema.announcements.createdAt} desc`).all();
  return c.json(items);
});

api.get("/projects", (c) => {
  const projects = db.select().from(schema.projects).orderBy(schema.projects.title).all();
  const tables = db.select().from(schema.tableLocations).all();
  return c.json(projects.map((project) => {
    const table = tables.find((t) => t.projectId === project.id);
    return {
      ...project,
      teamMembers: JSON.parse(project.teamMembers),
      tableNumber: table?.tableNumber ?? null,
      zoneName: table?.zoneName ?? null,
    };
  }));
});

api.get("/participant/project", requireAuth(), (c) => {
  const user = c.get("user");
  if (!user.projectId) return c.json(null);
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, user.projectId)).get();
  if (!project) return c.json(null);
  const table = db.select().from(schema.tableLocations)
    .where(eq(schema.tableLocations.projectId, project.id)).get();
  return c.json({
    ...project,
    teamMembers: JSON.parse(project.teamMembers),
    tableNumber: table?.tableNumber ?? null,
    zoneName: table?.zoneName ?? null,
  });
});

api.get("/participant/feedback", requireAuth(), (c) => {
  const user = c.get("user");
  if (!user.projectId) return c.json({ published: false, reviews: [] });
  const rows = db.select().from(schema.scores)
    .where(sql`${schema.scores.projectId} = ${user.projectId} and ${schema.scores.isPublished} = 1`)
    .all();
  // Judges stay anonymous to participants — label reviews Judge A, B, C…
  const reviews = rows.map((row, index) => {
    const parsed = JSON.parse(row.scores);
    return {
      judgeLabel: `Judge ${String.fromCharCode(65 + index)}`,
      scores: parsed,
      total: totalScore(parsed),
      feedback: row.feedback,
    };
  });
  // Ship the rubric alongside published feedback so teams can read their score
  // sheets — the standalone rubric endpoint stays judges/admins-only.
  return c.json({ published: reviews.length > 0, reviews, rubric: reviews.length > 0 ? RUBRIC : [] });
});

// ---------- Check-in station (admins and volunteers) ----------

api.get("/checkin/users", requireAuth("admin", "volunteer"), (c) => {
  const participants = db.select().from(schema.users)
    .where(eq(schema.users.role, "participant")).all().map(publicUser);
  return c.json(participants);
});

api.post("/checkin", requireAuth("admin", "volunteer"), async (c) => {
  const body = z.object({
    qrToken: z.string().min(1),
    type: z.enum(["entry", "meal", "swag"]),
  }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid check-in" }, 400);

  const user = db.select().from(schema.users).where(eq(schema.users.qrToken, body.data.qrToken)).get();
  if (!user) return c.json({ error: "Unrecognized badge code" }, 404);

  const priorSameType = db.select().from(schema.eventCheckins)
    .where(sql`${schema.eventCheckins.userId} = ${user.id} and ${schema.eventCheckins.checkInType} = ${body.data.type}`)
    .all();
  // Meals repeat across the weekend; entry and swag should only happen once.
  const duplicate = body.data.type !== "meal" && priorSameType.length > 0;
  if (!duplicate) {
    db.insert(schema.eventCheckins).values({
      id: newId(),
      userId: user.id,
      checkInType: body.data.type,
      timestamp: new Date().toISOString(),
      scannedBy: c.get("user").id,
    }).run();
  }
  return c.json({ userName: user.name, role: user.role, duplicate });
});

// ---------- Judge ----------

api.get("/judge/route", requireAuth("judge", "admin"), (c) => {
  const user = c.get("user");
  const route = db.select().from(schema.judgingRoutes)
    .where(eq(schema.judgingRoutes.judgeUserId, user.id)).get();
  if (!route) return c.json(null);

  const visited = new Set(
    db.select().from(schema.routeCheckins)
      .where(eq(schema.routeCheckins.judgeUserId, user.id)).all()
      .map((checkin) => checkin.tableId),
  );
  const myScores = db.select().from(schema.scores)
    .where(eq(schema.scores.judgeUserId, user.id)).all();

  const tableIds = JSON.parse(route.assignedTables) as string[];
  const stops = tableIds.map((tableId, index) => {
    const table = db.select().from(schema.tableLocations).where(eq(schema.tableLocations.id, tableId)).get();
    if (!table) return null;
    const project = db.select().from(schema.projects).where(eq(schema.projects.id, table.projectId)).get();
    return {
      order: index + 1,
      tableId: table.id,
      tableQr: table.qrToken,
      tableNumber: table.tableNumber,
      zoneName: table.zoneName,
      projectId: project?.id ?? null,
      projectTitle: project?.title ?? "(no project)",
      track: project?.track ?? null,
      teamMembers: project ? JSON.parse(project.teamMembers) : [],
      visited: visited.has(table.id),
      scored: project ? myScores.some((score) => score.projectId === project.id) : false,
    };
  }).filter((stop) => stop !== null);

  return c.json({
    routeId: route.id,
    visited: stops.filter((s) => s.visited).length,
    total: stops.length,
    stops,
  });
});

api.post("/judge/scan", requireAuth("judge", "admin"), async (c) => {
  const user = c.get("user");
  const body = z.object({ qrToken: z.string().min(1) }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid scan payload" }, 400);

  const table = db.select().from(schema.tableLocations)
    .where(eq(schema.tableLocations.qrToken, body.data.qrToken)).get();
  if (!table) return c.json({ error: "Unrecognized table code" }, 404);

  const already = db.select().from(schema.routeCheckins)
    .where(sql`${schema.routeCheckins.judgeUserId} = ${user.id} and ${schema.routeCheckins.tableId} = ${table.id}`)
    .get();
  if (!already) {
    db.insert(schema.routeCheckins).values({
      id: newId(),
      judgeUserId: user.id,
      tableId: table.id,
      timestamp: new Date().toISOString(),
    }).run();
    const route = db.select().from(schema.judgingRoutes)
      .where(eq(schema.judgingRoutes.judgeUserId, user.id)).get();
    if (route) {
      const assigned = new Set(JSON.parse(route.assignedTables) as string[]);
      const visitedCount = db.select().from(schema.routeCheckins)
        .where(eq(schema.routeCheckins.judgeUserId, user.id)).all()
        .filter((checkin) => assigned.has(checkin.tableId)).length;
      db.update(schema.judgingRoutes).set({ routeStatus: visitedCount })
        .where(eq(schema.judgingRoutes.id, route.id)).run();
    }
  }

  const project = db.select().from(schema.projects).where(eq(schema.projects.id, table.projectId)).get();
  return c.json({
    tableNumber: table.tableNumber,
    zoneName: table.zoneName,
    projectId: project?.id ?? null,
    projectTitle: project?.title ?? "(no project)",
    duplicate: Boolean(already),
  });
});

api.post("/judge/score", requireAuth("judge", "admin"), async (c) => {
  const user = c.get("user");
  const body = z.object({
    projectId: z.string().min(1),
    scores: z.record(z.number()),
    feedback: z.string().optional(),
  }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid score payload" }, 400);

  const valid = validateScores(body.data.scores);
  if (!valid) return c.json({ error: "Scores must be within rubric ranges" }, 400);

  const existing = db.select().from(schema.scores)
    .where(sql`${schema.scores.projectId} = ${body.data.projectId} and ${schema.scores.judgeUserId} = ${user.id}`)
    .get();
  if (existing) {
    db.update(schema.scores)
      .set({ scores: JSON.stringify(valid), feedback: body.data.feedback ?? existing.feedback })
      .where(eq(schema.scores.id, existing.id)).run();
  } else {
    db.insert(schema.scores).values({
      id: newId(),
      projectId: body.data.projectId,
      judgeUserId: user.id,
      scores: JSON.stringify(valid),
      feedback: body.data.feedback ?? null,
      isPublished: 0,
    }).run();
  }
  return c.json({ total: totalScore(valid) });
});

app.route("/api", api);
app.route("/api/admin", admin);

// ---------- Static SPA (production build) ----------

const dir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(dir, "..", "..", "web", "dist");
if (fs.existsSync(distDir)) {
  const indexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
  app.get("*", (c) => {
    const requestPath = c.req.path === "/" ? "/index.html" : c.req.path;
    const filePath = path.join(distDir, path.normalize(requestPath).replace(/^([.\\/])+/, ""));
    if (filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mime: Record<string, string> = {
        ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
        ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
        ".woff2": "font/woff2", ".json": "application/json",
      };
      return c.body(fs.readFileSync(filePath), 200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
    }
    return c.html(indexHtml); // SPA fallback
  });
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`SPU Hackathon API listening on http://localhost:${port}`);
});
