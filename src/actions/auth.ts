"use server";
import { redirect } from "next/navigation";
import { runAction, formToObject, type ActionState } from "@/server/action-utils";
import {
  signInSchema,
  signUpSchema,
  renewConsentSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import {
  requestPasswordReset,
  resetPasswordWithToken,
  sendVerification,
  verifyEmailWithToken,
} from "@/server/auth/email-tokens";
import { logger } from "@/server/logger";
import { CONSENT_VERSION } from "@/lib/legal";
import { authenticate, changePassword, registerUser } from "@/server/auth/service";
import {
  createSession,
  invalidateCurrentSession,
  invalidateOtherSessions,
  requestMeta,
  requireUserOrThrow,
  setSessionCookie,
} from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { env } from "@/server/env";
import { db } from "@/server/db";
import { safeNext } from "@/lib/safe-next";

export async function signInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let destination = "/dashboard";
  const result = await runAction("signIn", async () => {
    const meta = await requestMeta();
    const input = signInSchema.parse(formToObject(fd));
    await rateLimit("signIn", `ip:${meta.ip}`);
    await rateLimit("signIn", `email:${input.email}`);
    const user = await authenticate(input.email, input.password);
    if (!user) {
      await audit(null, "auth.sign_in_failed", undefined, meta);
      throw new AppError("UNAUTHENTICATED", "That email and password combination didn't work.");
    }
    if (user.isDemo && !env().DEMO_LOGIN_ENABLED)
      throw new AppError("UNAUTHENTICATED", "That email and password combination didn't work.");
    // Keep the first age confirmation as the record; later ones only refresh lastAgeConfirmedAt.
    await db.user.update({
      where: { id: user.id },
      data: {
        lastAgeConfirmedAt: new Date(),
        ...(user.ageConfirmedAt ? {} : { ageConfirmedAt: new Date() }),
      },
    });
    // Never reuse a session that existed before signing in.
    await invalidateCurrentSession();
    const { token, expiresAt } = await createSession(user.id, meta.userAgent);
    await setSessionCookie(token, expiresAt);
    await audit(user.id, "auth.sign_in", undefined, meta);
    destination = safeNext(fd.get("next"));
    return { ok: true };
  });
  if (result.ok) redirect(destination);
  return result;
}

export async function signUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction("signUp", async () => {
    const meta = await requestMeta();
    await rateLimit("signUp", `ip:${meta.ip}`);
    await rateLimit("signUpGlobal", "all");
    const input = signUpSchema.parse(formToObject(fd));
    const user = await registerUser(input);
    const { token, expiresAt } = await createSession(user.id, meta.userAgent);
    await setSessionCookie(token, expiresAt);
    await audit(user.id, "auth.sign_up", undefined, meta);
    await audit(user.id, "consent.given", { type: "User", id: user.id }, meta, {
      version: CONSENT_VERSION,
      terms: true,
      healthData: true,
      improveReading: input.improveReading === "on",
    });
    // A failed email must not block sign-up; the user can resend from the app.
    await sendVerification(user.id).catch((err) =>
      logger.error("email.verification_failed", { err }),
    );
    return { ok: true };
  });
  if (result.ok) redirect("/dashboard?welcome=1");
  return result;
}

export async function demoSignInAction(confirmedAge: boolean): Promise<ActionState> {
  const result = await runAction("demoSignIn", async () => {
    if (!env().DEMO_LOGIN_ENABLED)
      throw new AppError("FORBIDDEN", "The demo account is not available.");
    if (confirmedAge !== true)
      throw new AppError("VALIDATION", "Kosha is only for people aged 18 or older", {
        ageConfirmed: ["Kosha is only for people aged 18 or older"],
      });
    const meta = await requestMeta();
    await rateLimit("signIn", `ip:${meta.ip}`);
    const user = await db.user.findFirst({ where: { isDemo: true }, select: { id: true } });
    if (!user)
      throw new AppError(
        "NOT_FOUND",
        "The demo account hasn't been created yet. Run `npm run db:seed`.",
      );
    const { token, expiresAt } = await createSession(user.id, meta.userAgent);
    await setSessionCookie(token, expiresAt);
    await audit(user.id, "auth.sign_in", undefined, meta, { demo: true });
    return { ok: true };
  });
  if (result.ok) redirect("/dashboard");
  return result;
}

export async function signOutAction() {
  const user = await requireUserOrThrow().catch(() => null);
  await invalidateCurrentSession();
  if (user) await audit(user.id, "auth.sign_out", undefined, await requestMeta());
  redirect("/sign-in");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("changePassword", async () => {
    const user = await requireUserOrThrow();
    if (user.isDemo)
      throw new AppError("FORBIDDEN", "The demo account's password can't be changed.");
    const input = changePasswordSchema.parse(formToObject(fd));
    await rateLimit("signIn", `user:${user.id}`);
    await changePassword(user.id, input.currentPassword, input.newPassword);
    await invalidateOtherSessions(user.id);
    await audit(user.id, "auth.password_changed", undefined, await requestMeta());
    return { ok: true, message: "Password updated. Other devices have been signed out." };
  });
}

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  return runAction("revokeSessions", async () => {
    const user = await requireUserOrThrow();
    await invalidateOtherSessions(user.id);
    await audit(user.id, "auth.sessions_revoked", undefined, await requestMeta());
    return { ok: true, message: "Signed out of all other devices." };
  });
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("forgotPassword", async () => {
    const meta = await requestMeta();
    const { email } = forgotPasswordSchema.parse(formToObject(fd));
    await rateLimit("passwordReset", `ip:${meta.ip}`);
    await rateLimit("passwordReset", `email:${email}`);
    const res = await requestPasswordReset(email);
    if (res) await audit(res.userId, "auth.password_reset_requested", undefined, meta);
    // Same answer whether or not the account exists.
    return {
      ok: true,
      message: "If an account exists for that email, we've sent a link to reset your password.",
    };
  });
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction("resetPassword", async () => {
    const meta = await requestMeta();
    await rateLimit("passwordReset", `ip:${meta.ip}`);
    const input = resetPasswordSchema.parse(formToObject(fd));
    const { userId } = await resetPasswordWithToken(input.token, input.password);
    await audit(userId, "auth.password_reset", undefined, meta);
    return { ok: true };
  });
  if (res.ok) redirect("/sign-in?reset=1");
  return res;
}

export async function resendVerificationAction(): Promise<ActionState> {
  return runAction("resendVerification", async () => {
    const user = await requireUserOrThrow();
    await rateLimit("passwordReset", `verify:${user.id}`);
    const sent = await sendVerification(user.id);
    return {
      ok: true,
      message: sent
        ? `We've sent a confirmation link to ${user.email}.`
        : "Your email is already confirmed.",
    };
  });
}

/** Accept an updated version of the Terms and Privacy Policy. */
export async function renewConsentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction("renewConsent", async () => {
    const user = await requireUserOrThrow();
    const input = renewConsentSchema.parse(formToObject(fd));
    const now = new Date();
    await db.user.update({
      where: { id: user.id },
      data: {
        termsAcceptedAt: now,
        healthDataConsentAt: now,
        consentVersion: CONSENT_VERSION,
        // Ticking the optional box turns learning on; leaving it unticked changes nothing.
        ...(input.improveReading === "on" ? { improveReadingAt: now } : {}),
      },
    });
    await audit(user.id, "consent.renewed", { type: "User", id: user.id }, await requestMeta(), {
      version: CONSENT_VERSION,
    });
    return { ok: true };
  });
  if (result.ok) redirect("/dashboard");
  return result;
}

/**
 * Confirm an email address. Done with a button press rather than on opening the link,
 * because email scanners open links automatically and would use them up.
 */
export async function verifyEmailAction(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const result = await verifyEmailWithToken(token).catch(() => null);
  if (result) await audit(result.userId, "auth.email_verified");
  redirect(result ? "/verify-email?done=1" : "/verify-email?failed=1");
}
