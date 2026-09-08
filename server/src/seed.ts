import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import { db, schema, DB_PATH } from "./db.js";
import { hashPassword, newId } from "./auth.js";
import { SAMPLE_SUBMISSIONS, syncDevpost } from "./devpost.js";
import { RUBRIC } from "./rubric.js";

export async function runSeed() {
  console.log(`Seeding ${DB_PATH} ...`);

  // Wipe everything for a repeatable demo state.
  for (const table of [
    schema.sessions, schema.scores, schema.routeCheckins, schema.judgingRoutes,
    schema.tableLocations, schema.eventCheckins, schema.announcements,
    schema.scheduleEvents, schema.projects, schema.users, schema.settings,
  ]) {
    db.delete(table).run();
  }

  const now = new Date().toISOString();

  function addUser(email: string, name: string, role: string, password: string): string {
    const id = newId();
    db.insert(schema.users).values({
      id, email, name, role,
      passwordHash: hashPassword(password),
      qrToken: newId(),
      createdAt: now,
    }).run();
    return id;
  }

  // ---------- Accounts ----------
  addUser("admin@spu.edu", "Alex Rivera", "admin", "admin123");
  const judgeIds = [
    addUser("judge1@spu.edu", "Prof. Dana Whitfield", "judge", "judge123"),
    addUser("judge2@spu.edu", "Marcus Boone (Sponsor)", "judge", "judge123"),
    addUser("judge3@spu.edu", "Sarah Ellison '24", "judge", "judge123"),
  ];
  addUser("volunteer@spu.edu", "Riley Nakamura", "volunteer", "helper123");
  // One account per fixture team member so DevPost sync can correlate them.
  for (const submission of SAMPLE_SUBMISSIONS) {
    for (const member of submission.teamMembers) {
      addUser(member.email, member.name, "participant", "demo1234");
    }
  }

  // ---------- Schedule (from the event proposal; Oct 15 2026 is a Thursday) ----------
  const events: [string, string, string | null, string, string | null][] = [
    ["Kickoff Get-Together & Team Roundup", "Meet other hackers, pitch your skills, and form interdisciplinary teams.", "OMH Lobby", "2026-10-15T16:30", "2026-10-15T18:00"],
    ["Event Kickoff & Prompt Announcement", "The three community prompts are revealed. The 64-hour clock starts.", "OMH 109", "2026-10-15T18:00", "2026-10-15T19:00"],
    ["Late-Night Fuel: Pizza", "Sponsored by our friends in the Seattle tech community.", "OMH Lobby", "2026-10-15T21:00", "2026-10-15T22:00"],
    ["Open Work Day", "Heads-down building. Mentors roam the floor all day.", "Otto Miller Hall", "2026-10-16T09:00", "2026-10-16T21:00"],
    ["Sponsor Workshop: Shipping Fast Without Breaking Things", "A practical session on scoping an MVP in a weekend.", "OMH 245", "2026-10-16T14:00", "2026-10-16T15:00"],
    ["Open Work Day", "Final full build day. Practice your pitch with a mentor.", "Otto Miller Hall", "2026-10-17T09:00", "2026-10-17T21:00"],
    ["Sponsor Workshop: Pitching to Non-Engineers", "How to tell the story of your project in 7 minutes.", "OMH 245", "2026-10-17T13:00", "2026-10-17T14:00"],
    ["Submission Deadline", "All DevPost submissions must be finalized. No exceptions!", "DevPost", "2026-10-18T10:00", null],
    ["Presentations & Judging", "Open-floor presentations. Judges rotate through table routes.", "OMH Lobby & 2nd Floor", "2026-10-18T12:00", "2026-10-18T16:30"],
    ["Awards Ceremony", "Winners of the Proposal and Prototype tracks are crowned.", "OMH 109", "2026-10-18T17:30", "2026-10-18T18:30"],
  ];
  for (const [title, description, location, startTime, endTime] of events) {
    db.insert(schema.scheduleEvents).values({ id: newId(), title, description, location, startTime, endTime }).run();
  }

  // ---------- Announcements ----------
  const announcementRows: [string, string, string][] = [
    ["Welcome to SPU Hackathon 2026!", "Check-in opens at 4:00 PM in the OMH Lobby. Have your badge QR code ready (it's on your dashboard).", "2026-10-15T15:30:00.000Z"],
    ["Wi-Fi Details", "Join network SPU-Guest. Power strips are available at every table — please don't unplug the ones in the hallways.", "2026-10-15T18:20:00.000Z"],
    ["Submission reminder", "DevPost submissions lock at 10:00 AM sharp on Sunday. Submit early, update often — only the final version counts.", "2026-10-17T20:00:00.000Z"],
  ];
  for (const [title, body, createdAt] of announcementRows) {
    db.insert(schema.announcements).values({ id: newId(), title, body, createdAt }).run();
  }

  // ---------- Projects via the DevPost sync fixture ----------
  await syncDevpost();
  const projects = db.select().from(schema.projects).all();

  // ---------- Table assignments (Otto Miller Hall zones) ----------
  const zones = ["OMH Lobby", "OMH 109", "OMH Second Floor"];
  const tableIdByProject = new Map<string, string>();
  projects.forEach((project, index) => {
    const id = newId();
    db.insert(schema.tableLocations).values({
      id,
      projectId: project.id,
      tableNumber: index + 1,
      zoneName: zones[Math.floor(index / 4) % zones.length],
      qrToken: newId(),
    }).run();
    tableIdByProject.set(project.id, id);
  });

  // ---------- Judge routes (staggered full coverage) ----------
  const tables = db.select().from(schema.tableLocations)
    .orderBy(schema.tableLocations.zoneName, schema.tableLocations.tableNumber).all();
  judgeIds.forEach((judgeId, index) => {
    const offset = Math.floor((index * tables.length) / judgeIds.length);
    const rotated = [...tables.slice(offset), ...tables.slice(0, offset)].map((t) => t.id);
    db.insert(schema.judgingRoutes).values({
      id: newId(),
      judgeUserId: judgeId,
      assignedTables: JSON.stringify(rotated),
      routeStatus: 0,
    }).run();
  });

  // ---------- Simulated event-day activity ----------
  // Entry check-ins for most participants, a few meals/swag.
  const participants = db.select().from(schema.users).where(eq(schema.users.role, "participant")).all();
  const adminUser = db.select().from(schema.users).where(eq(schema.users.email, "admin@spu.edu")).get()!;
  participants.forEach((participant, index) => {
    if (index % 5 === 4) return; // a few no-shows
    db.insert(schema.eventCheckins).values({
      id: newId(), userId: participant.id, checkInType: "entry",
      timestamp: `2026-10-15T16:${String(10 + (index % 45)).padStart(2, "0")}:00.000Z`,
      scannedBy: adminUser.id,
    }).run();
    if (index % 2 === 0) {
      db.insert(schema.eventCheckins).values({
        id: newId(), userId: participant.id, checkInType: "meal",
        timestamp: `2026-10-15T21:${String(5 + (index % 50)).padStart(2, "0")}:00.000Z`,
        scannedBy: adminUser.id,
      }).run();
    }
    if (index % 3 === 0) {
      db.insert(schema.eventCheckins).values({
        id: newId(), userId: participant.id, checkInType: "swag",
        timestamp: `2026-10-15T17:${String(index % 55).padStart(2, "0")}:00.000Z`,
        scannedBy: adminUser.id,
      }).run();
    }
  });

  // Judge 1 has visited & scored several tables; judge 2 is partway through.
  function visit(judgeId: string, tableId: string, minute: number) {
    db.insert(schema.routeCheckins).values({
      id: newId(), judgeUserId: judgeId, tableId,
      timestamp: `2026-10-18T12:${String(minute).padStart(2, "0")}:00.000Z`,
    }).run();
  }
  function score(judgeId: string, projectId: string, values: number[], feedback: string) {
    const scoreMap: Record<string, number> = {};
    RUBRIC.forEach((criterion, index) => { scoreMap[criterion.id] = values[index]; });
    db.insert(schema.scores).values({
      id: newId(), projectId, judgeUserId: judgeId,
      scores: JSON.stringify(scoreMap), feedback, isPublished: 1,
    }).run();
  }

  const feedbackSamples = [
    "Clear problem framing and a working demo. Push harder on the maintenance story.",
    "Strong community alignment. The Q&A revealed some gaps in the rollout plan.",
    "Impressive scope for 64 hours. Consider narrowing the MVP for a sharper pitch.",
    "Well-rehearsed presentation. The risk analysis felt like an afterthought.",
    "Creative approach! Feasibility numbers need a second pass, but great potential.",
  ];
  const scoreBank: number[][] = [
    [9, 7, 8, 9, 4, 5],
    [8, 8, 7, 8, 5, 4],
    [7, 6, 9, 8, 4, 4],
    [9, 8, 8, 10, 5, 5],
    [6, 7, 7, 8, 3, 4],
    [8, 5, 6, 9, 4, 3],
  ];

  projects.slice(0, 6).forEach((project, index) => {
    const tableId = tableIdByProject.get(project.id)!;
    visit(judgeIds[0], tableId, 5 + index * 12);
    score(judgeIds[0], project.id, scoreBank[index], feedbackSamples[index % feedbackSamples.length]);
  });
  projects.slice(0, 3).forEach((project, index) => {
    const tableId = tableIdByProject.get(project.id)!;
    visit(judgeIds[1], tableId, 9 + index * 15);
    score(judgeIds[1], project.id, scoreBank[(index + 2) % scoreBank.length], feedbackSamples[(index + 2) % feedbackSamples.length]);
  });

  // Recompute route progress counters from the check-ins above.
  for (const route of db.select().from(schema.judgingRoutes).all()) {
    const assigned = new Set(JSON.parse(route.assignedTables) as string[]);
    const visitedCount = db.select().from(schema.routeCheckins)
      .where(eq(schema.routeCheckins.judgeUserId, route.judgeUserId)).all()
      .filter((checkin) => assigned.has(checkin.tableId)).length;
    db.update(schema.judgingRoutes).set({ routeStatus: visitedCount })
      .where(eq(schema.judgingRoutes.id, route.id)).run();
  }

  db.insert(schema.settings).values({ key: "scoresPublished", value: "true" }).run();

  console.log("Seed complete.");
  console.log("  Admin:       admin@spu.edu / admin123");
  console.log("  Judges:      judge1@spu.edu, judge2@spu.edu, judge3@spu.edu / judge123");
  console.log("  Volunteer:   volunteer@spu.edu / helper123");
  console.log("  Participant: participant@spu.edu / demo1234 (team TransitPulse)");
}

// Run directly via `npm run seed`; imported by the server for boot-time auto-seed.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runSeed();
}
