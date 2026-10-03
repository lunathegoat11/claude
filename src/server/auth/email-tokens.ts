import "server-only";
import type { AuthTokenType } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { passwordResetEmail, sendEmail, verificationEmail } from "@/server/email";
import { generateSessionToken, hashToken } from "./tokens";
import { hashPassword } from "./password";

const TTL: Record<AuthTokenType, number> = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
};

async function issue(userId: string, type: AuthTokenType) {
  // Only the newest link of each kind works.
  await db.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  const token = generateSessionToken();
  await db.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL[type]),
    },
  });
  return token;
}

/** Find a valid, unused token of the given type (does not consume it). */
export async function findValidToken(token: string, type: AuthTokenType) {
  if (!token || token.length > 200) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

function link(path: string, token: string) {
  return `${env().APP_URL.replace(/\/$/, "")}${path}?token=${encodeURIComponent(token)}`;
}

/**
 * Start a password reset. Always behaves the same whether or not the email is
 * registered, so it can't be used to discover who has an account.
 */
export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, isDemo: true, passwordHash: true },
  });
  if (!user || user.isDemo || !user.passwordHash) return;
  const token = await issue(user.id, "PASSWORD_RESET");
  await sendEmail(passwordResetEmail(user.email, link("/reset-password", token)));
  return { userId: user.id };
}

/** Complete a password reset: single use, signs out every device. */
export async function resetPasswordWithToken(token: string, newPassword: string) {
  const row = await findValidToken(token, "PASSWORD_RESET");
  if (!row)
    throw new AppError(
      "VALIDATION",
      "This reset link is invalid or has expired. Please request a new one.",
    );
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.user.update({
      where: { id: row.userId },
      data: { passwordHash, emailVerified: new Date() },
    }),
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  return { userId: row.userId };
}

export async function sendVerification(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true, isDemo: true },
  });
  if (!user || user.emailVerified || user.isDemo) return false;
  const token = await issue(userId, "EMAIL_VERIFICATION");
  await sendEmail(verificationEmail(user.email, link("/verify-email", token)));
  return true;
}

export async function verifyEmailWithToken(token: string) {
  const row = await findValidToken(token, "EMAIL_VERIFICATION");
  if (!row) return null;
  await db.$transaction([
    db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
  ]);
  return { userId: row.userId };
}
