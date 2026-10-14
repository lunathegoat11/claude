import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Mail, XCircle } from "lucide-react";
import { verifyEmailAction } from "@/actions/auth";
import { findValidToken } from "@/server/auth/email-tokens";
import { getCurrentUser } from "@/server/auth/session";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("account.meta.verify.title"),
    description: t("account.meta.verify.desc"),
    referrer: "no-referrer",
    robots: { index: false },
  };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; failed?: string }>;
}) {
  const t = await getT();
  const { token = "", done, failed } = await searchParams;
  const signedIn = !!(await getCurrentUser());
  // Opening the link only checks it; the address is confirmed when the button is pressed.
  const valid =
    !done && !failed && token ? !!(await findValidToken(token, "EMAIL_VERIFICATION")) : false;
  const state = done ? "done" : valid ? "ready" : "failed";
  return (
    <div className="space-y-6 text-center">
      <span
        className={`mx-auto flex size-12 items-center justify-center rounded-[var(--radius)] ${
          state === "failed" ? "bg-destructive/10 text-destructive" : "bg-success/12 text-success"
        }`}
      >
        {state === "done" ? (
          <CheckCircle2 className="size-6" />
        ) : state === "ready" ? (
          <Mail className="size-6" />
        ) : (
          <XCircle className="size-6" />
        )}
      </span>
      <h1 className="text-[28px] font-semibold">
        {state === "done"
          ? t("account.verify.done")
          : state === "ready"
            ? t("account.verify.ready")
            : t("account.verify.failed")}
      </h1>
      <p className="text-muted-foreground text-[15px]">
        {state === "done"
          ? t("account.verify.done.desc")
          : state === "ready"
            ? t("account.verify.ready.desc")
            : t("account.verify.failed.desc")}
      </p>
      {state === "ready" ? (
        <form action={verifyEmailAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" size="lg" className="w-full">
            {t("account.verify.button")}
          </Button>
        </form>
      ) : (
        <Button asChild size="lg" className="w-full">
          <Link href={signedIn ? "/dashboard" : "/sign-in"}>
            {signedIn ? t("account.verify.dashboard") : t("account.signIn")}
          </Link>
        </Button>
      )}
    </div>
  );
}
