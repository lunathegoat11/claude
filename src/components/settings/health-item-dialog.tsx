"use client";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveHealthItemAction } from "@/actions/settings";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

type Kind = "medication" | "allergy" | "condition";
const ADD_TITLES: Record<Kind, MessageKey> = {
  medication: "account.health.add.medication",
  allergy: "account.health.add.allergy",
  condition: "account.health.add.condition",
};
const EDIT_TITLES: Record<Kind, MessageKey> = {
  medication: "account.health.edit.medication",
  allergy: "account.health.edit.allergy",
  condition: "account.health.edit.condition",
};
const SEVERITY_KEYS: Record<string, MessageKey> = {
  MILD: "account.severity.MILD",
  MODERATE: "account.severity.MODERATE",
  SEVERE: "account.severity.SEVERE",
  UNKNOWN: "account.severity.UNKNOWN",
};
const CONDITION_STATUS_KEYS: Record<string, MessageKey> = {
  ACTIVE: "account.conditionStatus.ACTIVE",
  MANAGED: "account.conditionStatus.MANAGED",
  RESOLVED: "account.conditionStatus.RESOLVED",
};

export function HealthItemDialog({
  kind,
  initial,
}: {
  kind: Kind;
  initial?: Record<string, string | boolean | null>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending, err } = useActionForm(saveHealthItemAction, {
    onSuccess: () => setOpen(false),
  });
  const v = (k: string) => (initial?.[k] as string | null | undefined) ?? "";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {initial ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label={t(EDIT_TITLES[kind])}
        >
          <Pencil className="text-muted-foreground" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus /> {t(ADD_TITLES[kind])}
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(initial ? EDIT_TITLES[kind] : ADD_TITLES[kind])}</DialogTitle>
          <DialogDescription>
            {kind === "medication" ? t("account.health.medNote") : t("account.health.summaryNote")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <input type="hidden" name="kind" value={kind} />
          {initial?.id && <input type="hidden" name="id" value={String(initial.id)} />}
          {state.error && !state.fieldErrors && <FormError message={state.error} />}
          {kind === "medication" && (
            <>
              <Field label={t("account.health.medName")} htmlFor="h-name" error={err("name")}>
                <Input
                  id="h-name"
                  name="name"
                  defaultValue={v("name")}
                  placeholder={t("account.health.medName.ph")}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("account.health.dose")} htmlFor="h-dosage" optional>
                  <Input
                    id="h-dosage"
                    name="dosage"
                    defaultValue={v("dosage")}
                    placeholder={t("account.health.dose.ph")}
                  />
                </Field>
                <Field label={t("account.health.freq")} htmlFor="h-freq" optional>
                  <Input
                    id="h-freq"
                    name="frequency"
                    defaultValue={v("frequency")}
                    placeholder={t("account.health.freq.ph")}
                  />
                </Field>
                <Field
                  label={t("account.health.started")}
                  htmlFor="h-start"
                  optional
                  error={err("startDate")}
                >
                  <Input id="h-start" name="startDate" type="date" defaultValue={v("startDate")} />
                </Field>
                <Field
                  label={t("account.health.stoppedOn")}
                  htmlFor="h-end"
                  optional
                  error={err("endDate")}
                >
                  <Input id="h-end" name="endDate" type="date" defaultValue={v("endDate")} />
                </Field>
              </div>
              <Field label={t("account.health.prescribedBy")} htmlFor="h-by" optional>
                <Input id="h-by" name="prescribedBy" defaultValue={v("prescribedBy")} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={initial ? !!initial.active : true}
                  className="size-4 accent-[var(--primary)]"
                />{" "}
                {t("account.health.taking")}
              </label>
            </>
          )}
          {kind === "allergy" && (
            <>
              <Field
                label={t("account.health.allergen")}
                htmlFor="h-allergen"
                error={err("allergen")}
              >
                <Input
                  id="h-allergen"
                  name="allergen"
                  defaultValue={v("allergen")}
                  placeholder={t("account.health.allergen.ph")}
                  required
                />
              </Field>
              <Field label={t("account.health.reaction")} htmlFor="h-reaction" optional>
                <Input
                  id="h-reaction"
                  name="reaction"
                  defaultValue={v("reaction")}
                  placeholder={t("account.health.reaction.ph")}
                />
              </Field>
              <Field label={t("account.health.severity")} htmlFor="h-sev">
                <NativeSelect id="h-sev" name="severity" defaultValue={v("severity") || "UNKNOWN"}>
                  {Object.entries(SEVERITY_KEYS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {t(l)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          )}
          {kind === "condition" && (
            <>
              <Field label={t("account.health.condition")} htmlFor="h-cond" error={err("name")}>
                <Input
                  id="h-cond"
                  name="name"
                  defaultValue={v("name")}
                  placeholder={t("account.health.condition.ph")}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("account.health.status")} htmlFor="h-status">
                  <NativeSelect id="h-status" name="status" defaultValue={v("status") || "ACTIVE"}>
                    {Object.entries(CONDITION_STATUS_KEYS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {t(l)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field
                  label={t("account.health.diagnosedOn")}
                  htmlFor="h-dx"
                  optional
                  error={err("diagnosedOn")}
                >
                  <Input id="h-dx" name="diagnosedOn" type="date" defaultValue={v("diagnosedOn")} />
                </Field>
              </div>
            </>
          )}
          <Field label={t("account.health.notes")} htmlFor="h-notes" optional>
            <Textarea id="h-notes" name="notes" rows={2} defaultValue={v("notes")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("account.cancel")}
            </Button>
            <SubmitButton pending={pending} pendingLabel={t("account.saving")}>
              {t("account.save")}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
