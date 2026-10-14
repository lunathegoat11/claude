"use client";
import { resetPasswordAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(resetPasswordAction, {
    successToast: false,
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      <Field
        label={t("account.security.new")}
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
      <Field
        label={t("account.security.confirm")}
        htmlFor="confirmPassword"
        error={err("confirmPassword")}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!err("confirmPassword")}
        />
      </Field>
      <SubmitButton
        pending={pending}
        className="w-full"
        size="lg"
        pendingLabel={t("account.saving")}
      >
        {t("account.reset.set")}
      </SubmitButton>
      <p className="text-muted-foreground text-center text-xs">{t("account.reset.signedOut")}</p>
    </form>
  );
}
