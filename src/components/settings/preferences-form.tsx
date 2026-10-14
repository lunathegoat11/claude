"use client";
import { updatePreferencesAction } from "@/actions/settings";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormSection } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { NativeSelect } from "@/components/ui/input";
import { LanguageSwitch } from "@/components/shared/language-switch";
import { ThemeSegmented, TransparencySwitch } from "@/components/shared/theme-toggle";
import { useT } from "@/i18n/client";

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
  const t = useT();
  const { onSubmit, pending } = useActionForm(updatePreferencesAction);
  return (
    <div className="space-y-8">
      <FormSection title={t("account.prefs.appearance")}>
        <div className="space-y-5">
          <LanguageSwitch />
          <ThemeSegmented />
          <TransparencySwitch />
        </div>
      </FormSection>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormSection title={t("account.prefs.units")} description={t("account.prefs.units.desc")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("account.prefs.glucose")} htmlFor="glucoseUnit">
              <NativeSelect id="glucoseUnit" name="glucoseUnit" defaultValue={values.glucoseUnit}>
                <option value="MG_DL">{t("account.prefs.glucose.mgdl")}</option>
                <option value="MMOL_L">mmol/L</option>
              </NativeSelect>
            </Field>
            <Field label={t("account.prefs.weight")} htmlFor="weightUnit">
              <NativeSelect id="weightUnit" name="weightUnit" defaultValue={values.weightUnit}>
                <option value="KG">{t("account.prefs.weight.kg")}</option>
                <option value="LB">{t("account.prefs.weight.lb")}</option>
              </NativeSelect>
            </Field>
            <Field label={t("account.prefs.temp")} htmlFor="temperatureUnit">
              <NativeSelect
                id="temperatureUnit"
                name="temperatureUnit"
                defaultValue={values.temperatureUnit}
              >
                <option value="F">{t("account.prefs.temp.f")}</option>
                <option value="C">{t("account.prefs.temp.c")}</option>
              </NativeSelect>
            </Field>
          </div>
        </FormSection>
        <FormSection title={t("account.prefs.ranges")} description={t("account.prefs.ranges.desc")}>
          <Field
            label={t("account.prefs.rangesToUse")}
            htmlFor="rangeRegion"
            hint={t("account.prefs.ranges.hint")}
          >
            <NativeSelect id="rangeRegion" name="rangeRegion" defaultValue={values.rangeRegion}>
              <option value="AUTO">
                {t("account.prefs.auto", {
                  region: t(
                    values.autoRegion === "INDIA"
                      ? "account.prefs.auto.indian"
                      : "account.prefs.auto.international",
                  ),
                })}
              </option>
              <option value="INDIA">{t("account.prefs.indian")}</option>
              <option value="INTERNATIONAL">{t("account.prefs.international")}</option>
            </NativeSelect>
          </Field>
        </FormSection>
        <p className="text-muted-foreground text-sm">{t("account.prefs.dates")}</p>
        <div className="flex justify-end border-t pt-5">
          <SubmitButton pending={pending} pendingLabel={t("account.saving")}>
            {t("account.prefs.save")}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
