"use client";
import { resetPasswordAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const { state, onSubmit, pending, err } = useActionForm(resetPasswordAction, {
    successToast: false,
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      <Field
        label="New password"
        htmlFor="password"
        error={err("password")}
        hint="At least 10 characters, with a number or symbol."
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
      <Field label="Confirm new password" htmlFor="confirmPassword" error={err("confirmPassword")}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!err("confirmPassword")}
        />
      </Field>
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Saving…">
        Set new password
      </SubmitButton>
      <p className="text-muted-foreground text-center text-xs">
        For your security, you&apos;ll be signed out on all devices.
      </p>
    </form>
  );
}
