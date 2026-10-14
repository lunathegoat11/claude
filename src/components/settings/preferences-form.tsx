"use client";
import { updatePreferencesAction } from "@/actions/settings";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormSection } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { NativeSelect } from "@/components/ui/input";
import { LanguageSwitch } from "@/components/shared/language-switch";
import { ThemeSegmented, TransparencySwitch } from "@/components/shared/theme-toggle";

export function PreferencesForm({
  values,
}: {
  values: {
    glucoseUnit: string;
    weightUnit: string;
    temperatureUnit: string;
    rangeRegion: string;
    /** Where the phone's time zone puts the person: "INDIA" or "INTERNATIONAL". */
    autoRegion: string;
  };
}) {
  const { onSubmit, pending } = useActionForm(updatePreferencesAction);
  return (
    <div className="space-y-8">
      <FormSection title="Appearance">
        <div className="space-y-5">
          <LanguageSwitch />
          <ThemeSegmented />
          <TransparencySwitch />
        </div>
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
        <FormSection
          title="Reference ranges"
          description="The ranges your lab results are marked High or Low against."
        >
          <Field
            label="Ranges to use"
            htmlFor="rangeRegion"
            hint="Automatic uses Indian ranges when your phone is set to India's time zone. Indian: the range printed on your report, or India's national range (ICMR, Health Ministry) when there isn't one. International: standard ranges from the US National Institutes of Health (NIH)."
          >
            <NativeSelect id="rangeRegion" name="rangeRegion" defaultValue={values.rangeRegion}>
              <option value="AUTO">
                Automatic: {values.autoRegion === "INDIA" ? "Indian" : "international"}
              </option>
              <option value="INDIA">Indian</option>
              <option value="INTERNATIONAL">International (US NIH)</option>
            </NativeSelect>
          </Field>
        </FormSection>
        <p className="text-muted-foreground text-sm">
          Dates are shown as day-month-year, in your phone&rsquo;s time zone.
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
