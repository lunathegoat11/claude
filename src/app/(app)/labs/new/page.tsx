import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listDocumentOptions } from "@/server/services/documents";
import { listProviderNames } from "@/server/services/providers";
import { PageHeader } from "@/components/shared/page-header";
import { LabPanelForm } from "@/components/labs/lab-panel-form";
import { toDateInputValue } from "@/lib/format";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("labs.meta.new") };
}

export default async function NewLabPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const user = await requireUser();
  const t = await getT();
  const { documentId } = await searchParams;
  const [documents, providers] = await Promise.all([
    listDocumentOptions(user.id),
    listProviderNames(user.id),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("labs.new.title")} description={t("labs.new.description")} />
      <LabPanelForm
        mode="create"
        initial={{ documentId: documents.some((d) => d.id === documentId) ? documentId : "" }}
        documents={documents.map((d) => ({ id: d.id, name: d.name }))}
        providers={providers
          .filter((p) => p.type === "LABORATORY" || p.type === "HOSPITAL")
          .map((p) => p.name)}
        today={toDateInputValue(new Date(), user.timezone)}
      />
    </div>
  );
}
