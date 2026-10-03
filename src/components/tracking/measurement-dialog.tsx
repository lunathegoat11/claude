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
import { CONTEXT_LABELS, inputUnitsFor } from "@/lib/catalog/metrics";
import { cn } from "@/lib/utils";

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
  const defaultUnit =
    initial?.unit ??
    (units.includes(preferredUnits[metric.key] ?? "") ? preferredUnits[metric.key] : units[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <span onClick={() => onOpenChange(true)}>{trigger}</span>
      ) : (
        <Button variant={triggerVariant} onClick={() => onOpenChange(true)}>
          <Plus /> Add reading
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit reading" : "Add a reading"}</DialogTitle>
          <DialogDescription>
            Record a measurement you took at home or at a clinic.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} onSubmit={onSubmit} className="space-y-5" noValidate>
          {initial && <input type="hidden" name="id" value={initial.id} />}
          {state.error && !state.fieldErrors && <FormError message={state.error} />}
          {!initial ? (
            <Field label="Measurement" htmlFor="metricId">
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
              label={metric.valueType === "DUAL" ? (metric.primaryLabel ?? "Value") : "Value"}
              htmlFor="value"
              error={err("value")}
              hint={metric.key === "blood_pressure" ? "Top number" : undefined}
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
                label={metric.secondaryLabel ?? "Second value"}
                htmlFor="value2"
                error={err("value2")}
                hint={metric.key === "blood_pressure" ? "Bottom number" : undefined}
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
              <Field label="Unit" htmlFor="unit" error={err("unit")}>
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
                {metric.key === "blood_glucose" ? "When was this taken?" : "Context"}{" "}
                <span className="text-muted-foreground text-xs font-normal">Optional</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {metric.contexts.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      "has-[:focus-visible]:ring-ring/30 cursor-pointer rounded-full border px-3 py-1.5 text-sm transition has-[:focus-visible]:ring-3",
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
                    {CONTEXT_LABELS[c] ?? c}
                  </label>
                ))}
              </div>
              {context === "CUSTOM" && (
                <Input
                  name="contextNote"
                  defaultValue={initial?.contextNote}
                  placeholder="Describe the context, e.g. after evening walk"
                  className="mt-2"
                  aria-label="Custom context"
                />
              )}
            </fieldset>
          )}

          <Field label="Date & time" htmlFor="measuredAt" error={err("measuredAt")}>
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
            <Field label="Note" htmlFor="notes" optional>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={initial?.notes}
                placeholder="e.g. Felt dizzy, after a heavy lunch"
              />
            </Field>
          ) : (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="text-primary text-sm font-medium"
            >
              + Add a note
            </button>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pending={pending} pendingLabel="Saving…">
              {initial ? "Save changes" : "Save reading"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
