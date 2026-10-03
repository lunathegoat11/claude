"use client";
import Link from "next/link";
import { signUpAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

export function SignUpForm() {
  const { state, onSubmit, pending, err } = useActionForm(signUpAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      <Field label="Your name" htmlFor="name" error={err("name")}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={!!err("name")} />
      </Field>
      <Field label="Email" htmlFor="email" error={err("email")}>
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
        label="Password"
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
      <div className="space-y-1.5">
        <label className="text-muted-foreground flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="acceptTerms"
            className="mt-0.5 size-4 rounded accent-[var(--primary)]"
          />
          <span>
            I understand Kosha organises my health information and does not provide medical
            diagnosis or advice.
          </span>
        </label>
        {err("acceptTerms") && (
          <p role="alert" className="text-destructive text-[13px]">
            {err("acceptTerms")![0]}
          </p>
        )}
      </div>
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
