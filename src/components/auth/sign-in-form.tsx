"use client";
import Link from "next/link";
import { signInAction, demoSignInAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export function SignInForm({ next, demoEnabled }: { next?: string; demoEnabled: boolean }) {
  const { state, onSubmit, pending, err } = useActionForm(signInAction);
  const [demoPending, start] = useTransition();
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        {state.error && !state.fieldErrors && <FormError message={state.error} />}
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
          hint={
            <Link href="/forgot-password" className="text-primary font-medium hover:underline">
              Forgot password?
            </Link>
          }
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!err("password")}
          />
        </Field>
        <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
      {demoEnabled && (
        <>
          <div className="text-muted-foreground relative text-center text-xs">
            <span className="bg-background relative z-10 px-3">or</span>
            <span className="bg-border absolute inset-x-0 top-1/2 h-px" />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={demoPending}
            onClick={() =>
              start(async () => {
                const res = await demoSignInAction();
                if (res?.error) toast.error(res.error);
              })
            }
          >
            {demoPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Explore the demo
            account
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            The demo uses a fictional patient. Please don&apos;t add real information to it.
          </p>
        </>
      )}
    </div>
  );
}
