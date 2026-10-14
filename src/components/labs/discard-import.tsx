"use client";
import { discardImportAction } from "@/actions/labs";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { useT } from "@/i18n/client";

export function DiscardImportButton({ jobId }: { jobId: string }) {
  const t = useT();
  return (
    <ConfirmDelete
      action={discardImportAction.bind(null, jobId)}
      title={t("labs.discard.title")}
      description={t("labs.discard.description")}
      confirmLabel={t("labs.discard.button")}
      triggerLabel={t("labs.discard.button")}
      redirectTo="/labs"
      successMessage={t("labs.discard.success")}
    />
  );
}
