import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { generateSessionToken, hashToken } from "./tokens";
import { AppError } from "@/server/errors";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-kosha_session" : "kosha_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000; // extend at most once a day

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isDemo: boolean;
  timezone: string;
  prefs: { glucoseUnit: "MG_DL" | "MMOL_L"; weightUnit: "KG" | "LB"; temperatureUnit: "C" | "F" };
}

/** Create a DB session and return the raw token (only ever stored in the cookie). */
export async function createSession(userId: string, userAgent?: string | null) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 300) ?? null,
    },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Validate a raw token. Exported separately so it can be unit-tested without cookies. */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (Date.now() - session.lastUsedAt.getTime() > REFRESH_AFTER_MS) {
    await db.session
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
      })
      .catch(() => undefined);
  }
  const p = session.user.profile;
  return {
    id: session.user.id,
    email: session.user.email,
    name: p?.fullName ?? session.user.email.split("@")[0],
    isDemo: session.user.isDemo,
    timezone: p?.timezone ?? "Asia/Kolkata",
    prefs: {
      glucoseUnit: p?.glucoseUnit ?? "MG_DL",
      weightUnit: p?.weightUnit ?? "KG",
      temperatureUnit: p?.temperatureUnit ?? "F",
    },
  };
}

/** Current user for this request (memoised per request), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/** For pages: redirect to sign-in when not authenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For server actions & route handlers: throw a safe error instead of redirecting. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user)
    throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  return user;
}

export async function invalidateCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  await clearSessionCookie();
}

export async function invalidateOtherSessions(userId: string) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({
    where: { userId, NOT: token ? { tokenHash: hashToken(token) } : undefined },
  });
}

export async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return { ip, userAgent: h.get("user-agent") };
}
