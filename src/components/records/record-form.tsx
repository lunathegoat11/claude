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
import { RECORD_TYPE_LABELS } from "@/lib/catalog/labels";
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

const TITLE_HINTS: Record<string, string> = {
  DOCTOR_VISIT: "e.g. Consultation with cardiologist",
  DIAGNOSIS: "e.g. Type 2 diabetes diagnosed",
  PROCEDURE: "e.g. Cataract surgery, right eye",
  HOSPITALIZATION: "e.g. Admitted for pneumonia",
  PRESCRIPTION: "e.g. Antibiotics for throat infection",
  VACCINATION: "e.g. Hepatitis B, dose 2",
  ALLERGY: "e.g. Allergy to sulfa drugs",
  CONDITION: "e.g. Asthma",
  FAMILY_HISTORY: "e.g. Mother — high blood pressure",
  OTHER: "Give this record a short title",
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
        <legend className="mb-2 text-sm font-medium">What kind of record is this?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {RECORD_TYPES.map((t) => (
            <label
              key={t}
              className={cn(
                "has-[:focus-visible]:ring-ring/30 flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-center text-[13px] font-medium transition has-[:focus-visible]:ring-3",
                type === t ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              {RECORD_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        {err("type") && <p className="text-destructive text-[13px]">{err("type")![0]}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Title" htmlFor="title" error={err("title")}>
          <Input
            id="title"
            name="title"
            defaultValue={initial?.title}
            placeholder={TITLE_HINTS[type]}
            required
            aria-invalid={!!err("title")}
            maxLength={200}
          />
        </Field>
        <Field label="Date" htmlFor="date" error={err("date")}>
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

      <div className="rounded-2xl border">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        >
          Doctor & hospital details
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              showDetails && "rotate-180",
            )}
          />
        </button>
        <div className={cn("grid gap-4 border-t p-4 sm:grid-cols-2", !showDetails && "hidden")}>
          <Field label="Doctor" htmlFor="doctorName" optional error={err("doctorName")}>
            <Input
              id="doctorName"
              name="doctorName"
              defaultValue={initial?.doctorName ?? ""}
              placeholder="Dr. …"
            />
          </Field>
          <Field label="Specialty" htmlFor="specialty" optional error={err("specialty")}>
            <Input
              id="specialty"
              name="specialty"
              list="specialties"
              defaultValue={initial?.specialty ?? ""}
              placeholder="e.g. Cardiology"
            />
          </Field>
          <Field
            label="Hospital / clinic"
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
              placeholder="e.g. City Hospital, Jaipur"
            />
          </Field>
          {(type === "HOSPITALIZATION" || type === "PRESCRIPTION" || initial?.endDate) && (
            <Field
              label={type === "HOSPITALIZATION" ? "Discharge date" : "End date"}
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
        label="Notes"
        htmlFor="notes"
        optional
        error={err("notes")}
        hint="What happened, what the doctor said, any follow-up advised."
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
        label="Tags"
        htmlFor="tags"
        optional
        error={err("tags")}
        hint="Separate with commas, e.g. diabetes, follow-up"
      >
        <Input id="tags" name="tags" defaultValue={initial?.tags?.join(", ") ?? ""} />
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={initial?.id ? `/records/${initial.id}` : "/records"}>Cancel</Link>
        </Button>
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {initial?.id ? "Save changes" : "Save record"}
        </SubmitButton>
      </div>
    </form>
  );
}
