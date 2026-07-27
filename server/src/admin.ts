import { Hono } from "hono";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "./db.js";
import { newId, requireAuth, publicUser } from "./auth.js";
import { syncDevpost } from "./devpost.js";
import { validateScores } from "./rubric.js";

export const admin = new Hono();

admin.use("*", requireAuth("admin"));

// ---------- Command center metrics ----------

admin.get("/metrics", (c) => {
  const usersByRole = db.select({ role: schema.users.role, count: sql<number>`count(*)` })
    .from(schema.users).groupBy(schema.users.role).all();
  const checkinsByType = db.select({ type: schema.eventCheckins.checkInType, count: sql<number>`count(distinct ${schema.eventCheckins.userId})` })
    .from(schema.eventCheckins).groupBy(schema.eventCheckins.checkInType).all();
  const projectCount = db.select({ count: sql<number>`count(*)` }).from(schema.projects).get()?.count ?? 0;
  const tableCount = db.select({ count: sql<number>`count(*)` }).from(schema.tableLocations).get()?.count ?? 0;
  const scoreCount = db.select({ count: sql<number>`count(*)` }).from(schema.scores).get()?.count ?? 0;

  const routes = db.select().from(schema.judgingRoutes).all().map((route) => {
    const judge = db.select().from(schema.users).where(eq(schema.users.id, route.judgeUserId)).get();
    const assigned = JSON.parse(route.assignedTables) as string[];
    return {
      judgeName: judge?.name ?? "Unknown judge",
      visited: route.routeStatus,
      total: assigned.length,
    };
  });

  const published = db.select().from(schema.settings).where(eq(schema.settings.key, "scoresPublished")).get();
  const recentCheckins = db.select().from(schema.eventCheckins)
    .orderBy(sql`${schema.eventCheckins.timestamp} desc`).limit(10).all()
    .map((checkin) => {
      const user = db.select().from(schema.users).where(eq(schema.users.id, checkin.userId)).get();
      return { ...checkin, userName: user?.name ?? "Unknown" };
    });

  return c.json({
    usersByRole, checkinsByType, projectCount, tableCount, scoreCount,
    routes, scoresPublished: published?.value === "true", recentCheckins,
  });
});

// ---------- Schedule CRUD ----------

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().optional(),
  location: z.string().optional(),
});

admin.post("/schedule", async (c) => {
  const body = eventSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid event" }, 400);
  const id = newId();
  db.insert(schema.scheduleEvents).values({ id, ...body.data }).run();
  return c.json({ id });
});

admin.put("/schedule/:id", async (c) => {
  const body = eventSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid event" }, 400);
  db.update(schema.scheduleEvents).set(body.data).where(eq(schema.scheduleEvents.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

admin.delete("/schedule/:id", (c) => {
  db.delete(schema.scheduleEvents).where(eq(schema.scheduleEvents.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

// ---------- Announcements ----------

admin.post("/announcements", async (c) => {
  const body = z.object({ title: z.string().min(1), body: z.string().min(1) }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid announcement" }, 400);
  const id = newId();
  db.insert(schema.announcements).values({ id, ...body.data, createdAt: new Date().toISOString() }).run();
  return c.json({ id });
});

admin.delete("/announcements/:id", (c) => {
  db.delete(schema.announcements).where(eq(schema.announcements.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

// ---------- DevPost sync ----------

admin.post("/sync-devpost", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const url = typeof body?.url === "string" && body.url.trim() ? body.url.trim() : undefined;
  const result = await syncDevpost(url);
  return c.json(result);
});

// ---------- Users & roles ----------

admin.get("/users", (c) => {
  const users = db.select().from(schema.users).all().map(publicUser);
  return c.json(users);
});

admin.post("/users/:id/role", async (c) => {
  const body = z.object({ role: z.enum(["participant", "judge", "admin"]) }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid role" }, 400);
  db.update(schema.users).set({ role: body.data.role }).where(eq(schema.users.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

// ---------- Universal event check-in (badge QR scan) ----------

admin.post("/checkin", async (c) => {
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

// ---------- Tables ----------

admin.get("/tables", (c) => {
  const tables = db.select().from(schema.tableLocations).all().map((table) => {
    const project = db.select().from(schema.projects).where(eq(schema.projects.id, table.projectId)).get();
    return { ...table, projectTitle: project?.title ?? "(unassigned)" };
  });
  return c.json(tables);
});

admin.post("/tables", async (c) => {
  const body = z.object({
    projectId: z.string().min(1),
    tableNumber: z.number().int().positive(),
    zoneName: z.string().min(1),
  }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid table assignment" }, 400);
  const existing = db.select().from(schema.tableLocations)
    .where(eq(schema.tableLocations.projectId, body.data.projectId)).get();
  if (existing) {
    db.update(schema.tableLocations)
      .set({ tableNumber: body.data.tableNumber, zoneName: body.data.zoneName })
      .where(eq(schema.tableLocations.id, existing.id)).run();
    return c.json({ id: existing.id, updated: true });
  }
  const id = newId();
  db.insert(schema.tableLocations).values({ id, ...body.data, qrToken: newId() }).run();
  return c.json({ id });
});

admin.delete("/tables/:id", (c) => {
  db.delete(schema.tableLocations).where(eq(schema.tableLocations.id, c.req.param("id"))).run();
  return c.json({ ok: true });
});

// ---------- Judge route generation ----------

// Every judge visits every table (spec's fairness ideal), with staggered start
// offsets so judges spread across the floor instead of clustering.
admin.post("/routes/generate", (c) => {
  const judges = db.select().from(schema.users).where(eq(schema.users.role, "judge")).all();
  const tables = db.select().from(schema.tableLocations)
    .orderBy(schema.tableLocations.zoneName, schema.tableLocations.tableNumber).all();
  if (judges.length === 0 || tables.length === 0) {
    return c.json({ error: "Need at least one judge and one table" }, 400);
  }
  db.delete(schema.judgingRoutes).run();
  db.delete(schema.routeCheckins).run();
  judges.forEach((judge, index) => {
    const offset = Math.floor((index * tables.length) / judges.length);
    const rotated = [...tables.slice(offset), ...tables.slice(0, offset)].map((t) => t.id);
    db.insert(schema.judgingRoutes).values({
      id: newId(),
      judgeUserId: judge.id,
      assignedTables: JSON.stringify(rotated),
      routeStatus: 0,
    }).run();
  });
  return c.json({ judges: judges.length, tablesPerRoute: tables.length });
});

// ---------- Bulk score entry & publishing ----------

admin.post("/scores", async (c) => {
  const body = z.object({
    rows: z.array(z.object({
      projectId: z.string().min(1),
      judgeUserId: z.string().min(1),
      scores: z.record(z.number()),
      feedback: z.string().optional(),
    })).min(1),
  }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid score rows" }, 400);

  let saved = 0;
  for (const row of body.data.rows) {
    const valid = validateScores(row.scores);
    if (!valid) return c.json({ error: `Score out of rubric range for project ${row.projectId}` }, 400);
    const existing = db.select().from(schema.scores)
      .where(sql`${schema.scores.projectId} = ${row.projectId} and ${schema.scores.judgeUserId} = ${row.judgeUserId}`)
      .get();
    if (existing) {
      db.update(schema.scores)
        .set({ scores: JSON.stringify(valid), feedback: row.feedback ?? existing.feedback })
        .where(eq(schema.scores.id, existing.id)).run();
    } else {
      db.insert(schema.scores).values({
        id: newId(),
        projectId: row.projectId,
        judgeUserId: row.judgeUserId,
        scores: JSON.stringify(valid),
        feedback: row.feedback ?? null,
        isPublished: 0,
      }).run();
    }
    saved++;
  }
  return c.json({ saved });
});

admin.get("/scores", (c) => {
  const rows = db.select().from(schema.scores).all().map((score) => {
    const project = db.select().from(schema.projects).where(eq(schema.projects.id, score.projectId)).get();
    const judge = db.select().from(schema.users).where(eq(schema.users.id, score.judgeUserId)).get();
    return {
      ...score,
      scores: JSON.parse(score.scores),
      projectTitle: project?.title ?? "?",
      judgeName: judge?.name ?? "?",
    };
  });
  return c.json(rows);
});

admin.post("/publish-scores", async (c) => {
  const body = z.object({ published: z.boolean() }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid payload" }, 400);
  const flag = body.data.published ? 1 : 0;
  db.update(schema.scores).set({ isPublished: flag }).run();
  db.insert(schema.settings)
    .values({ key: "scoresPublished", value: String(body.data.published) })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: String(body.data.published) } })
    .run();
  return c.json({ published: body.data.published });
});
