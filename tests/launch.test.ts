import { afterEach, describe, expect, it, vi } from "vitest";
import { env, resetEnvCache } from "@/server/env";
import { registerUser } from "@/server/auth/service";
import { storageProblem } from "@/server/storage";
import { toSafeError } from "@/server/errors";
import { db } from "@/server/db";

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("getting ready to go live", () => {
  it("never allows the shared demo account on a live server", () => {
    vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    resetEnvCache();
    expect(env().DEMO_LOGIN_ENABLED).toBe(false);
  });

  it("can make sign-up invite-only for a soft launch", async () => {
    vi.stubEnv("SIGNUP_INVITE_CODE", "friends-2026");
    resetEnvCache();
    const base = { name: "Invited", password: "a-long-password-123" };
    const wrong = await registerUser({
      ...base,
      email: `inv-wrong-${Date.now()}@test.example`,
      inviteCode: "guess",
    }).catch((e) => toSafeError(e));
    expect(wrong).toMatchObject({ code: "VALIDATION" });
    const email = `inv-ok-${Date.now()}@test.example`;
    const user = await registerUser({ ...base, email, inviteCode: " friends-2026 " });
    expect(user.email).toBe(email);
    await db.user.delete({ where: { id: user.id } });
  });

  it("switches uploads off on Railway when files would be lost on restart", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "production");
    vi.stubEnv("STORAGE_DRIVER", "local");
    vi.stubEnv("STORAGE_LOCAL_DIR", "/app/storage");
    resetEnvCache();
    expect(storageProblem()).toMatch(/Volume/);
    vi.stubEnv("RAILWAY_VOLUME_MOUNT_PATH", "/app/storage");
    expect(storageProblem()).toBeNull();
  });
});
