import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { resetEnvCache } from "@/server/env";
import {
  getPlan,
  handlePaddleEvent,
  hasFreeAccess,
  monthKey,
  reserveUpload,
  verifyPaddleSignature,
} from "@/server/services/billing";
import { aiForUser } from "@/server/services/ai-settings";
import { ask } from "@/server/services/assistant";
import { toSafeError } from "@/server/errors";
import { cleanup, makeUser } from "./helpers/factory";

const TZ = "Asia/Kolkata";
let free: { id: string; email: string };
let friend: { id: string; email: string };
beforeAll(async () => {
  free = await makeUser("Free");
  friend = await makeUser("Friend");
});
afterAll(() => cleanup(free.id, friend.id));
afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});
const stub = (vars: Record<string, string>) => {
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  resetEnvCache();
};

describe("free plan", () => {
  it("allows 3 uploads a month, then asks to upgrade, and gives back failed uploads", async () => {
    for (let i = 0; i < 3; i++) await reserveUpload(free.id, TZ);
    const e = await reserveUpload(free.id, TZ).catch(toSafeError);
    expect(e).toMatchObject({ code: "PLAN_LIMIT" });
    expect((await getPlan(free.id, TZ)).uploadsThisMonth).toBe(3);
    // A failed upload doesn't use up the allowance.
    await db.uploadUsage.update({
      where: { userId_month: { userId: free.id, month: monthKey(TZ) } },
      data: { count: 2 },
    });
    const giveBack = await reserveUpload(free.id, TZ);
    await giveBack();
    expect((await getPlan(free.id, TZ)).uploadsThisMonth).toBe(2);
  });

  it("keeps the AI helper for Kosha Plus", async () => {
    expect((await aiForUser(free.id)).source).toBe("demo");
    expect(
      await ask(free.id, { message: "How is my sugar?" }, TZ).catch(toSafeError),
    ).toMatchObject({
      code: "PLAN_LIMIT",
    });
  });

  it("counts months in the person's own time zone", () => {
    const at = new Date("2026-10-31T20:00:00Z"); // 1 November in India
    expect(monthKey("Asia/Kolkata", at)).toBe("2026-11");
    expect(monthKey("America/New_York", at)).toBe("2026-10");
  });
});

describe("free access list", () => {
  it("gives the listed emails Kosha Plus, ignoring case and spaces", async () => {
    stub({ FREE_ACCESS_EMAILS: ` someone@example.com, ${friend.email.toUpperCase()} ` });
    expect(hasFreeAccess(friend.email)).toBe(true);
    expect(hasFreeAccess(free.email)).toBe(false);
    const plan = await getPlan(friend.id, TZ);
    expect(plan).toMatchObject({ plus: true, via: "free-access", uploadLimit: null });
    for (let i = 0; i < 5; i++) await reserveUpload(friend.id, TZ); // no limit
  });
});

describe("Paddle", () => {
  const secret = "pdl_ntfset_test_secret";
  const sign = (body: string, ts = Math.floor(Date.now() / 1000)) =>
    `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;

  it("accepts only webhooks signed with the secret, and only recent ones", () => {
    stub({ PADDLE_WEBHOOK_SECRET: secret });
    const body = '{"event_type":"x"}';
    expect(verifyPaddleSignature(body, sign(body))).toBe(true);
    expect(verifyPaddleSignature(body + " ", sign(body))).toBe(false);
    expect(verifyPaddleSignature(body, sign(body, Math.floor(Date.now() / 1000) - 3600))).toBe(
      false,
    );
    expect(verifyPaddleSignature(body, null)).toBe(false);
  });

  it("switches Kosha Plus on for a monthly plan and off when it's cancelled", async () => {
    const u = await makeUser("Monthly");
    try {
      const ends = new Date(Date.now() + 30 * 86_400_000).toISOString();
      const event = (status: string) => ({
        event_type: `subscription.${status === "canceled" ? "canceled" : "updated"}`,
        data: {
          id: "sub_1" + u.id.slice(0, 8),
          status,
          customer_id: "ctm_1",
          custom_data: { userId: u.id },
          current_billing_period: { ends_at: ends },
        },
      });
      expect(await handlePaddleEvent(event("active"))).toBe("monthly");
      expect(await getPlan(u.id, TZ)).toMatchObject({
        plus: true,
        via: "monthly",
        canManage: true,
      });
      await handlePaddleEvent(event("active")); // the same event twice is fine
      await handlePaddleEvent(event("canceled"));
      expect((await getPlan(u.id, TZ)).plus).toBe(false);
    } finally {
      await cleanup(u.id);
    }
  });

  it("keeps a one-time purchase for good, and ignores events for unknown accounts", async () => {
    stub({ PADDLE_PRICE_LIFETIME: "pri_lifetime" });
    const u = await makeUser("Lifetime");
    try {
      const bought = {
        event_type: "transaction.completed",
        data: {
          id: "txn_1",
          customer_id: "ctm_2",
          subscription_id: null,
          custom_data: { userId: u.id },
          items: [{ price: { id: "pri_lifetime" } }],
        },
      };
      expect(await handlePaddleEvent(bought)).toBe("lifetime");
      // A later monthly cancellation doesn't take it away.
      await handlePaddleEvent({
        event_type: "subscription.canceled",
        data: { id: "sub_x", status: "canceled", custom_data: { userId: u.id } },
      });
      expect(await getPlan(u.id, TZ)).toMatchObject({ plus: true, via: "lifetime" });
      expect(
        await handlePaddleEvent({
          ...bought,
          data: { ...bought.data, custom_data: { userId: "nope" } },
        }),
      ).toBe("ignored");
    } finally {
      await cleanup(u.id);
    }
  });
});
