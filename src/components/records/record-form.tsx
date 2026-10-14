"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { saveRecordAction } from "@/actions/records";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { RECORD_TYPE_KEYS } from "@/i18n/messages/files-labels";
import { RECORD_TYPES } from "@/lib/validation/health";
import { cn } from "@/lib/utils";

export interface RecordFormValues {
  id?: string;
  type?: string;
  title?: string;
  date?: string;
  endDate?: string;
  doctorName?: string | null;
  facilityName?: string | null;
  specialty?: string | null;
  notes?: string | null;
  tags?: string[];
}

const TITLE_HINTS: Record<string, MessageKey> = {
  DOCTOR_VISIT: "files.form.hint.DOCTOR_VISIT",
  DIAGNOSIS: "files.form.hint.DIAGNOSIS",
  PROCEDURE: "files.form.hint.PROCEDURE",
  HOSPITALIZATION: "files.form.hint.HOSPITALIZATION",
  PRESCRIPTION: "files.form.hint.PRESCRIPTION",
  VACCINATION: "files.form.hint.VACCINATION",
  ALLERGY: "files.form.hint.ALLERGY",
  CONDITION: "files.form.hint.CONDITION",
  FAMILY_HISTORY: "files.form.hint.FAMILY_HISTORY",
  OTHER: "files.form.hint.OTHER",
};

export function RecordForm({
  initial,
  providers,
  today,
}: {
  initial?: RecordFormValues;
  providers: string[];
  today: string;
}) {
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(saveRecordAction, {
    successToast: false,
  });
  const [type, setType] = useState(initial?.type ?? "DOCTOR_VISIT");
  const hasDetails = !!(
    initial?.doctorName ||
    initial?.facilityName ||
    initial?.specialty ||
    initial?.endDate
  );
  const [showDetails, setShowDetails] = useState(hasDetails);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {state.error && !state.fieldErrors && <FormError message={state.error} />}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{t("files.form.kind")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {RECORD_TYPES.map((rt) => (
            <label
              key={rt}
              className={cn(
                "has-[:focus-visible]:ring-ring/30 flex cursor-pointer items-center justify-center rounded-md border px-2 py-2.5 text-center text-[13px] font-medium transition has-[:focus-visible]:ring-3",
                type === rt ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="type"
                value={rt}
                checked={type === rt}
                onChange={() => setType(rt)}
                className="sr-only"
              />
              {t(RECORD_TYPE_KEYS[rt])}
            </label>
          ))}
        </div>
        {err("type") && <p className="text-destructive text-[13px]">{err("type")![0]}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label={t("files.form.title")} htmlFor="title" error={err("title")}>
          <Input
            id="title"
            name="title"
            defaultValue={initial?.title}
            placeholder={t(TITLE_HINTS[type] ?? "files.form.hint.OTHER")}
            required
            aria-invalid={!!err("title")}
            maxLength={200}
          />
        </Field>
        <Field label={t("files.record.date")} htmlFor="date" error={err("date")}>
          <Input
            id="date"
            name="date"
            type="date"
            max={today}
            defaultValue={initial?.date ?? today}
            required
            aria-invalid={!!err("date")}
          />
        </Field>
      </div>

      <div className="rounded-[var(--radius)] border">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        >
          {t("files.form.details")}
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              showDetails && "rotate-180",
            )}
          />
        </button>
        <div className={cn("grid gap-4 border-t p-4 sm:grid-cols-2", !showDetails && "hidden")}>
          <Field
            label={t("files.record.doctor")}
            htmlFor="doctorName"
            optional
            error={err("doctorName")}
          >
            <Input
              id="doctorName"
              name="doctorName"
              defaultValue={initial?.doctorName ?? ""}
              placeholder={t("files.form.doctorPlaceholder")}
            />
          </Field>
          <Field
            label={t("files.record.specialty")}
            htmlFor="specialty"
            optional
            error={err("specialty")}
          >
            <Input
              id="specialty"
              name="specialty"
              list="specialties"
              defaultValue={initial?.specialty ?? ""}
              placeholder={t("files.form.specialtyPlaceholder")}
            />
          </Field>
          <Field
            label={t("files.record.facility")}
            htmlFor="facilityName"
            optional
            error={err("facilityName")}
            className="sm:col-span-2"
          >
            <Input
              id="facilityName"
              name="facilityName"
              list="providers"
              defaultValue={initial?.facilityName ?? ""}
              placeholder={t("files.form.facilityPlaceholder")}
            />
          </Field>
          {(type === "HOSPITALIZATION" || type === "PRESCRIPTION" || initial?.endDate) && (
            <Field
              label={t(
                type === "HOSPITALIZATION" ? "files.form.dischargeDate" : "files.form.endDate",
              )}
              htmlFor="endDate"
              optional
              error={err("endDate")}
            >
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={initial?.endDate ?? ""}
              />
            </Field>
          )}
        </div>
      </div>
      <datalist id="providers">
        {providers.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <datalist id="specialties">
        {[
          "General Medicine",
          "Cardiology",
          "Endocrinology",
          "Dermatology",
          "ENT",
          "Gastroenterology",
          "Gynaecology",
          "Nephrology",
          "Neurology",
          "Oncology",
          "Ophthalmology",
          "Orthopaedics",
          "Paediatrics",
          "Psychiatry",
          "Pulmonology",
          "Dentistry",
          "Physiotherapy",
          "Ayurveda",
          "Homeopathy",
        ].map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <Field
        label={t("files.field.notes")}
        htmlFor="notes"
        optional
        error={err("notes")}
        hint={t("files.form.notesHint")}
      >
        <Textarea
          id="notes"
          name="notes"
          rows={5}
          defaultValue={initial?.notes ?? ""}
          maxLength={5000}
        />
      </Field>

      <Field
        label={t("files.field.tags")}
        htmlFor="tags"
        optional
        error={err("tags")}
        hint={t("files.form.tagsHint")}
      >
        <Input id="tags" name="tags" defaultValue={initial?.tags?.join(", ") ?? ""} />
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={initial?.id ? `/records/${initial.id}` : "/records"}>
            {t("files.common.cancel")}
          </Link>
        </Button>
        <SubmitButton pending={pending} pendingLabel={t("files.common.saving")}>
          {t(initial?.id ? "files.form.saveChanges" : "files.form.saveRecord")}
        </SubmitButton>
      </div>
    </form>
  );
}
