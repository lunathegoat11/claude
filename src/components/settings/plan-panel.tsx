"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { billingPortalAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/delayed-loader";
import { PLAN_NAME, type PlanChoice } from "@/lib/pricing";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (o: { token: string; eventCallback?: (e: { name?: string }) => void }) => void;
      Checkout: {
        open: (o: {
          items: { priceId: string; quantity: number }[];
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: Record<string, unknown>;
        }) => void;
      };
    };
  }
}

export interface PlanPanelProps {
  plan: {
    plus: boolean;
    via: "free-access" | "monthly" | "lifetime" | "demo" | null;
    status: string | null;
    renews: string | null;
    canManage: boolean;
    uploadsThisMonth: number;
    uploadLimit: number | null;
  };
  prices: { monthly: string; lifetime: string };
  checkout: { token: string; sandbox: boolean; prices: Record<PlanChoice, string> } | null;
  user: { id: string; email: string };
  justPaid: boolean;
}

let paddleReady: Promise<void> | null = null;
/** Load Paddle's checkout script once, only when someone chooses to pay. */
function loadPaddle(cfg: NonNullable<PlanPanelProps["checkout"]>, onDone: () => void) {
  paddleReady ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => {
      if (!window.Paddle) return reject(new Error("Paddle didn't load"));
      if (cfg.sandbox) window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({
        token: cfg.token,
        eventCallback: (e) => {
          if (e.name === "checkout.completed") onDone();
        },
      });
      resolve();
    };
    s.onerror = () => {
      paddleReady = null;
      reject(new Error("Paddle didn't load"));
    };
    document.head.appendChild(s);
  });
  return paddleReady;
}

const FREE: MessageKey[] = ["account.plan.f.records", "account.plan.f.charts"];
const PLUS: MessageKey[] = [
  "account.plan.f.unlimited",
  "account.plan.f.ai",
  "account.plan.f.reading",
];

export function PlanPanel({ plan, prices, checkout, user, justPaid }: PlanPanelProps) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<PlanChoice | "manage" | null>(null);

  async function buy(choice: PlanChoice) {
    if (!checkout) return;
    setBusy(choice);
    try {
      await loadPaddle(checkout, () => router.push("/settings?tab=plan&paid=1"));
      window.Paddle!.Checkout.open({
        items: [{ priceId: checkout.prices[choice], quantity: 1 }],
        customer: { email: user.email },
        customData: { userId: user.id },
      });
    } catch {
      toast.error(t("account.plan.payFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("manage");
    const res = await billingPortalAction();
    setBusy(null);
    if (res.ok && res.data?.url) window.location.href = res.data.url;
    else toast.error(res.error ?? t("account.plan.portalFailed"));
  }

  const current = plan.plus
    ? plan.via === "free-access"
      ? t("account.plan.freeAccess", { plan: PLAN_NAME })
      : plan.via === "lifetime"
        ? t("account.plan.lifetime", { plan: PLAN_NAME })
        : plan.via === "monthly"
          ? plan.renews
            ? t("account.plan.monthlyUntil", { plan: PLAN_NAME, date: plan.renews })
            : t("account.plan.monthly", { plan: PLAN_NAME })
          : t("account.plan.sample", { plan: PLAN_NAME })
    : t("account.plan.freeUsage", {
        n: plan.uploadsThisMonth,
        limit: String(plan.uploadLimit),
      });

  return (
    <div className="space-y-6">
      {justPaid && !plan.plus && (
        <p role="status" className="bg-accent text-accent-foreground rounded-2xl px-4 py-3 text-sm">
          {t("account.plan.thanks", { plan: PLAN_NAME })}
        </p>
      )}
      <div>
        <p className="text-muted-foreground text-sm">{t("account.plan.yours")}</p>
        <p className="mt-1 text-lg font-semibold">{current}</p>
        {plan.via === "monthly" && plan.status === "past_due" && (
          <p className="text-warning mt-1 text-sm">
            {t("account.plan.pastDue", { plan: PLAN_NAME })}
          </p>
        )}
        {plan.canManage && (
          <Button variant="outline" className="mt-3" onClick={manage} disabled={busy !== null}>
            {busy === "manage" && <Spinner />}
            {t("account.plan.manage")}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border p-5">
          <h3 className="font-semibold">{t("account.plan.free")}</h3>
          <ul className="mt-3 space-y-2 text-[15px]">
            {[
              ...FREE.map((k) => t(k)),
              t("account.plan.f.limit", { n: plan.uploadLimit ?? 3 }),
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="text-success mt-0.5 size-4 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </section>
        <section className="border-primary/40 bg-primary/5 rounded-3xl border p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="text-primary size-4" />
            {PLAN_NAME}
          </h3>
          <ul className="mt-3 space-y-2 text-[15px]">
            {[...FREE, ...PLUS]
              .map((k) => t(k))
              .map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="text-success mt-0.5 size-4 shrink-0" />
                  {f}
                </li>
              ))}
          </ul>
          {!plan.plus && (
            <div className="mt-5 grid gap-2">
              <Button onClick={() => buy("monthly")} disabled={!checkout || busy !== null}>
                {busy === "monthly" && <Spinner />}
                {t("account.plan.buyMonthly", { price: prices.monthly })}
              </Button>
              <Button
                variant="outline"
                onClick={() => buy("lifetime")}
                disabled={!checkout || busy !== null}
              >
                {busy === "lifetime" && <Spinner />}
                {t("account.plan.buyLifetime", { price: prices.lifetime })}
              </Button>
              <p className="text-muted-foreground text-[13px]">
                {checkout ? t("account.plan.payNote") : t("account.plan.soon")}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
