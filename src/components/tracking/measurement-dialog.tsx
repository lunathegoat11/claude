"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { saveMeasurementAction } from "@/actions/tracking";
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
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { inputUnitsFor } from "@/lib/catalog/metrics";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { contextLabel, dualLabels } from "./metric-labels";

export interface MetricOption {
  id: string;
  key: string;
  name: string;
  unit: string;
  valueType: "SINGLE" | "DUAL";
  primaryLabel: string | null;
  secondaryLabel: string | null;
  decimals: number;
  contexts: string[];
}

export interface MeasurementInitial {
  id: string;
  metricId: string;
  value: string;
  value2: string;
  unit: string;
  measuredAt: string;
  context: string;
  contextNote: string;
  notes: string;
}

export function MeasurementDialog({
  metrics,
  defaultMetricKey,
  now,
  preferredUnits,
  initial,
  trigger,
  triggerVariant = "default",
  autoOpenParam,
}: {
  metrics: MetricOption[];
  defaultMetricKey?: string;
  now: string;
  preferredUnits: Record<string, string>;
  initial?: MeasurementInitial;
  trigger?: React.ReactNode;
  triggerVariant?: ButtonProps["variant"];
  autoOpenParam?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [metricId, setMetricId] = useState(
    initial?.metricId ?? metrics.find((m) => m.key === defaultMetricKey)?.id ?? metrics[0]?.id,
  );
  const metric = useMemo(
    () => metrics.find((m) => m.id === metricId) ?? metrics[0],
    [metrics, metricId],
  );
  const units = metric ? inputUnitsFor(metric.key, metric.unit) : [];
  const [context, setContext] = useState(initial?.context ?? "");
  const [showNote, setShowNote] = useState(!!initial?.notes);
  const [formKey, setFormKey] = useState(0);

  const { state, onSubmit, pending, err } = useActionForm(saveMeasurementAction, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  useEffect(() => {
    if (!autoOpenParam) return;
    if (sp.get("add") === "1") {
      const k = sp.get("metric");
      const m = k ? metrics.find((x) => x.key === k) : undefined;
      if (m) setMetricId(m.id);
      setOpen(true);
    }
  }, [sp, autoOpenParam, metrics]);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setFormKey((k) => k + 1);
      if (!initial) setContext("");
    }
    if (!o && autoOpenParam && sp.get("add")) router.replace(pathname, { scroll: false });
  }

  if (!metric) return null;
  const [label1, label2] = dualLabels(t, metric);
  const defaultUnit =
    initial?.unit ??
    (units.includes(preferredUnits[metric.key] ?? "") ? preferredUnits[metric.key] : units[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <span onClick={() => onOpenChange(true)}>{trigger}</span>
      ) : (
        <Button variant={triggerVariant} onClick={() => onOpenChange(true)}>
          <Plus /> {t("app.reading.add")}
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? t("app.reading.edit") : t("app.dash.addReading")}</DialogTitle>
          <DialogDescription>{t("app.reading.dialogBody")}</DialogDescription>
        </DialogHeader>
        <form key={formKey} onSubmit={onSubmit} className="space-y-5" noValidate>
          {initial && <input type="hidden" name="id" value={initial.id} />}
          {state.error && !state.fieldErrors && <FormError message={state.error} />}
          {!initial ? (
            <Field label={t("app.reading.measurement")} htmlFor="metricId">
              <NativeSelect
                id="metricId"
                name="metricId"
                value={metricId}
                onChange={(e) => {
                  setMetricId(e.target.value);
                  setContext("");
                }}
              >
                {metrics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <input type="hidden" name="metricId" value={metricId} />
          )}

          <div
            className={cn(
              "grid gap-3",
              metric.valueType === "DUAL" ? "grid-cols-2" : "grid-cols-[1fr_auto]",
            )}
          >
            <Field
              label={metric.valueType === "DUAL" ? label1 : t("app.reading.value")}
              htmlFor="value"
              error={err("value")}
              hint={metric.key === "blood_pressure" ? t("app.reading.top") : undefined}
            >
              <Input
                id="value"
                name="value"
                inputMode="decimal"
                autoFocus
                defaultValue={initial?.value}
                required
                aria-invalid={!!err("value")}
                className="tabular h-12 text-lg"
              />
            </Field>
            {metric.valueType === "DUAL" ? (
              <Field
                label={
                  metric.secondaryLabel || metric.key === "blood_pressure"
                    ? label2
                    : t("app.reading.secondValue")
                }
                htmlFor="value2"
                error={err("value2")}
                hint={metric.key === "blood_pressure" ? t("app.reading.bottom") : undefined}
              >
                <Input
                  id="value2"
                  name="value2"
                  inputMode="decimal"
                  defaultValue={initial?.value2}
                  required
                  aria-invalid={!!err("value2")}
                  className="tabular h-12 text-lg"
                />
              </Field>
            ) : (
              <Field label={t("app.reading.unit")} htmlFor="unit" error={err("unit")}>
                {units.length > 1 ? (
                  <NativeSelect id="unit" name="unit" defaultValue={defaultUnit} className="h-12">
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <div className="bg-muted text-muted-foreground flex h-12 items-center rounded-lg border px-3 text-sm">
                    <input type="hidden" name="unit" value={units[0]} />
                    {units[0]}
                  </div>
                )}
              </Field>
            )}
          </div>
          {metric.valueType === "DUAL" && <input type="hidden" name="unit" value={metric.unit} />}

          {metric.contexts.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                {metric.key === "blood_glucose"
                  ? t("app.reading.whenTaken")
                  : t("app.reading.context")}{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  {t("app.reading.optional")}
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {metric.contexts.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      "has-[:focus-visible]:ring-ring/30 cursor-pointer rounded-full border px-3 py-1.5 text-sm transition has-[:focus-visible]:ring-3 pointer-coarse:py-2.5",
                      context === c
                        ? "border-primary bg-accent text-accent-foreground font-medium"
                        : "hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="context"
                      value={c}
                      checked={context === c}
                      onChange={() => setContext(c)}
                      onClick={() => context === c && setContext("")}
                      className="sr-only"
                    />
                    {contextLabel(t, c)}
                  </label>
                ))}
              </div>
              {context === "CUSTOM" && (
                <Input
                  name="contextNote"
                  defaultValue={initial?.contextNote}
                  placeholder={t("app.reading.contextPh")}
                  className="mt-2"
                  aria-label={t("app.reading.customContext")}
                />
              )}
            </fieldset>
          )}

          <Field label={t("app.reading.dateTime")} htmlFor="measuredAt" error={err("measuredAt")}>
            <Input
              id="measuredAt"
              name="measuredAt"
              type="datetime-local"
              max={now}
              defaultValue={initial?.measuredAt ?? now}
              required
            />
          </Field>

          {showNote ? (
            <Field label={t("app.reading.note")} htmlFor="notes" optional>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={initial?.notes}
                placeholder={t("app.reading.notePh")}
              />
            </Field>
          ) : (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="text-primary -my-2 py-2 text-sm font-medium pointer-coarse:py-3"
            >
              {t("app.reading.addNote")}
            </button>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("app.cancel")}
            </Button>
            <SubmitButton pending={pending} pendingLabel={t("app.reading.saving")}>
              {initial ? t("app.reading.saveChanges") : t("app.reading.save")}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
