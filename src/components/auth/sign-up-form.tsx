"use client";
import Link from "next/link";
import { signUpAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { ConsentBox } from "./consent-box";
import { useT } from "@/i18n/client";
import { OAuthButtons } from "./oauth-buttons";

export function SignUpForm({
  inviteOnly = false,
  invite,
  google = false,
  apple = false,
}: {
  google?: boolean;
  apple?: boolean;
  inviteOnly?: boolean;
  /** From an invite link, so the person doesn't have to type it. */
  invite?: string;
}) {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(signUpAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      {inviteOnly && (
        <Field
          label={t("account.signUp.inviteCode")}
          htmlFor="inviteCode"
          error={err("inviteCode")}
        >
          <Input
            id="inviteCode"
            name="inviteCode"
            defaultValue={invite}
            autoComplete="off"
            spellCheck={false}
            required
            aria-invalid={!!err("inviteCode")}
          />
        </Field>
      )}
      <OAuthButtons
        google={google}
        apple={apple}
        inviteFieldId={inviteOnly ? "inviteCode" : undefined}
      />
      <Field label={t("account.signUp.name")} htmlFor="name" error={err("name")}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={!!err("name")} />
      </Field>
      <Field label={t("account.email")} htmlFor="email" error={err("email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={!!err("email")}
        />
      </Field>
      <Field
        label={t("account.password")}
        htmlFor="password"
        error={err("password")}
        hint={t("account.reset.passwordHint")}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!err("password")}
        />
      </Field>
      <fieldset className="bg-muted space-y-3 rounded-2xl p-4">
        <legend className="sr-only">{t("account.consent.legend")}</legend>
        <ConsentBox name="ageConfirmed" error={err("ageConfirmed")}>
          {t("account.consent.age")}
        </ConsentBox>
        <TermsConsents err={err} />
        <ImproveReadingConsent />
      </fieldset>
      <SubmitButton
        pending={pending}
        className="w-full"
        size="lg"
        pendingLabel={t("account.signUp.creating")}
        loadingKind="signUp"
      >
        {t("account.signUp.create")}
      </SubmitButton>
      <p className="text-muted-foreground text-center text-sm">
        {t("account.signUp.haveAccount")}{" "}
        <Link href="/sign-in" className="text-primary font-medium hover:underline">
          {t("account.signIn")}
        </Link>
      </p>
    </form>
  );
}

/** The two consents every account needs: the terms, and processing of health data. */
export function TermsConsents({ err }: { err: (k: string) => string[] | undefined }) {
  const t = useT();
  const before = t("account.consent.termsBefore");
  return (
    <>
      <ConsentBox name="acceptTerms" error={err("acceptTerms")}>
        {before && `${before} `}
        <Link
          href="/terms"
          target="_blank"
          className="text-primary font-medium underline underline-offset-2"
        >
          {t("account.consent.termsLink")}
        </Link>{" "}
        {t("account.consent.termsAnd")}{" "}
        <Link
          href="/privacy"
          target="_blank"
          className="text-primary font-medium underline underline-offset-2"
        >
          {t("account.consent.privacyLink")}
        </Link>
        {t("account.consent.termsAfter")}
      </ConsentBox>
      <ConsentBox name="healthDataConsent" error={err("healthDataConsent")}>
        {t("account.consent.healthData")}
      </ConsentBox>
    </>
  );
}

/** Optional: let corrections improve report reading. Left unticked unless chosen. */
export function ImproveReadingConsent() {
  const t = useT();
  return <ConsentBox name="improveReading">{t("account.consent.improve")}</ConsentBox>;
}
