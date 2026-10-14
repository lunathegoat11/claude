"use client";
import { BusyContent } from "@/components/shared/delayed-loader";
import { useState, useTransition } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { resendVerificationAction } from "@/actions/auth";
import { useT } from "@/i18n/client";

export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useT();
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  if (hidden) return null;
  return (
    <div role="status" className="bg-accent/50 border-b">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
        <Mail className="text-primary size-4 shrink-0" />
        <p className="min-w-0 flex-1">
          {t("app.verify.before")}
          <span className="hidden sm:inline"> ({email})</span>
          {t("app.verify.after")}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await resendVerificationAction();
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            })
          }
          className="text-primary hover:bg-card inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium disabled:opacity-60"
        >
          <BusyContent active={pending} kind="email">
            {t("app.verify.resend")}
          </BusyContent>
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label={t("app.verify.dismiss")}
          className="text-muted-foreground hover:bg-card shrink-0 rounded-lg p-1.5"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
