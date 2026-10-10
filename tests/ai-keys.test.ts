import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { openSecret, sealSecret } from "@/server/crypto";
import {
  aiForUser,
  getAiSettings,
  removeAiKey,
  saveAiKey,
  setDocumentReading,
} from "@/server/services/ai-settings";
import { AnthropicProvider } from "@/server/ai/providers/anthropic";
import { AppError, toSafeError } from "@/server/errors";
import { cleanup, makeUser } from "./helpers/factory";

const KEY = "sk-ant-api03-" + "x".repeat(40) + "WXYZ";
let alice: { id: string };
let bob: { id: string };
beforeAll(async () => {
  alice = await makeUser("Alice");
  bob = await makeUser("Bob");
});
afterAll(async () => {
  vi.restoreAllMocks();
  await cleanup(alice.id, bob.id);
});

describe("secret encryption", () => {
  it("round-trips, and fails closed when tampered with or used for another user", () => {
    const sealed = sealSecret(KEY, "ai-key:a");
    expect(sealed).not.toContain(KEY);
    expect(sealed).not.toContain("WXYZ");
    expect(openSecret(sealed, "ai-key:a")).toBe(KEY);
    expect(openSecret(sealed, "ai-key:b")).toBeNull();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(openSecret(parts.join("."), "ai-key:a")).toBeNull();
    expect(openSecret("garbage", "ai-key:a")).toBeNull();
    // A fresh IV every time: the same key never encrypts to the same text.
    expect(sealSecret(KEY, "ai-key:a")).not.toBe(sealed);
  });
});

describe("users' AI keys", () => {
  it("stores only an encrypted key and shows just the last four characters", async () => {
    vi.spyOn(AnthropicProvider.prototype, "verifyKey").mockResolvedValue("ok");
    const res = await saveAiKey(alice.id, {
      provider: "anthropic",
      apiKey: ` ${KEY} `,
      readDocuments: "on",
    });
    expect(res.verified).toBe(true);
    const row = await db.aiCredential.findUniqueOrThrow({ where: { userId: alice.id } });
    expect(row.encryptedKey).not.toContain(KEY);
    expect(row.keyHint).toBe("WXYZ");
    const view = await getAiSettings(alice.id);
    expect(view).toMatchObject({
      provider: "anthropic",
      keyHint: "WXYZ",
      readDocuments: true,
      usable: true,
    });
    expect(JSON.stringify(view)).not.toContain(KEY.slice(0, 20));
  });

  it("uses the key only for its owner", async () => {
    const a = await aiForUser(alice.id);
    expect(a).toMatchObject({ source: "user", readDocuments: true });
    expect(a.provider.name).toBe("anthropic");
    const b = await aiForUser(bob.id);
    expect(b.source).not.toBe("user");
  });

  it("can't be moved to another account by copying the database row", async () => {
    const row = await db.aiCredential.findUniqueOrThrow({ where: { userId: alice.id } });
    await db.aiCredential.create({
      data: {
        userId: bob.id,
        provider: "anthropic",
        encryptedKey: row.encryptedKey,
        keyHint: "WXYZ",
      },
    });
    expect((await getAiSettings(bob.id))?.usable).toBe(false);
    expect((await aiForUser(bob.id)).source).not.toBe("user");
    await removeAiKey(bob.id);
  });

  it("rejects keys the AI service says are wrong, and malformed keys", async () => {
    vi.spyOn(AnthropicProvider.prototype, "verifyKey").mockResolvedValue("invalid");
    const bad = (raw: object) =>
      expect(saveAiKey(bob.id, raw)).rejects.toSatisfy((e) => toSafeError(e).code === "VALIDATION");
    await bad({ provider: "anthropic", apiKey: KEY });
    await bad({ provider: "anthropic", apiKey: "sk-proj-" + "a".repeat(30) });
    await bad({ provider: "anthropic", apiKey: "sk-ant-<script>alert(1)</script>xxxxxxxx" });
    await bad({ provider: "gemini", apiKey: KEY });
    await bad({ provider: "anthropic", apiKey: "short" });
    expect(await getAiSettings(bob.id)).toBeNull();
  });

  it("respects the document-reading switch and removes cleanly", async () => {
    await setDocumentReading(alice.id, false);
    expect((await aiForUser(alice.id)).readDocuments).toBe(false);
    await expect(setDocumentReading(bob.id, true)).rejects.toBeInstanceOf(AppError);
    await removeAiKey(alice.id);
    expect(await getAiSettings(alice.id)).toBeNull();
    expect((await aiForUser(alice.id)).source).not.toBe("user");
  });
});
