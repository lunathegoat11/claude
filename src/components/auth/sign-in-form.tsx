"use client";
import { BusyContent } from "@/components/shared/delayed-loader";
import Link from "next/link";
import { signInAction, demoSignInAction } from "@/actions/auth";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { ConsentBox } from "./consent-box";
import { useT } from "@/i18n/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export function SignInForm({ next, demoEnabled }: { next?: string; demoEnabled: boolean }) {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(signInAction);
  const [demoPending, start] = useTransition();
  const [adult, setAdult] = useState(false);
  const [ageError, setAgeError] = useState<string[] | undefined>();
  const ageErr = ageError ?? err("ageConfirmed");
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
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
        <Field
          label={t("account.password")}
          htmlFor="password"
          error={err("password")}
          hint={
            <Link href="/forgot-password" className="text-primary font-medium hover:underline">
              {t("account.signIn.forgot")}
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
        <ConsentBox
          name="ageConfirmed"
          error={ageErr}
          checked={adult}
          onCheckedChange={(v) => {
            setAdult(v);
            if (v) setAgeError(undefined);
          }}
        >
          {t("account.consent.age")}
        </ConsentBox>
        <SubmitButton
          pending={pending}
          className="w-full"
          size="lg"
          pendingLabel={t("account.signIn.signingIn")}
          loadingKind="signIn"
        >
          {t("account.signIn")}
        </SubmitButton>
      </form>
      {demoEnabled && (
        <>
          <div className="text-muted-foreground relative text-center text-xs">
            <span className="bg-card relative z-10 px-3">{t("account.or")}</span>
            <span className="bg-border absolute inset-x-0 top-1/2 h-px" />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={demoPending}
            onClick={() => {
              if (!adult) return setAgeError([t("account.signIn.confirmAge")]);
              start(async () => {
                const res = await demoSignInAction(true);
                if (res?.error) toast.error(res.error);
              });
            }}
          >
            <BusyContent active={demoPending} kind="signIn" icon={<Sparkles />}>
              {t("account.signIn.demo")}
            </BusyContent>
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            {t("account.signIn.demoNote")}
          </p>
        </>
      )}
    </div>
  );
}
