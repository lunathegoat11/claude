"use client";
import { updateProfileAction } from "@/actions/settings";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError, FormSection } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input, NativeSelect } from "@/components/ui/input";
import { BLOOD_GROUP_LABELS, SEX_LABELS } from "@/lib/catalog/labels";
import { INDIAN_STATES, MAJOR_CITIES } from "@/lib/india";

export interface ProfileValues {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  phone: string;
  city: string;
  state: string;
  bloodGroup: string;
  heightCm: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

export function ProfileForm({
  values,
  email,
  today,
}: {
  values: ProfileValues;
  email: string;
  today: string;
}) {
  const { state, onSubmit, pending, err } = useActionForm(updateProfileAction);
  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      <FormSection
        title="About you"
        description="Everything except your name is optional. Only add what's useful to you."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" error={err("fullName")}>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={values.fullName}
              autoComplete="name"
              required
            />
          </Field>
          <Field label="Email" htmlFor="email" hint="Used to sign in">
            <Input id="email" value={email} disabled />
          </Field>
          <Field label="Date of birth" htmlFor="dateOfBirth" optional error={err("dateOfBirth")}>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              max={today}
              defaultValue={values.dateOfBirth}
              autoComplete="bday"
            />
          </Field>
          <Field label="Sex" htmlFor="sex" optional hint="Lab reference ranges often depend on it">
            <NativeSelect id="sex" name="sex" defaultValue={values.sex}>
              <option value="">Not specified</option>
              {Object.entries(SEX_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Blood group" htmlFor="bloodGroup" optional>
            <NativeSelect id="bloodGroup" name="bloodGroup" defaultValue={values.bloodGroup}>
              <option value="">Not specified</option>
              {Object.entries(BLOOD_GROUP_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Height (cm)" htmlFor="heightCm" optional error={err("heightCm")}>
            <Input
              id="heightCm"
              name="heightCm"
              inputMode="decimal"
              defaultValue={values.heightCm}
            />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Mobile number"
            htmlFor="phone"
            optional
            error={err("phone")}
            hint="Indian number, e.g. +91 98765 43210"
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={values.phone}
              placeholder="+91"
            />
          </Field>
          <Field label="City" htmlFor="city" optional>
            <Input
              id="city"
              name="city"
              list="cities"
              defaultValue={values.city}
              autoComplete="address-level2"
            />
            <datalist id="cities">
              {MAJOR_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="State / UT" htmlFor="state" optional>
            <NativeSelect id="state" name="state" defaultValue={values.state}>
              <option value="">Not specified</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </FormSection>
      <FormSection
        title="Emergency contact"
        description="Someone who could be contacted on your behalf."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="emergencyContactName" optional>
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={values.emergencyContactName}
            />
          </Field>
          <Field label="Relationship" htmlFor="emergencyContactRelation" optional>
            <Input
              id="emergencyContactRelation"
              name="emergencyContactRelation"
              defaultValue={values.emergencyContactRelation}
              placeholder="e.g. Spouse"
            />
          </Field>
          <Field
            label="Phone"
            htmlFor="emergencyContactPhone"
            optional
            error={err("emergencyContactPhone")}
          >
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              inputMode="tel"
              defaultValue={values.emergencyContactPhone}
              placeholder="+91"
            />
          </Field>
        </div>
      </FormSection>
      <div className="flex justify-end border-t pt-5">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}
