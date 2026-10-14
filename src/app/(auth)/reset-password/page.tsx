import Link from "next/link";
import type { Metadata } from "next";
import { findValidToken } from "@/server/auth/email-tokens";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("account.meta.reset.title"),
    description: t("account.meta.reset.desc"),
    referrer: "no-referrer",
    robots: { index: false },
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getT();
  const { token = "" } = await searchParams;
  // Only checks the link here; it is used up when the new password is saved.
  const valid = token ? await findValidToken(token, "PASSWORD_RESET") : null;
  if (!valid) {
    return (
      <div className="space-y-6">
        <h1 className="text-[28px] font-semibold">{t("account.reset.expired")}</h1>
        <p className="text-muted-foreground text-[15px]">{t("account.reset.expired.desc")}</p>
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">{t("account.reset.sendNew")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold">{t("account.reset.title")}</h1>
        <p className="text-muted-foreground text-[15px]">{t("account.reset.desc")}</p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
