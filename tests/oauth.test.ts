import { generateKeyPairSync, createVerify } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A cookie jar standing in for the browser between "start" and "callback".
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k)! } : undefined),
    set: (k: string, v: string) => void jar.set(k, v),
    delete: (k: string) => void jar.delete(k),
  }),
  headers: async () => new Headers(),
}));

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

import { env, resetEnvCache } from "@/server/env";
import { accountForIdentity, finishOAuth, startOAuth } from "@/server/auth/oauth";
import { toSafeError } from "@/server/errors";
import { db } from "@/server/db";

const made: string[] = [];
beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "google-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret");
  vi.stubEnv("APPLE_CLIENT_ID", "org.kosha.signin");
  vi.stubEnv("APPLE_TEAM_ID", "TEAM123456");
  vi.stubEnv("APPLE_KEY_ID", "KEY1234567");
  vi.stubEnv("APPLE_PRIVATE_KEY", pem.replace(/\n/g, "\\n"));
  resetEnvCache();
  jar.clear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetEnvCache();
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: made } } });
});

const token = (claims: Record<string, unknown>) =>
  ["e30", Buffer.from(JSON.stringify(claims)).toString("base64url"), "sig"].join(".");

/** Start a Google sign-in and return what Google would send back. */
async function begin(provider: "google" | "apple" = "google", inviteOk = false) {
  const url = new URL(await startOAuth(provider, { next: "/labs", inviteOk }));
  return {
    url,
    state: url.searchParams.get("state")!,
    nonce: url.searchParams.get("nonce")!,
  };
}
function provider(claims: Record<string, unknown>) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: init.body as URLSearchParams });
      return new Response(JSON.stringify({ id_token: token(claims) }), { status: 200 });
    }),
  );
  return calls;
}
const base = (nonce: string) => ({
  iss: "https://accounts.google.com",
  aud: "google-client",
  exp: Math.floor(Date.now() / 1000) + 600,
  nonce,
  sub: `g-${Date.now()}-${Math.random()}`,
  email: `oauth-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
  email_verified: true,
  name: "Asha Patil",
});

describe("Continue with Google / Apple", () => {
  it("starts with a one-time state, a nonce and PKCE", async () => {
    const { url, state, nonce } = await begin();
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe(`${env().APP_URL}/api/auth/google/callback`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(state.length).toBeGreaterThan(30);
    expect(nonce.length).toBeGreaterThan(20);
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });

  it("accepts a valid answer, swapping the code with the PKCE verifier", async () => {
    const { state, nonce } = await begin();
    const claims = base(nonce);
    const calls = provider(claims);
    const id = await finishOAuth("google", { code: "abc", state });
    expect(id).toMatchObject({ email: claims.email, subject: claims.sub, next: "/labs" });
    expect(calls[0].url).toBe("https://oauth2.googleapis.com/token");
    expect(calls[0].body.get("code_verifier")?.length).toBeGreaterThan(40);
  });

  it("refuses a wrong state, a reused state, and tokens with the wrong audience, nonce or age", async () => {
    const cases: [string, (n: string) => Record<string, unknown>][] = [
      ["aud", (n) => ({ ...base(n), aud: "someone-else" })],
      ["nonce", (n) => ({ ...base(n), nonce: "replayed" })],
      ["exp", (n) => ({ ...base(n), exp: Math.floor(Date.now() / 1000) - 3600 })],
      ["iss", (n) => ({ ...base(n), iss: "https://evil.example" })],
    ];
    for (const [, make] of cases) {
      const { state, nonce } = await begin();
      provider(make(nonce));
      const e = await finishOAuth("google", { code: "abc", state }).catch(toSafeError);
      expect(e).toMatchObject({ code: "UNAUTHENTICATED" });
    }
    const { state, nonce } = await begin();
    provider(base(nonce));
    expect(
      await finishOAuth("google", { code: "abc", state: state + "x" }).catch(toSafeError),
    ).toMatchObject({
      code: "UNAUTHENTICATED",
    });
    // The state was used up by that attempt, so it can't be replayed.
    expect(await finishOAuth("google", { code: "abc", state }).catch(toSafeError)).toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("needs an email the provider has confirmed", async () => {
    const { state, nonce } = await begin();
    provider({ ...base(nonce), email_verified: false });
    expect(await finishOAuth("google", { code: "abc", state }).catch(toSafeError)).toMatchObject({
      code: "VALIDATION",
    });
  });

  it("signs Apple's client secret with the Sign in with Apple key", async () => {
    const { state, nonce } = await begin("apple");
    const calls = provider({
      ...base(nonce),
      name: undefined, // Apple never puts the name in its token
      iss: "https://appleid.apple.com",
      aud: "org.kosha.signin",
    });
    await finishOAuth("apple", {
      code: "abc",
      state,
      user: JSON.stringify({ name: { firstName: "Usha", lastName: "Kale" } }),
    }).then((id) => expect(id.name).toBe("Usha Kale"));
    const secret = calls[0].body.get("client_secret")!;
    const [h, p, s] = secret.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({
      iss: "TEAM123456",
      sub: "org.kosha.signin",
      aud: "https://appleid.apple.com",
    });
    const ok = createVerify("SHA256")
      .update(`${h}.${p}`)
      .verify({ key: privateKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
  });

  it("links an existing account by email, and keeps invite-only sign-up closed without the code", async () => {
    const email = `link-${Date.now()}@test.example`;
    const existing = await db.user.create({ data: { email }, select: { id: true } });
    made.push(existing.id);
    const linked = await accountForIdentity({
      provider: "google",
      subject: `sub-${Date.now()}`,
      email,
      name: null,
      next: "/dashboard",
      inviteOk: false,
    });
    expect(linked).toMatchObject({ userId: existing.id, created: false });

    vi.stubEnv("SIGNUP_INVITE_CODE", "friends-2026");
    resetEnvCache();
    const newcomer = {
      provider: "apple" as const,
      subject: `a-${Date.now()}`,
      email: `new-${Date.now()}@test.example`,
      name: "New Person",
      next: "/dashboard",
      inviteOk: false,
    };
    expect(await accountForIdentity(newcomer).catch(toSafeError)).toMatchObject({
      code: "FORBIDDEN",
    });
    const created = await accountForIdentity({ ...newcomer, inviteOk: true });
    made.push(created.userId);
    expect(created.created).toBe(true);
    const row = await db.user.findUnique({ where: { id: created.userId } });
    // Age and consents are asked on the next screen, not assumed.
    expect(row).toMatchObject({ ageConfirmedAt: null, consentVersion: null, passwordHash: null });
  });
});
