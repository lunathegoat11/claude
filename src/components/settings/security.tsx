"use client";
import { useState } from "react";
import { BusyContent } from "@/components/shared/delayed-loader";
import { useTransition } from "react";
import { Download, LogOut } from "lucide-react";
import { toast } from "sonner";
import { changePasswordAction, revokeOtherSessionsAction } from "@/actions/auth";
import { deleteAccountAction } from "@/actions/settings";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError, FormSection } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export function ChangePasswordForm({ disabled }: { disabled?: boolean }) {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(changePasswordAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t("account.security.current")}
          htmlFor="currentPassword"
          error={err("currentPassword")}
        >
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            disabled={disabled}
          />
        </Field>
        <Field label={t("account.security.new")} htmlFor="newPassword" error={err("newPassword")}>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
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
            disabled={disabled}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton
          pending={pending}
          variant="secondary"
          disabled={disabled}
          pendingLabel={t("account.security.updating")}
        >
          {t("account.security.update")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function RevokeSessionsButton() {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await revokeOtherSessionsAction();
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
    >
      <BusyContent active={pending} kind="signOut" icon={<LogOut />}>
        {t("account.security.signOutOthers")}
      </BusyContent>
    </Button>
  );
}

export function ExportButton() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? t("account.security.downloadFailed"));
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `kosha-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.security.downloadFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" onClick={download} disabled={busy} aria-busy={busy}>
      <BusyContent active={busy} kind="export" icon={<Download />}>
        {t("account.security.download")}
      </BusyContent>
    </Button>
  );
}

export function DeleteAccountForm({
  disabled,
  needsPassword = true,
}: {
  disabled?: boolean;
  /** False for accounts that sign in only with Google or Apple. */
  needsPassword?: boolean;
}) {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(deleteAccountAction);
  return (
    <FormSection title={t("account.delete.title")} description={t("account.delete.desc")}>
      <form
        onSubmit={onSubmit}
        className="border-destructive/30 bg-destructive/4 space-y-4 rounded-[var(--radius)] border p-4"
        noValidate
      >
        {state.error && !state.fieldErrors && <FormError message={state.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("account.delete.typeConfirm")} htmlFor="confirm" error={err("confirm")}>
            <Input id="confirm" name="confirm" autoComplete="off" disabled={disabled} />
          </Field>
          {needsPassword && (
            <Field
              label={t("account.delete.password")}
              htmlFor="del-password"
              error={err("password")}
            >
              <Input
                id="del-password"
                name="password"
                type="password"
                autoComplete="current-password"
                disabled={disabled}
              />
            </Field>
          )}
        </div>
        <div className="flex justify-end">
          <SubmitButton
            pending={pending}
            variant="destructive"
            disabled={disabled}
            pendingLabel={t("account.delete.deleting")}
          >
            {t("account.delete.button")}
          </SubmitButton>
        </div>
      </form>
    </FormSection>
  );
}
