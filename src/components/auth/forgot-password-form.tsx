"use client";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { forgotPasswordAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export function ForgotPasswordForm() {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(forgotPasswordAction, {
    successToast: false,
  });
  if (state.ok) {
    return (
      <div className="bg-muted space-y-4 rounded-2xl p-5 text-center">
        <span className="bg-accent text-accent-foreground mx-auto flex size-11 items-center justify-center rounded-[var(--radius)]">
          <MailCheck className="size-5" />
        </span>
        <p className="text-[15px]">{state.message}</p>
        <p className="text-muted-foreground text-sm">{t("account.forgot.linkHour")}</p>
        <Link
          href="/sign-in"
          className="text-primary inline-block text-sm font-medium hover:underline"
        >
          {t("account.forgot.back")}
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
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
      <SubmitButton
        pending={pending}
        className="w-full"
        size="lg"
        pendingLabel={t("account.forgot.sending")}
        loadingKind="email"
      >
        {t("account.forgot.send")}
      </SubmitButton>
      <p className="text-muted-foreground text-center text-sm">
        {t("account.forgot.remembered")}{" "}
        <Link href="/sign-in" className="text-primary font-medium hover:underline">
          {t("account.signIn")}
        </Link>
      </p>
    </form>
  );
}
