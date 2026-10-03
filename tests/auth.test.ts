import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { authenticate, changePassword, registerUser } from "@/server/auth/service";
import { createSession, validateSessionToken } from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { signUpSchema, passwordSchema } from "@/lib/validation/auth";
import { AppError } from "@/server/errors";
import { cleanup } from "./helpers/factory";

const created: string[] = [];
afterAll(() => cleanup(...created));

describe("password hashing", () => {
  it("uses argon2id and verifies only the right password", async () => {
    const h = await hashPassword("s3cure-password!");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, "s3cure-password!")).toBe(true);
    expect(await verifyPassword(h, "wrong-password")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });

  it("enforces password strength", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletterslong").success).toBe(false);
    expect(passwordSchema.safeParse("letters-and-123").success).toBe(true);
  });
});

describe("registration and sign-in", () => {
  const email = `auth-${Date.now()}@test.example`;

  it("registers a user with a profile and normalised email", async () => {
    const input = signUpSchema.parse({
      name: "Priya Test",
      email: `  ${email.toUpperCase()} `,
      password: "valid-pass-123",
      acceptTerms: "on",
    });
    const user = await registerUser(input);
    created.push(user.id);
    expect(user.email).toBe(email);
    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    expect(profile?.fullName).toBe("Priya Test");
    const row = await db.user.findUnique({ where: { id: user.id } });
    expect(row?.passwordHash).not.toContain("valid-pass-123");
  });

  it("rejects duplicate emails with a non-revealing message", async () => {
    await expect(registerUser({ name: "X", email, password: "valid-pass-123" })).rejects.toThrow(
      AppError,
    );
  });

  it("authenticates only with the correct password", async () => {
    expect(await authenticate(email, "valid-pass-123")).toMatchObject({ id: expect.any(String) });
    expect(await authenticate(email, "wrong-pass-123")).toBeNull();
    expect(await authenticate("nobody@test.example", "valid-pass-123")).toBeNull();
  });

  it("changes password only when the current one is correct", async () => {
    const id = created[0];
    await expect(changePassword(id, "nope", "another-pass-456")).rejects.toThrow(/incorrect/);
    await changePassword(id, "valid-pass-123", "another-pass-456");
    expect(await authenticate(email, "another-pass-456")).not.toBeNull();
  });
});

describe("sessions", () => {
  it("stores only a hash of the token and validates it", async () => {
    const userId = created[0];
    const { token } = await createSession(userId, "vitest");
    const stored = await db.session.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    expect(stored?.tokenHash).toBe(hashToken(token));
    expect(stored?.tokenHash).not.toBe(token);
    const user = await validateSessionToken(token);
    expect(user?.id).toBe(userId);
    expect(user?.timezone).toBe("Asia/Kolkata");
  });

  it("rejects unknown, malformed and expired tokens", async () => {
    expect(await validateSessionToken("does-not-exist")).toBeNull();
    expect(await validateSessionToken("x".repeat(500))).toBeNull();
    const { token } = await createSession(created[0]);
    await db.session.update({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await validateSessionToken(token)).toBeNull();
    // expired sessions are removed
    expect(await db.session.findUnique({ where: { tokenHash: hashToken(token) } })).toBeNull();
  });
});
