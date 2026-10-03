"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { createMetricAction } from "@/actions/tracking";
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
import { Input, NativeSelect } from "@/components/ui/input";

export function CustomMetricDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { state, onSubmit, pending, err } = useActionForm<{ key: string }>(createMetricAction, {
    onSuccess: (s) => {
      setOpen(false);
      if (s.data) router.push(`/tracking/${s.data.key}?empty=1`);
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SlidersHorizontal /> Custom measurement
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track something else</DialogTitle>
          <DialogDescription>
            Create your own measurement, such as waist size, peak flow or water intake.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {state.error && !state.fieldErrors && <FormError message={state.error} />}
          <Field label="Name" htmlFor="cm-name" error={err("name")}>
            <Input id="cm-name" name="name" placeholder="e.g. Waist circumference" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit" htmlFor="cm-unit" error={err("unit")}>
              <Input id="cm-unit" name="unit" placeholder="e.g. cm" required />
            </Field>
            <Field label="Decimal places" htmlFor="cm-dec">
              <NativeSelect id="cm-dec" name="decimals" defaultValue="1">
                {[0, 1, 2, 3].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lowest plausible value" htmlFor="cm-min" optional error={err("minValue")}>
              <Input id="cm-min" name="minValue" inputMode="decimal" />
            </Field>
            <Field
              label="Highest plausible value"
              htmlFor="cm-max"
              optional
              error={err("maxValue")}
            >
              <Input id="cm-max" name="maxValue" inputMode="decimal" />
            </Field>
          </div>
          <p className="text-muted-foreground text-xs">
            Plausible values only help catch typing mistakes. They are not medical targets.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pending={pending} pendingLabel="Creating…">
              Create
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
