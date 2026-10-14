import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { CONSENT_VERSION, LEGAL_LAST_UPDATED } from "@/lib/legal";
import { RenewConsentForm } from "@/components/auth/renew-consent-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("account.meta.consent.title"),
    description: t("account.meta.consent.desc"),
    robots: { index: false },
  };
}

/** Shown once after the Terms or Privacy Policy change, before the app can be used again. */
export default async function ConsentPage() {
  const t = await getT();
  const user = await requireUser();
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { consentVersion: true, ageConfirmedAt: true, termsAcceptedAt: true },
  });
  const isNew = !row?.termsAcceptedAt;
  if (user.isDemo || row?.consentVersion === CONSENT_VERSION) redirect("/dashboard");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold">
          {isNew ? t("account.consentPage.newTitle") : t("account.consentPage.updatedTitle")}
        </h1>
        <p className="text-muted-foreground text-[15px]">
          {isNew
            ? t("account.consentPage.newDesc")
            : t("account.consentPage.updatedDesc", { date: LEGAL_LAST_UPDATED })}
        </p>
      </div>
      <RenewConsentForm askAge={!row?.ageConfirmedAt} />
    </div>
  );
}
