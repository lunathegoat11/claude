import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { getLabPanel } from "@/server/services/labs";
import { listDocumentOptions } from "@/server/services/documents";
import { listProviderNames } from "@/server/services/providers";
import { or404 } from "@/server/page-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LabPanelForm } from "@/components/labs/lab-panel-form";
import { toDateInputValue } from "@/lib/format";
import { toNum } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit lab report" };

export default async function EditLabPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const panel = await or404(id, (i) => getLabPanel(user.id, i));
  const [documents, providers] = await Promise.all([
    listDocumentOptions(user.id),
    listProviderNames(user.id),
  ]);
  const tz = user.timezone;
  const s = (n: unknown) => (toNum(n) === null ? "" : String(toNum(n)));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Edit lab report" description={panel.name} />
      <LabPanelForm
        mode="edit"
        panelId={panel.id}
        documents={documents.map((d) => ({ id: d.id, name: d.name }))}
        providers={providers.map((p) => p.name)}
        today={toDateInputValue(new Date(), tz)}
        initial={{
          name: panel.name,
          collectedAt: toDateInputValue(panel.collectedAt, tz),
          labName: panel.labName ?? "",
          notes: panel.notes ?? "",
          documentId: panel.documentId ?? "",
          results: panel.results.map((r) => ({
            testName: r.testName,
            biomarkerCode: r.biomarkerCode ?? "",
            value: r.valueText ?? s(r.valueNumeric),
            unit: r.unit ?? "",
            refLow: s(r.refLow),
            refHigh: s(r.refHigh),
            refText: r.refText ?? "",
            labFlag: "",
            notes: r.notes ?? "",
          })),
        }}
      />
    </div>
  );
}
