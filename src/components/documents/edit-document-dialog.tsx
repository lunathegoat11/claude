"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateDocumentAction } from "@/actions/documents";
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
import { useT } from "@/i18n/client";
import { DOCUMENT_TYPE_KEYS } from "@/i18n/messages/files-labels";
import { DOCUMENT_TYPES } from "@/lib/validation/health";

export function EditDocumentDialog({
  doc,
  records,
}: {
  doc: {
    id: string;
    name: string;
    type: string;
    documentDate: string;
    providerName: string | null;
    notes: string | null;
    tags: string[];
    recordId: string | null;
  };
  records: { id: string; title: string }[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending, err } = useActionForm(updateDocumentAction, {
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> {t("files.edit.button")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("files.edit.title")}</DialogTitle>
          <DialogDescription>{t("files.edit.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={doc.id} />
          {state.error && !state.fieldErrors && <FormError message={state.error} />}
          <Field label={t("files.field.name")} htmlFor="e-name" error={err("name")}>
            <Input id="e-name" name="name" defaultValue={doc.name} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("files.field.type")} htmlFor="e-type" error={err("type")}>
              <NativeSelect id="e-type" name="type" defaultValue={doc.type}>
                {DOCUMENT_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {t(DOCUMENT_TYPE_KEYS[d])}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label={t("files.field.documentDate")}
              htmlFor="e-date"
              optional
              error={err("documentDate")}
            >
              <Input id="e-date" name="documentDate" type="date" defaultValue={doc.documentDate} />
            </Field>
          </div>
          <Field label={t("files.field.provider")} htmlFor="e-provider" optional>
            <Input id="e-provider" name="providerName" defaultValue={doc.providerName ?? ""} />
          </Field>
          <Field label={t("files.field.attachRecord")} htmlFor="e-record" optional>
            <NativeSelect id="e-record" name="recordId" defaultValue={doc.recordId ?? ""}>
              <option value="">{t("files.common.none")}</option>
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label={t("files.field.tags")}
            htmlFor="e-tags"
            optional
            hint={t("files.field.tagsHint")}
          >
            <Input id="e-tags" name="tags" defaultValue={doc.tags.join(", ")} />
          </Field>
          <Field label={t("files.field.notes")} htmlFor="e-notes" optional>
            <Textarea id="e-notes" name="notes" defaultValue={doc.notes ?? ""} rows={3} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("files.common.cancel")}
            </Button>
            <SubmitButton pending={pending} pendingLabel={t("files.common.saving")}>
              {t("files.common.save")}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
