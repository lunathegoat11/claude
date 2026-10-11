"use client";
import { renewConsentAction, signOutAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { TermsConsents } from "./sign-up-form";

export function RenewConsentForm() {
  const { state, onSubmit, pending, err } = useActionForm(renewConsentAction);
  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {state.error && !state.fieldErrors && <FormError message={state.error} />}
        <fieldset className="bg-muted space-y-3 rounded-2xl p-4">
          <legend className="sr-only">Consent</legend>
          <TermsConsents err={err} />
        </fieldset>
        <SubmitButton pending={pending} className="w-full" size="lg" loadingKind="save">
          Accept and continue
        </SubmitButton>
      </form>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" className="w-full">
          Not now, sign out
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-[13px]">
        If you don&apos;t accept, you can still download your data or delete your account by writing
        to us; see the Privacy Policy.
      </p>
    </div>
  );
}
