import { randomBytes } from "node:crypto";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { db, schema } from "./db.js";
import { createSession, newId } from "./auth.js";

/**
 * Microsoft Entra ID (Azure AD) sign-in via the OIDC authorization-code flow.
 *
 * Enabled only when MS_CLIENT_ID and MS_CLIENT_SECRET are set (Cloudflare-style
 * secrets on Heroku: `heroku config:set MS_CLIENT_ID=... MS_CLIENT_SECRET=...`).
 * See README "Microsoft Entra sign-in" for the Azure app registration steps.
 */
const config = {
  clientId: process.env.MS_CLIENT_ID ?? "",
  clientSecret: process.env.MS_CLIENT_SECRET ?? "",
  // SPU's tenant id (or domain, e.g. "spu.edu") locks sign-in to SPU accounts at
  // the Microsoft level; "organizations" accepts any work/school account and we
  // then enforce the email domain ourselves.
  tenant: process.env.MS_TENANT_ID ?? "organizations",
  // Accounts must end in this domain (set empty to allow any email).
  allowedDomain: process.env.MS_ALLOWED_DOMAIN ?? "spu.edu",
  redirectUri: process.env.MS_REDIRECT_URI ?? "",
  appUrl: process.env.APP_URL ?? "",
};

export const microsoftEnabled = Boolean(config.clientId && config.clientSecret);

const STATE_COOKIE = "spuhack_oauth_state";

function authority(): string {
  return `https://login.microsoftonline.com/${config.tenant}`;
}

function redirectUri(c: Context): string {
  if (config.redirectUri) return config.redirectUri;
  const url = new URL(c.req.url);
  // Heroku terminates TLS at the router; trust its forwarded proto.
  const proto = c.req.header("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${url.host}/api/auth/microsoft/callback`;
}

function appUrl(c: Context): string {
  if (config.appUrl) return config.appUrl;
  const url = new URL(c.req.url);
  // In dev the SPA runs on the Vite server; in production we serve it ourselves.
  return url.hostname === "localhost" && url.port === "8787"
    ? "http://localhost:5173"
    : "";
}

export function startMicrosoftLogin(c: Context): Response {
  const state = randomBytes(24).toString("hex");
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: redirectUri(c),
    response_mode: "query",
    scope: "openid profile email",
    state,
    // Nudge Microsoft toward SPU accounts on shared machines.
    domain_hint: config.allowedDomain || "",
  });
  return c.redirect(`${authority()}/oauth2/v2.0/authorize?${params}`);
}

export async function handleMicrosoftCallback(c: Context): Promise<Response> {
  const fail = (reason: string) =>
    c.redirect(`${appUrl(c)}/login?error=${encodeURIComponent(reason)}`);

  const expectedState = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: "/" });
  const state = c.req.query("state");
  const code = c.req.query("code");
  if (c.req.query("error")) {
    return fail(c.req.query("error_description") ?? c.req.query("error")!);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("Sign-in session expired — please try again");
  }

  // Exchange the code server-side (client secret never reaches the browser).
  const tokenRes = await fetch(`${authority()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(c),
    }),
  });
  if (!tokenRes.ok) {
    console.error("Entra token exchange failed:", await tokenRes.text());
    return fail("Microsoft sign-in failed — please try again");
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return fail("Microsoft sign-in failed — please try again");

  // Fetch identity claims over TLS directly from Microsoft; no JWT parsing needed.
  const userinfoRes = await fetch("https://graph.microsoft.com/oidc/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userinfoRes.ok) return fail("Could not read your Microsoft profile");
  const profile = (await userinfoRes.json()) as { email?: string; name?: string; sub: string };

  const email = profile.email?.toLowerCase();
  if (!email) return fail("Your Microsoft account did not share an email address");
  if (config.allowedDomain && !email.endsWith(`@${config.allowedDomain}`)) {
    return fail(`Please sign in with your @${config.allowedDomain} account`);
  }

  // Link by email; first sign-in creates a participant account.
  let user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user) {
    const id = newId();
    db.insert(schema.users).values({
      id,
      email,
      name: profile.name ?? email.split("@")[0],
      passwordHash: "!sso", // never matches scrypt output — password login stays off
      role: "participant",
      qrToken: newId(),
      createdAt: new Date().toISOString(),
    }).run();
    user = db.select().from(schema.users).where(eq(schema.users.id, id)).get()!;
  }
  createSession(c, user.id);
  return c.redirect(`${appUrl(c)}/app`);
}
