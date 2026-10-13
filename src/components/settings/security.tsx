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

export function ChangePasswordForm({ disabled }: { disabled?: boolean }) {
  const { state, onSubmit, pending, err } = useActionForm(changePasswordAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="currentPassword" error={err("currentPassword")}>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            disabled={disabled}
          />
        </Field>
        <Field label="New password" htmlFor="newPassword" error={err("newPassword")}>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
          />
        </Field>
        <Field
          label="Confirm new password"
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
          pendingLabel="Updating…"
        >
          Update password
        </SubmitButton>
      </div>
    </form>
  );
}

export function RevokeSessionsButton() {
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
        Sign out other devices
      </BusyContent>
    </Button>
  );
}

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "The download didn't work. Please try again.");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `kosha-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The download didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" onClick={download} disabled={busy} aria-busy={busy}>
      <BusyContent active={busy} kind="export" icon={<Download />}>
        Download my data
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
  const { state, onSubmit, pending, err } = useActionForm(deleteAccountAction);
  return (
    <FormSection
      title="Delete account"
      description="Permanently deletes your account, all records, lab results, readings, conversations and every uploaded file. This cannot be undone."
    >
      <form
        onSubmit={onSubmit}
        className="border-destructive/30 bg-destructive/4 space-y-4 rounded-[var(--radius)] border p-4"
        noValidate
      >
        {state.error && !state.fieldErrors && <FormError message={state.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type DELETE to confirm" htmlFor="confirm" error={err("confirm")}>
            <Input id="confirm" name="confirm" autoComplete="off" disabled={disabled} />
          </Field>
          {needsPassword && (
            <Field label="Your password" htmlFor="del-password" error={err("password")}>
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
            pendingLabel="Deleting…"
          >
            Delete my account permanently
          </SubmitButton>
        </div>
      </form>
    </FormSection>
  );
}
