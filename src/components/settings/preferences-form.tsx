"use client";
import { updatePreferencesAction } from "@/actions/settings";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormSection } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { NativeSelect } from "@/components/ui/input";
import { ThemeSegmented } from "@/components/shared/theme-toggle";

export function PreferencesForm({
  values,
}: {
  values: { glucoseUnit: string; weightUnit: string; temperatureUnit: string };
}) {
  const { onSubmit, pending } = useActionForm(updatePreferencesAction);
  return (
    <div className="space-y-8">
      <FormSection title="Appearance">
        <ThemeSegmented />
      </FormSection>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormSection
          title="Units"
          description="Readings are stored precisely and converted for display. Lab results always keep the unit printed on the report."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Blood glucose" htmlFor="glucoseUnit">
              <NativeSelect id="glucoseUnit" name="glucoseUnit" defaultValue={values.glucoseUnit}>
                <option value="MG_DL">mg/dL (common in India)</option>
                <option value="MMOL_L">mmol/L</option>
              </NativeSelect>
            </Field>
            <Field label="Weight" htmlFor="weightUnit">
              <NativeSelect id="weightUnit" name="weightUnit" defaultValue={values.weightUnit}>
                <option value="KG">Kilograms (kg)</option>
                <option value="LB">Pounds (lb)</option>
              </NativeSelect>
            </Field>
            <Field label="Temperature" htmlFor="temperatureUnit">
              <NativeSelect
                id="temperatureUnit"
                name="temperatureUnit"
                defaultValue={values.temperatureUnit}
              >
                <option value="F">Fahrenheit (°F)</option>
                <option value="C">Celsius (°C)</option>
              </NativeSelect>
            </Field>
          </div>
        </FormSection>
        <p className="text-muted-foreground text-sm">
          Dates are shown as day-month-year in Indian Standard Time (IST).
        </p>
        <div className="flex justify-end border-t pt-5">
          <SubmitButton pending={pending} pendingLabel="Saving…">
            Save preferences
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
