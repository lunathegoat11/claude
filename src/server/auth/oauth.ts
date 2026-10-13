import "server-only";
import {
  createHash,
  createPrivateKey,
  createSign,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";

/**
 * "Continue with Google" and "Continue with Apple" (OpenID Connect, authorization code
 * flow with PKCE, state and nonce). Each is switched on only when its keys are set.
 *
 * What we receive: a stable account ID from the provider, the email address (checked by
 * the provider) and, if the person shares it, their name. Nothing else is requested.
 */
export type OAuthProvider = "google" | "apple";

export function oauthEnabled(p: OAuthProvider): boolean {
  const e = env();
  if (p === "google") return !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
  return !!(e.APPLE_CLIENT_ID && e.APPLE_TEAM_ID && e.APPLE_KEY_ID && e.APPLE_PRIVATE_KEY);
}

const b64url = (b: Buffer) => b.toString("base64url");
const redirectUri = (p: OAuthProvider) =>
  `${env().APP_URL.replace(/\/$/, "")}/api/auth/${p}/callback`;

// Apple returns with a cross-site form POST, so its cookie must be SameSite=None.
const cookieName = (p: OAuthProvider) =>
  `${process.env.NODE_ENV === "production" ? "__Host-" : ""}kosha_oauth_${p}`;

interface Pending {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
  invite: boolean;
  at: number;
}

/** Start: remember a one-time state, then send the person to Google or Apple. */
export async function startOAuth(
  p: OAuthProvider,
  opts: { next: string; inviteOk: boolean },
): Promise<string> {
  if (!oauthEnabled(p)) throw new AppError("NOT_FOUND", "This sign-in option isn't set up.");
  const pending: Pending = {
    state: b64url(randomBytes(32)),
    verifier: b64url(randomBytes(48)),
    nonce: b64url(randomBytes(24)),
    next: opts.next,
    invite: opts.inviteOk,
    at: Date.now(),
  };
  (await cookies()).set(cookieName(p), JSON.stringify(pending), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: p === "apple" ? "none" : "lax",
    path: "/",
    maxAge: 600,
  });
  const challenge = b64url(createHash("sha256").update(pending.verifier).digest());
  const e = env();
  if (p === "google") {
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.search = new URLSearchParams({
      client_id: e.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(p),
      response_type: "code",
      scope: "openid email profile",
      state: pending.state,
      nonce: pending.nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    return u.toString();
  }
  const u = new URL("https://appleid.apple.com/auth/authorize");
  u.search = new URLSearchParams({
    client_id: e.APPLE_CLIENT_ID!,
    redirect_uri: redirectUri(p),
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return u.toString();
}

/** Apple's client secret is a short-lived token signed with the Sign in with Apple key. */
function appleClientSecret() {
  const e = env();
  const header = b64url(Buffer.from(JSON.stringify({ alg: "ES256", kid: e.APPLE_KEY_ID })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        iss: e.APPLE_TEAM_ID,
        iat: now,
        exp: now + 300,
        aud: "https://appleid.apple.com",
        sub: e.APPLE_CLIENT_ID,
      }),
    ),
  );
  const key = createPrivateKey(e.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n"));
  const sig = createSign("SHA256")
    .update(`${header}.${payload}`)
    .sign({ key, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${b64url(sig)}`;
}

export interface OAuthIdentity {
  provider: OAuthProvider;
  subject: string;
  email: string;
  name: string | null;
  next: string;
  inviteOk: boolean;
}

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Finish: check the one-time state, swap the code for an ID token directly with Google or
 * Apple over HTTPS (so, as OpenID Connect allows, its signature needn't be re-checked),
 * then check who it was issued by and for, that it hasn't expired, and the nonce.
 */
export async function finishOAuth(
  p: OAuthProvider,
  params: { code?: string | null; state?: string | null; user?: string | null },
): Promise<OAuthIdentity> {
  const jar = await cookies();
  const raw = jar.get(cookieName(p))?.value;
  jar.delete(cookieName(p));
  const fail = (why: string): never => {
    logger.warn("oauth.failed", { provider: p, why });
    throw new AppError("UNAUTHENTICATED", "That sign-in didn't complete. Please try again.");
  };
  let pending: Pending | null = null;
  try {
    pending = raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    pending = null;
  }
  if (!pending || Date.now() - pending.at > 600_000) return fail("no_pending");
  if (!params.state || !same(params.state, pending.state)) return fail("state");
  if (!params.code || params.code.length > 2000) return fail("code");

  const e = env();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: redirectUri(p),
    code_verifier: pending.verifier,
    client_id: p === "google" ? e.GOOGLE_CLIENT_ID! : e.APPLE_CLIENT_ID!,
    client_secret: p === "google" ? e.GOOGLE_CLIENT_SECRET! : appleClientSecret(),
  });
  const res = await fetch(
    p === "google" ? "https://oauth2.googleapis.com/token" : "https://appleid.apple.com/auth/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    },
  ).catch(() => null);
  if (!res?.ok) return fail(`token_${res?.status ?? "network"}`);
  const json = (await res.json().catch(() => null)) as { id_token?: string } | null;
  const parts = json?.id_token?.split(".");
  if (!parts || parts.length !== 3) return fail("id_token");
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return fail("claims");
  }
  const issuers =
    p === "google"
      ? ["https://accounts.google.com", "accounts.google.com"]
      : ["https://appleid.apple.com"];
  const audience = p === "google" ? e.GOOGLE_CLIENT_ID : e.APPLE_CLIENT_ID;
  const aud = claims.aud;
  if (!issuers.includes(String(claims.iss))) return fail("iss");
  if (!(aud === audience || (Array.isArray(aud) && aud.includes(audience)))) return fail("aud");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now() - 60_000) return fail("exp");
  if (claims.nonce !== pending.nonce) return fail("nonce");
  const verified = claims.email_verified === true || claims.email_verified === "true";
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email || !verified) {
    throw new AppError(
      "VALIDATION",
      "Your account didn't share a confirmed email address, which Kosha needs. Please sign up with email instead.",
    );
  }
  if (typeof claims.sub !== "string" || !claims.sub) return fail("sub");

  // Apple sends the name only the first time, alongside the code (never in the token).
  let name: string | null = typeof claims.name === "string" ? claims.name : null;
  if (!name && params.user) {
    try {
      const u = JSON.parse(params.user) as { name?: { firstName?: string; lastName?: string } };
      name = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(" ") || null;
    } catch {
      name = null;
    }
  }
  return {
    provider: p,
    subject: claims.sub,
    email,
    name: name?.slice(0, 120) ?? null,
    next: pending.next,
    inviteOk: pending.invite,
  };
}

/**
 * The Kosha account for a Google or Apple identity. Existing links are used first; an
 * existing account with the same (provider-confirmed) email is linked; otherwise a new
 * account is made, which then asks for the age confirmation and consents before use.
 */
export async function accountForIdentity(id: OAuthIdentity) {
  const linked = await db.account.findUnique({
    where: {
      provider_providerAccountId: { provider: id.provider, providerAccountId: id.subject },
    },
    select: { user: { select: { id: true, isDemo: true } } },
  });
  if (linked) return { userId: linked.user.id, created: false, isDemo: linked.user.isDemo };

  const existing = await db.user.findUnique({
    where: { email: id.email },
    select: { id: true, isDemo: true },
  });
  if (existing) {
    if (existing.isDemo) throw new AppError("FORBIDDEN", "The demo account can't be linked.");
    await db.account.create({
      data: { userId: existing.id, provider: id.provider, providerAccountId: id.subject },
    });
    return { userId: existing.id, created: false, isDemo: false };
  }

  const e = env();
  if (!e.ALLOW_SIGNUP) throw new AppError("FORBIDDEN", "New sign-ups are currently closed.");
  if (e.SIGNUP_INVITE_CODE?.trim() && !id.inviteOk)
    throw new AppError(
      "FORBIDDEN",
      "Kosha Health is invite-only for now. Open your invite link to create an account.",
    );
  const user = await db.user.create({
    data: {
      email: id.email,
      emailVerified: new Date(), // confirmed by Google or Apple
      accounts: { create: { provider: id.provider, providerAccountId: id.subject } },
      profile: { create: { fullName: id.name || id.email.split("@")[0] } },
    },
    select: { id: true },
  });
  return { userId: user.id, created: true, isDemo: false };
}
