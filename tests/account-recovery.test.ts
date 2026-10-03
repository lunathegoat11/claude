import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { registerUser, authenticate } from "@/server/auth/service";
import { createSession, validateSessionToken } from "@/server/auth/session";
import {
  findValidToken,
  requestPasswordReset,
  resetPasswordWithToken,
  sendVerification,
  verifyEmailWithToken,
} from "@/server/auth/email-tokens";
import { hashToken } from "@/server/auth/tokens";
import { signUpSchema } from "@/lib/validation/auth";
import * as email from "@/server/email";
import { vi } from "vitest";
import { cleanup } from "./helpers/factory";

const sent: email.EmailMessage[] = [];
vi.spyOn(email, "sendEmail").mockImplementation(async (m) => {
  sent.push(m);
});
const tokenFrom = (m: email.EmailMessage) =>
  decodeURIComponent(/token=([^\s&"<]+)/.exec(m.text)![1]);

let userId: string;
const addr = `recover-${Date.now()}@test.example`;
beforeAll(async () => {
  const input = signUpSchema.parse({
    name: "R",
    email: addr,
    password: "first-pass-123",
    acceptTerms: "on",
    healthDataConsent: "on",
  });
  userId = (await registerUser(input)).id;
});
afterAll(() => cleanup(userId));

describe("consent", () => {
  it("requires both consents to sign up and records them", async () => {
    expect(
      signUpSchema.safeParse({
        name: "R",
        email: "x@test.example",
        password: "first-pass-123",
        acceptTerms: "on",
      }).success,
    ).toBe(false);
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(u.termsAcceptedAt).not.toBeNull();
    expect(u.healthDataConsentAt).not.toBeNull();
    expect(u.consentVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("email verification", () => {
  it("sends a single-use link that confirms the email", async () => {
    expect(await sendVerification(userId)).toBe(true);
    const msg = sent.at(-1)!;
    expect(msg.to).toBe(addr);
    expect(msg.text).not.toMatch(/HbA1c|glucose|diagnos/i); // emails never carry health data
    const token = tokenFrom(msg);
    expect(await db.authToken.findFirst({ where: { tokenHash: token } })).toBeNull(); // stored hashed
    expect(await verifyEmailWithToken(token)).toEqual({ userId });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: userId } })).emailVerified,
    ).not.toBeNull();
    expect(await verifyEmailWithToken(token)).toBeNull(); // single use
    expect(await sendVerification(userId)).toBe(false); // already verified
  });
});

describe("password reset", () => {
  it("does not reveal whether an email is registered", async () => {
    const before = sent.length;
    expect(await requestPasswordReset("nobody-here@test.example")).toBeUndefined();
    expect(sent.length).toBe(before);
  });

  it("resets the password once, expires old links and signs out all devices", async () => {
    const { token: session } = await createSession(userId);
    await requestPasswordReset(addr);
    const first = tokenFrom(sent.at(-1)!);
    await requestPasswordReset(addr);
    const second = tokenFrom(sent.at(-1)!);
    expect(await findValidToken(first, "PASSWORD_RESET")).toBeNull(); // only the newest link works
    expect(await findValidToken(second, "EMAIL_VERIFICATION")).toBeNull(); // wrong type

    await resetPasswordWithToken(second, "brand-new-pass-456");
    expect(await authenticate(addr, "brand-new-pass-456")).not.toBeNull();
    expect(await authenticate(addr, "first-pass-123")).toBeNull();
    expect(await validateSessionToken(session)).toBeNull();
    await expect(resetPasswordWithToken(second, "another-pass-789")).rejects.toThrow(
      /invalid or has expired/,
    );
  });

  it("rejects expired links", async () => {
    await requestPasswordReset(addr);
    const t = tokenFrom(sent.at(-1)!);
    await db.authToken.update({
      where: { tokenHash: hashToken(t) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(resetPasswordWithToken(t, "late-pass-12345")).rejects.toThrow(/expired/);
  });
});
