import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ---------- Authentication & User Management ----------

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("participant"), // participant | judge | admin
  qrToken: text("qr_token").notNull().unique(), // payload of the user's badge QR code
  projectId: text("project_id"),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
});

// ---------- Hackathon & Check-In ----------

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  devpostId: text("devpost_id"),
  title: text("title").notNull(),
  devpostUrl: text("devpost_url"),
  description: text("description"),
  track: text("track"), // Proposal | Prototype
  teamMembers: text("team_members").notNull().default("[]"), // JSON array of member names/emails
  status: text("status").notNull().default("draft"),
  lastSynced: text("last_synced"),
});

export const scheduleEvents = sqliteTable("schedule_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  location: text("location"),
});

export const eventCheckins = sqliteTable("event_checkins", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  checkInType: text("check_in_type").notNull(), // entry | meal | swag
  timestamp: text("timestamp").notNull(),
  scannedBy: text("scanned_by").notNull(),
});

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------- Judging Logistics & Scoring ----------

export const tableLocations = sqliteTable("table_locations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  tableNumber: integer("table_number").notNull(),
  zoneName: text("zone_name").notNull(),
  qrToken: text("qr_token").notNull().unique(), // payload of the table's QR code
});

export const judgingRoutes = sqliteTable("judging_routes", {
  id: text("id").primaryKey(),
  judgeUserId: text("judge_user_id").notNull().unique(),
  assignedTables: text("assigned_tables").notNull().default("[]"), // JSON array of table ids, in visit order
  routeStatus: integer("route_status").notNull().default(0), // number of tables visited
});

export const routeCheckins = sqliteTable("route_checkins", {
  id: text("id").primaryKey(),
  judgeUserId: text("judge_user_id").notNull(),
  tableId: text("table_id").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const scores = sqliteTable("scores", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  judgeUserId: text("judge_user_id").notNull(),
  scores: text("scores").notNull(), // JSON keyed by rubric criterion id
  feedback: text("feedback"),
  isPublished: integer("is_published").notNull().default(0),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
