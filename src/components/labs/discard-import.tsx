"use client";
import { discardImportAction } from "@/actions/labs";
import { ConfirmDelete } from "@/components/forms/confirm-delete";

export function DiscardImportButton({ jobId }: { jobId: string }) {
  return (
    <ConfirmDelete
      action={discardImportAction.bind(null, jobId)}
      title="Discard these values?"
      description="The extracted values will be thrown away. The uploaded document itself is kept."
      confirmLabel="Discard"
      triggerLabel="Discard"
      redirectTo="/labs"
      successMessage="Extracted values discarded"
    />
  );
}
