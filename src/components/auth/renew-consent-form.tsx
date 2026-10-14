"use client";
import { renewConsentAction, signOutAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { ImproveReadingConsent, TermsConsents } from "./sign-up-form";
import { ConsentBox } from "./consent-box";
import { useT } from "@/i18n/client";

export function RenewConsentForm({ askAge = false }: { askAge?: boolean }) {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(renewConsentAction);
  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {state.error && !state.fieldErrors && <FormError message={state.error} />}
        <fieldset className="bg-muted space-y-3 rounded-2xl p-4">
          <legend className="sr-only">{t("account.consent.legend")}</legend>
          {askAge && (
            <ConsentBox name="ageConfirmed" error={err("ageConfirmed")}>
              {t("account.consent.age")}
            </ConsentBox>
          )}
          <TermsConsents err={err} />
          <ImproveReadingConsent />
        </fieldset>
        <SubmitButton pending={pending} className="w-full" size="lg" loadingKind="save">
          {t("account.consentPage.accept")}
        </SubmitButton>
      </form>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" className="w-full">
          {t("account.consentPage.notNow")}
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-[13px]">
        {t("account.consentPage.ifNot")}
      </p>
    </div>
  );
}
