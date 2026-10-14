"use client";
import { updateProfileAction } from "@/actions/settings";
import { useActionForm } from "@/components/forms/use-action-form";
import { Field, FormError, FormSection } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input, NativeSelect } from "@/components/ui/input";
import { BLOOD_GROUP_LABELS } from "@/lib/catalog/labels";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { INDIAN_STATES, MAJOR_CITIES } from "@/lib/india";

const SEX_KEYS: Record<string, MessageKey> = {
  FEMALE: "account.sex.FEMALE",
  MALE: "account.sex.MALE",
  INTERSEX: "account.sex.INTERSEX",
  PREFER_NOT_TO_SAY: "account.sex.PREFER_NOT_TO_SAY",
};

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
  const t = useT();
  const { state, onSubmit, pending, err } = useActionForm(updateProfileAction);
  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {state.error && !state.fieldErrors && <FormError message={state.error} />}
      <FormSection title={t("account.profile.about")} description={t("account.profile.about.desc")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("account.profile.fullName")} htmlFor="fullName" error={err("fullName")}>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={values.fullName}
              autoComplete="name"
              required
            />
          </Field>
          <Field label={t("account.email")} htmlFor="email" hint={t("account.profile.emailHint")}>
            <Input id="email" value={email} disabled />
          </Field>
          <Field
            label={t("account.profile.dob")}
            htmlFor="dateOfBirth"
            optional
            error={err("dateOfBirth")}
          >
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              max={today}
              defaultValue={values.dateOfBirth}
              autoComplete="bday"
            />
          </Field>
          <Field
            label={t("account.profile.sex")}
            htmlFor="sex"
            optional
            hint={t("account.profile.sexHint")}
          >
            <NativeSelect id="sex" name="sex" defaultValue={values.sex}>
              <option value="">{t("account.profile.notSpecified")}</option>
              {Object.entries(SEX_KEYS).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("account.profile.bloodGroup")} htmlFor="bloodGroup" optional>
            <NativeSelect id="bloodGroup" name="bloodGroup" defaultValue={values.bloodGroup}>
              <option value="">{t("account.profile.notSpecified")}</option>
              {Object.entries(BLOOD_GROUP_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {k === "UNKNOWN" ? t("account.profile.bloodUnknown") : v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label={t("account.profile.height")}
            htmlFor="heightCm"
            optional
            error={err("heightCm")}
          >
            <Input
              id="heightCm"
              name="heightCm"
              inputMode="decimal"
              defaultValue={values.heightCm}
            />
          </Field>
        </div>
      </FormSection>
      <FormSection title={t("account.profile.contact")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("account.profile.mobile")}
            htmlFor="phone"
            optional
            error={err("phone")}
            hint={t("account.profile.mobileHint")}
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
          <Field label={t("account.profile.city")} htmlFor="city" optional>
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
          <Field label={t("account.profile.state")} htmlFor="state" optional>
            <NativeSelect id="state" name="state" defaultValue={values.state}>
              <option value="">{t("account.profile.notSpecified")}</option>
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
        title={t("account.profile.emergency")}
        description={t("account.profile.emergency.desc")}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("account.profile.name")} htmlFor="emergencyContactName" optional>
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={values.emergencyContactName}
            />
          </Field>
          <Field label={t("account.profile.relation")} htmlFor="emergencyContactRelation" optional>
            <Input
              id="emergencyContactRelation"
              name="emergencyContactRelation"
              defaultValue={values.emergencyContactRelation}
              placeholder={t("account.profile.relation.ph")}
            />
          </Field>
          <Field
            label={t("account.profile.phone")}
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
        <SubmitButton pending={pending} pendingLabel={t("account.saving")}>
          {t("account.profile.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
