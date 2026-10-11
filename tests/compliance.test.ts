import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { safeNext } from "@/lib/safe-next";
import { isAtLeast18, profileSchema } from "@/lib/validation/health";
import { deleteAccount, exportUserData } from "@/server/services/profile";
import { purgeExpiredData } from "@/server/services/retention";
import { deleteMeasurement } from "@/server/services/measurements";
import { aiForUser, documentReaderLabel, setAiConsent } from "@/server/services/ai-settings";
import { audit } from "@/server/audit";
import { cleanup, makeUser, metricId } from "./helpers/factory";

const DAY = 86_400_000;
let alice: { id: string };
beforeAll(async () => {
  alice = await makeUser("Alice");
});
afterAll(async () => {
  await cleanup(alice.id);
});

describe("redirect after sign-in", () => {
  it("allows paths on this site only", () => {
    expect(safeNext("/labs?tab=reports")).toBe("/labs?tab=reports");
    expect(safeNext("/records/abc#notes")).toBe("/records/abc#notes");
    for (const bad of [
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "/ /evil.example",
      "https://evil.example",
      "javascript:alert(1)",
      "",
      null,
      42,
    ])
      expect(safeNext(bad)).toBe("/dashboard");
  });
});

describe("adults only", () => {
  it("checks the 18th birthday exactly", () => {
    const today = new Date("2026-10-12T12:00:00Z");
    expect(isAtLeast18("2008-10-12", today)).toBe(true);
    expect(isAtLeast18("2008-10-13", today)).toBe(false);
    expect(isAtLeast18("1980-01-01", today)).toBe(true);
  });
  it("refuses a profile date of birth under 18", () => {
    const thisYear = new Date().getFullYear();
    expect(
      profileSchema.safeParse({ fullName: "A", dateOfBirth: `${thisYear - 10}-01-01` }).success,
    ).toBe(false);
    expect(profileSchema.safeParse({ fullName: "A", dateOfBirth: "1990-05-01" }).success).toBe(
      true,
    );
  });
});

describe("AI is opt-in", () => {
  it("uses no AI service and says so when the user hasn't agreed", async () => {
    const ai = await aiForUser(alice.id);
    expect(ai.source).toBe("demo");
    expect(ai.readDocuments).toBe(false);
    expect(await documentReaderLabel(alice.id)).toBe("on this server (no AI)");
  });
  it("records and withdraws consent", async () => {
    await setAiConsent(alice.id, true);
    expect((await db.user.findUnique({ where: { id: alice.id } }))?.aiConsentAt).toBeInstanceOf(
      Date,
    );
    await setAiConsent(alice.id, false);
    expect((await db.user.findUnique({ where: { id: alice.id } }))?.aiConsentAt).toBeNull();
  });
});

describe("download my data", () => {
  it("includes consent records and activity, but never an AI key", async () => {
    await db.aiCredential.create({
      data: {
        userId: alice.id,
        provider: "anthropic",
        encryptedKey: "SEALED-SECRET",
        keyHint: "WXYZ",
      },
    });
    await audit(alice.id, "auth.sign_in");
    const out = await exportUserData(alice.id);
    expect(out.account).toHaveProperty("consentVersion");
    expect(out.account).toHaveProperty("ageConfirmedAt");
    expect(out.account).toHaveProperty("aiConsentAt");
    expect(out.accountActivity.some((a) => a.action === "auth.sign_in")).toBe(true);
    expect(out.aiSettings?.keyHint).toBe("WXYZ");
    expect(JSON.stringify(out)).not.toContain("SEALED-SECRET");
    await db.aiCredential.deleteMany({ where: { userId: alice.id } });
  });
});

describe("deleted items", () => {
  it("are removed for good at once", async () => {
    const metric = await metricId("weight");
    const m = await db.healthMeasurement.create({
      data: { userId: alice.id, metricId: metric, value: 70, unit: "kg", measuredAt: new Date() },
    });
    await deleteMeasurement(alice.id, m.id);
    expect(await db.healthMeasurement.findUnique({ where: { id: m.id } })).toBeNull();
  });
  it("left marked as deleted by older versions are cleared on the next clean-up", async () => {
    const metric = await metricId("weight");
    const old = await db.healthMeasurement.create({
      data: {
        userId: alice.id,
        metricId: metric,
        value: 71,
        unit: "kg",
        measuredAt: new Date(),
        deletedAt: new Date(Date.now() - DAY),
      },
    });
    await purgeExpiredData(Date.now(), true);
    expect(await db.healthMeasurement.findUnique({ where: { id: old.id } })).toBeNull();
  });
});

describe("deleting an account", () => {
  it("also removes its activity log", async () => {
    const bob = await makeUser("Bob");
    await audit(bob.id, "auth.sign_in");
    await deleteAccount(bob.id);
    expect(await db.user.findUnique({ where: { id: bob.id } })).toBeNull();
    expect(await db.auditLog.count({ where: { userId: bob.id } })).toBe(0);
  });
});
