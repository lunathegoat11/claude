import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { CONSENT_VERSION, LEGAL_LAST_UPDATED } from "@/lib/legal";
import { RenewConsentForm } from "@/components/auth/renew-consent-form";

export const metadata: Metadata = {
  title: "Updated terms",
  description: "Review and accept the updated Kosha Health Terms of Use and Privacy Policy.",
  robots: { index: false },
};

/** Shown once after the Terms or Privacy Policy change, before the app can be used again. */
export default async function ConsentPage() {
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
          {isNew ? "One last step" : "We\u2019ve updated our terms"}
        </h1>
        <p className="text-muted-foreground text-[15px]">
          {isNew ? (
            "Before you start, please confirm your age and read and accept how Kosha Health looks after your information."
          ) : (
            <>
              The Terms of Use and Privacy Policy changed on {LEGAL_LAST_UPDATED}. Deleted items are
              now removed for good at once, and there&apos;s a new, optional way to help Kosha read
              reports better by learning from your corrections (only the kind of mistake is kept,
              never your values). AI stays optional and off unless you switch it on. Please read and
              accept them to continue.
            </>
          )}
        </p>
      </div>
      <RenewConsentForm askAge={!row?.ageConfirmedAt} />
    </div>
  );
}
