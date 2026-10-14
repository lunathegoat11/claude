"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { billingPortalAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/delayed-loader";
import { PLAN_NAME, type PlanChoice } from "@/lib/pricing";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (o: {
        token: string;
        eventCallback?: (e: { name?: string }) => void;
      }) => void;
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

const FREE = ["All your records, reports and readings", "Charts and reference ranges"];
const PLUS = ["Unlimited reports", "The AI helper: questions about your health records", "AI reading of reports"];

export function PlanPanel({ plan, prices, checkout, user, justPaid }: PlanPanelProps) {
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
      toast.error("The payment page didn't open. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("manage");
    const res = await billingPortalAction();
    setBusy(null);
    if (res.ok && res.data?.url) window.location.href = res.data.url;
    else toast.error(res.error ?? "Couldn't open the payment page. Please try again.");
  }

  const current = plan.plus
    ? plan.via === "free-access"
      ? `${PLAN_NAME}, free for this account`
      : plan.via === "lifetime"
        ? `${PLAN_NAME}, paid once: yours to keep`
        : plan.via === "monthly"
          ? `${PLAN_NAME}, monthly${plan.renews ? `. Paid until ${plan.renews}` : ""}`
          : `${PLAN_NAME} (sample account)`
    : `Free plan: ${plan.uploadsThisMonth} of ${plan.uploadLimit} reports added this month`;

  return (
    <div className="space-y-6">
      {justPaid && !plan.plus && (
        <p role="status" className="bg-accent text-accent-foreground rounded-2xl px-4 py-3 text-sm">
          Thank you! Your payment went through. {PLAN_NAME} switches on within a minute; pull down
          to refresh.
        </p>
      )}
      <div>
        <p className="text-muted-foreground text-sm">Your plan</p>
        <p className="mt-1 text-lg font-semibold">{current}</p>
        {plan.via === "monthly" && plan.status === "past_due" && (
          <p className="text-warning mt-1 text-sm">
            The last payment didn&rsquo;t go through. Update your card to keep {PLAN_NAME}.
          </p>
        )}
        {plan.canManage && (
          <Button variant="outline" className="mt-3" onClick={manage} disabled={busy !== null}>
            {busy === "manage" && <Spinner />}
            Manage payment, invoices or cancel
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border p-5">
          <h3 className="font-semibold">Free</h3>
          <ul className="mt-3 space-y-2 text-[15px]">
            {[...FREE, `${plan.uploadLimit ?? 3} reports a month`].map((f) => (
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
            {[...FREE, ...PLUS].map((f) => (
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
                {prices.monthly} a month
              </Button>
              <Button
                variant="outline"
                onClick={() => buy("lifetime")}
                disabled={!checkout || busy !== null}
              >
                {busy === "lifetime" && <Spinner />}
                {prices.lifetime} once, yours to keep
              </Button>
              <p className="text-muted-foreground text-[13px]">
                {checkout
                  ? "Monthly: cancel any time, and it stays on until the paid month ends. Payments are handled securely by Paddle; Kosha never sees your card."
                  : "Payments open soon."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
