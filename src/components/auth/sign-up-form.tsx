"use client";
import Link from "next/link";
import { signUpAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

function ConsentBox({
  name,
  error,
  children,
}: {
  name: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-muted-foreground flex items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          name={name}
          aria-invalid={!!error}
          className="mt-1 size-5 shrink-0 rounded accent-[var(--primary)]"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p role="alert" className="text-destructive mt-1 pl-8 text-[13px]">
          {error[0]}
        </p>
      )}
    </div>
  );
}

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
      <fieldset className="bg-card space-y-3 rounded-2xl border p-4">
        <legend className="sr-only">Consent</legend>
        <ConsentBox name="acceptTerms" error={err("acceptTerms")}>
          I agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          , and I understand Kosha organises my information but does not give medical diagnosis or
          advice.
        </ConsentBox>
        <ConsentBox name="healthDataConsent" error={err("healthDataConsent")}>
          I consent to Kosha storing and processing the health information I add, only to provide
          this service to me. I can download or delete it at any time.
        </ConsentBox>
      </fieldset>
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
