import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { db, schema } from "./db.js";

const SESSION_COOKIE = "spuhack_session";
const SESSION_DAYS = 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

export type SessionUser = typeof schema.users.$inferSelect;

export function createSession(c: Context, userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  db.insert(schema.sessions).values({ token, userId, expiresAt }).run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export function destroySession(c: Context) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) db.delete(schema.sessions).where(eq(schema.sessions.token, token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export function getSessionUser(c: Context): SessionUser | null {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const session = db.select().from(schema.sessions).where(eq(schema.sessions.token, token)).get();
  if (!session) return null;
  if (session.expiresAt < new Date().toISOString()) {
    db.delete(schema.sessions).where(eq(schema.sessions.token, token)).run();
    return null;
  }
  return db.select().from(schema.users).where(eq(schema.users.id, session.userId)).get() ?? null;
}

declare module "hono" {
  interface ContextVariableMap {
    user: SessionUser;
  }
}

export function requireAuth(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = getSessionUser(c);
    if (!user) return c.json({ error: "Not signed in" }, 401);
    if (roles.length > 0 && !roles.includes(user.role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    c.set("user", user);
    await next();
  };
}

export function newId(): string {
  return randomUUID();
}

/** Public user shape — never leak the password hash. */
export function publicUser(u: SessionUser) {
  const { passwordHash, ...rest } = u;
  return rest;
}
