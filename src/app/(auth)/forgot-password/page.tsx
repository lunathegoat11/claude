import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("account.meta.forgot.title"),
    description: t("account.meta.forgot.desc"),
    robots: { index: false },
  };
}

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold">{t("account.forgot.title")}</h1>
        <p className="text-muted-foreground text-[15px]">{t("account.forgot.desc")}</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
