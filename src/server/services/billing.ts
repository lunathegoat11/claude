import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { PLAN_NAME } from "@/lib/pricing";

/**
 * Plans. Free: everything except the AI helper, and a few report uploads a month.
 * Kosha Plus (monthly or one-time, paid through Paddle): unlimited uploads and the AI
 * helper. Emails in FREE_ACCESS_EMAILS get Kosha Plus without paying.
 */

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export function hasFreeAccess(email: string | null | undefined) {
  if (!email) return false;
  const list = (env().FREE_ACCESS_EMAILS ?? "")
    .split(/[,\s;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** "2026-10" in the person's own time zone. */
export function monthKey(tz: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}`;
}

export interface PlanInfo {
  plus: boolean;
  /** Why the person has Kosha Plus. */
  via: "free-access" | "monthly" | "lifetime" | "demo" | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  /** Whether a monthly plan has been cancelled (it stays on until the paid month ends). */
  canManage: boolean;
  uploadsThisMonth: number;
  /** Null when uploads are unlimited. */
  uploadLimit: number | null;
}

export async function getPlan(userId: string, tz = "Asia/Kolkata"): Promise<PlanInfo> {
  const [user, sub, usage] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true, isDemo: true } }),
    db.subscription.findUnique({ where: { userId } }),
    db.uploadUsage.findUnique({ where: { userId_month: { userId, month: monthKey(tz) } } }),
  ]);
  let via: PlanInfo["via"] = null;
  if (user?.isDemo) via = "demo";
  else if (hasFreeAccess(user?.email)) via = "free-access";
  else if (sub?.kind === "LIFETIME" && sub.status === "active") via = "lifetime";
  else if (
    sub?.kind === "MONTHLY" &&
    ACTIVE.has(sub.status) &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > Date.now() - 3 * 86_400_000)
  )
    via = "monthly";
  return {
    plus: via !== null,
    via,
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    canManage: !!sub?.paddleCustomerId,
    uploadsThisMonth: usage?.count ?? 0,
    uploadLimit: via ? null : env().FREE_UPLOADS_PER_MONTH,
  };
}

export async function isPlus(userId: string) {
  return (await getPlan(userId)).plus;
}

/** For the AI helper: Kosha Plus only. */
export async function requirePlus(userId: string) {
  if (!(await isPlus(userId)))
    throw new AppError(
      "PLAN_LIMIT",
      `The AI helper is part of ${PLAN_NAME}. Upgrade in Settings, Plan to use it.`,
    );
}

/**
 * Count an upload against this month's free allowance, before it is processed. Returns a
 * function that gives the upload back if it then fails.
 */
export async function reserveUpload(userId: string, tz: string): Promise<() => Promise<void>> {
  const plan = await getPlan(userId, tz);
  const month = monthKey(tz);
  const key = { userId_month: { userId, month } };
  const row = await db.uploadUsage.upsert({
    where: key,
    create: { userId, month, count: 1 },
    update: { count: { increment: 1 } },
  });
  const giveBack = async () => {
    await db.uploadUsage.update({ where: key, data: { count: { decrement: 1 } } }).catch(() => {});
  };
  if (plan.uploadLimit !== null && row.count > plan.uploadLimit) {
    await giveBack();
    throw new AppError(
      "PLAN_LIMIT",
      `You've added your ${plan.uploadLimit} free reports for this month. Upgrade to ${PLAN_NAME} for unlimited reports, or add more next month.`,
    );
  }
  return giveBack;
}

// ── Paddle ───────────────────────────────────────────────────

export function paddleEnabled() {
  const e = env();
  return !!(
    e.PADDLE_API_KEY &&
    e.PADDLE_CLIENT_TOKEN &&
    e.PADDLE_WEBHOOK_SECRET &&
    e.PADDLE_PRICE_MONTHLY &&
    e.PADDLE_PRICE_LIFETIME
  );
}

/** What the browser needs to open Paddle's checkout (nothing secret). */
export function checkoutConfig() {
  if (!paddleEnabled()) return null;
  const e = env();
  return {
    token: e.PADDLE_CLIENT_TOKEN!,
    sandbox: e.PADDLE_ENV === "sandbox",
    prices: { monthly: e.PADDLE_PRICE_MONTHLY!, lifetime: e.PADDLE_PRICE_LIFETIME! },
  };
}

const apiBase = () =>
  env().PADDLE_ENV === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

/** A link to Paddle's page where the person can update their card, see invoices or cancel. */
export async function customerPortalUrl(userId: string): Promise<string> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!paddleEnabled() || !sub?.paddleCustomerId)
    throw new AppError("NOT_FOUND", "There's no payment to manage on this account.");
  const res = await fetch(`${apiBase()}/customers/${sub.paddleCustomerId}/portal-sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env().PADDLE_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(
      sub.paddleSubscriptionId ? { subscription_ids: [sub.paddleSubscriptionId] } : {},
    ),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as {
    data?: { urls?: { general?: { overview?: string } } };
  } | null;
  const url = json?.data?.urls?.general?.overview;
  if (!res?.ok || !url) {
    logger.warn("billing.portal_failed", { status: res?.status ?? "network" });
    throw new AppError("INTERNAL", "Couldn't open the payment page. Please try again.");
  }
  return url;
}

/**
 * Check a webhook really came from Paddle: the Paddle-Signature header is
 * "ts=<unix seconds>;h1=<HMAC-SHA256 of "<ts>:<body>" with the webhook secret>".
 */
export function verifyPaddleSignature(rawBody: string, header: string | null, now = Date.now()) {
  const secret = env().PADDLE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(";").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const ts = Number(parts.ts);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.ts}:${rawBody}`).digest("hex");
  const given = String(parts.h1 ?? "");
  return (
    given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  );
}

interface PaddleEvent {
  event_type: string;
  data: {
    id: string;
    status?: string;
    customer_id?: string | null;
    subscription_id?: string | null;
    custom_data?: { userId?: string } | null;
    current_billing_period?: { ends_at?: string } | null;
    items?: { price?: { id?: string } | null }[];
  };
}

/** Keep a person's plan in step with what Paddle tells us. Safe to receive twice. */
export async function handlePaddleEvent(event: PaddleEvent) {
  const d = event.data;
  const userId = d.custom_data?.userId;
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return "ignored";
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return "ignored";
  const existing = await db.subscription.findUnique({ where: { userId } });

  if (event.event_type === "transaction.completed") {
    const lifetime = d.items?.some((i) => i.price?.id === env().PADDLE_PRICE_LIFETIME);
    if (!lifetime || d.subscription_id) return "ignored"; // monthly payments come as subscription events
    const data = {
      kind: "LIFETIME" as const,
      status: "active",
      paddleCustomerId: d.customer_id ?? existing?.paddleCustomerId ?? null,
      paddleTransactionId: d.id,
      currentPeriodEnd: null,
    };
    await db.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return "lifetime";
  }

  if (event.event_type.startsWith("subscription.")) {
    // A one-time purchase already covers everything; a monthly plan's events don't undo it.
    if (existing?.kind === "LIFETIME" && existing.status === "active") return "ignored";
    const data = {
      kind: "MONTHLY" as const,
      status: d.status ?? "active",
      paddleCustomerId: d.customer_id ?? existing?.paddleCustomerId ?? null,
      paddleSubscriptionId: d.id,
      currentPeriodEnd: d.current_billing_period?.ends_at
        ? new Date(d.current_billing_period.ends_at)
        : (existing?.currentPeriodEnd ?? null),
    };
    await db.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return "monthly";
  }
  return "ignored";
}
