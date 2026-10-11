import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { env } from "@/server/env";
import { CONSENT_VERSION } from "@/lib/legal";

/**
 * Pure account logic (no cookies) so it can be tested directly.
 */
/** Compare two strings in constant time, so the invite code can't be guessed by timing. */
function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  improveReading?: string;
  inviteCode?: string;
}) {
  if (!env().ALLOW_SIGNUP) throw new AppError("FORBIDDEN", "New sign-ups are currently closed.");
  const invite = env().SIGNUP_INVITE_CODE?.trim();
  if (invite && !sameText((input.inviteCode ?? "").trim(), invite))
    throw new AppError("VALIDATION", "That invite code isn't right.", {
      inviteCode: ["Check the invite code you were given"],
    });
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    // Generic message: do not reveal more than necessary about which emails are registered.
    throw new AppError(
      "CONFLICT",
      "An account with this email may already exist. Try signing in instead.",
    );
  }
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  return db.user.create({
    data: {
      email: input.email,
      passwordHash,
      termsAcceptedAt: now,
      ageConfirmedAt: now,
      healthDataConsentAt: now,
      consentVersion: CONSENT_VERSION,
      improveReadingAt: input.improveReading === "on" ? now : null,
      profile: { create: { fullName: input.name } },
    },
    select: { id: true, email: true },
  });
}

export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, isDemo: true, ageConfirmedAt: true },
  });
  if (!user || !user.passwordHash) {
    await burnPasswordCheck(password);
    return null;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return null;
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, isDemo: user.isDemo, ageConfirmedAt: user.ageConfirmedAt };
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, current))) {
    throw new AppError("VALIDATION", "Your current password is incorrect.", {
      currentPassword: ["Incorrect password"],
    });
  }
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
}
