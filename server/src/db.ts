import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH ?? path.join(dir, "..", "hackathon.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Schema bootstrap — mirrors schema.ts. Idempotent so the server can start on a fresh file.
sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant',
  qr_token TEXT NOT NULL UNIQUE,
  project_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  devpost_id TEXT,
  title TEXT NOT NULL,
  devpost_url TEXT,
  description TEXT,
  track TEXT,
  team_members TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  last_synced TEXT
);
CREATE TABLE IF NOT EXISTS schedule_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT
);
CREATE TABLE IF NOT EXISTS event_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  check_in_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  scanned_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS table_locations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  zone_name TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS judging_routes (
  id TEXT PRIMARY KEY,
  judge_user_id TEXT NOT NULL UNIQUE,
  assigned_tables TEXT NOT NULL DEFAULT '[]',
  route_status INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS route_checkins (
  id TEXT PRIMARY KEY,
  judge_user_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  judge_user_id TEXT NOT NULL,
  scores TEXT NOT NULL,
  feedback TEXT,
  is_published INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

export const db = drizzle(sqlite, { schema });
export { schema };
