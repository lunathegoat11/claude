"use client";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveHealthItemAction } from "@/actions/settings";
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
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { CONDITION_STATUS_LABELS, SEVERITY_LABELS } from "@/lib/catalog/labels";

type Kind = "medication" | "allergy" | "condition";
const TITLES: Record<Kind, string> = {
  medication: "medication",
  allergy: "allergy",
  condition: "condition",
};

export function HealthItemDialog({
  kind,
  initial,
}: {
  kind: Kind;
  initial?: Record<string, string | boolean | null>;
}) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending, err } = useActionForm(saveHealthItemAction, {
    onSuccess: () => setOpen(false),
  });
  const v = (k: string) => (initial?.[k] as string | null | undefined) ?? "";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {initial ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label={`Edit ${TITLES[kind]}`}
        >
          <Pencil className="text-muted-foreground" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus /> Add {TITLES[kind]}
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit" : "Add"} {TITLES[kind]}
          </DialogTitle>
          <DialogDescription>
            {kind === "medication"
              ? "Record medicines as written on your prescription. Kosha never suggests doses."
              : "This appears in your health summary."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <input type="hidden" name="kind" value={kind} />
          {initial?.id && <input type="hidden" name="id" value={String(initial.id)} />}
          {state.error && !state.fieldErrors && <FormError message={state.error} />}
          {kind === "medication" && (
            <>
              <Field label="Medicine name" htmlFor="h-name" error={err("name")}>
                <Input
                  id="h-name"
                  name="name"
                  defaultValue={v("name")}
                  placeholder="e.g. Metformin"
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Strength / dose (as prescribed)" htmlFor="h-dosage" optional>
                  <Input
                    id="h-dosage"
                    name="dosage"
                    defaultValue={v("dosage")}
                    placeholder="e.g. 500 mg"
                  />
                </Field>
                <Field label="How often" htmlFor="h-freq" optional>
                  <Input
                    id="h-freq"
                    name="frequency"
                    defaultValue={v("frequency")}
                    placeholder="e.g. Twice daily after meals"
                  />
                </Field>
                <Field label="Started" htmlFor="h-start" optional error={err("startDate")}>
                  <Input id="h-start" name="startDate" type="date" defaultValue={v("startDate")} />
                </Field>
                <Field label="Stopped" htmlFor="h-end" optional error={err("endDate")}>
                  <Input id="h-end" name="endDate" type="date" defaultValue={v("endDate")} />
                </Field>
              </div>
              <Field label="Prescribed by" htmlFor="h-by" optional>
                <Input id="h-by" name="prescribedBy" defaultValue={v("prescribedBy")} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={initial ? !!initial.active : true}
                  className="size-4 accent-[var(--primary)]"
                />{" "}
                I&apos;m currently taking this
              </label>
            </>
          )}
          {kind === "allergy" && (
            <>
              <Field label="Allergic to" htmlFor="h-allergen" error={err("allergen")}>
                <Input
                  id="h-allergen"
                  name="allergen"
                  defaultValue={v("allergen")}
                  placeholder="e.g. Penicillin, peanuts"
                  required
                />
              </Field>
              <Field label="Reaction" htmlFor="h-reaction" optional>
                <Input
                  id="h-reaction"
                  name="reaction"
                  defaultValue={v("reaction")}
                  placeholder="e.g. Rash, swelling"
                />
              </Field>
              <Field label="Severity" htmlFor="h-sev">
                <NativeSelect id="h-sev" name="severity" defaultValue={v("severity") || "UNKNOWN"}>
                  {Object.entries(SEVERITY_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          )}
          {kind === "condition" && (
            <>
              <Field label="Condition" htmlFor="h-cond" error={err("name")}>
                <Input
                  id="h-cond"
                  name="name"
                  defaultValue={v("name")}
                  placeholder="e.g. Asthma"
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status" htmlFor="h-status">
                  <NativeSelect id="h-status" name="status" defaultValue={v("status") || "ACTIVE"}>
                    {Object.entries(CONDITION_STATUS_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Diagnosed on" htmlFor="h-dx" optional error={err("diagnosedOn")}>
                  <Input id="h-dx" name="diagnosedOn" type="date" defaultValue={v("diagnosedOn")} />
                </Field>
              </div>
            </>
          )}
          <Field label="Notes" htmlFor="h-notes" optional>
            <Textarea id="h-notes" name="notes" rows={2} defaultValue={v("notes")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pending={pending} pendingLabel="Saving…">
              Save
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
