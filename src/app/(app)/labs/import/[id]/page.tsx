import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getImportJob } from "@/server/services/imports";
import { listProviderNames } from "@/server/services/providers";
import { or404 } from "@/server/page-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LabPanelForm } from "@/components/labs/lab-panel-form";
import { DiscardImportButton } from "@/components/labs/discard-import";
import { toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Review imported values" };

export default async function ImportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const job = await or404(id, (i) => getImportJob(user.id, i));
  if (job.status !== "AWAITING_REVIEW") redirect("/labs");
  const providers = await listProviderNames(user.id);
  const doc = job.document;

  return (
    <div className="mx-auto max-w-4xl">
      {doc && (
        <Link
          href={`/documents/${doc.id}`}
          className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> {doc.name}
        </Link>
      )}
      <PageHeader
        title="Review values from your report"
        description="These values were read automatically and may contain mistakes. Check each one against the original report, correct anything that's wrong, and untick values you don't want to save."
        actions={<DiscardImportButton jobId={job.id} />}
      />
      <div className="bg-accent/40 mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm">
        <ShieldCheck className="text-primary mt-0.5 size-5 shrink-0" />
        <p>
          Nothing has been saved yet. Values are only added to your lab history after you press{" "}
          <strong>Confirm &amp; save values</strong>.
          {doc && (
            <>
              {" "}
              You can{" "}
              <a
                href={`/api/documents/${doc.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline"
              >
                open the original report
              </a>{" "}
              in a new tab to compare.
            </>
          )}
        </p>
      </div>
      <LabPanelForm
        mode="import"
        jobId={job.id}
        documents={[]}
        providers={providers.map((p) => p.name)}
        today={toDateInputValue(new Date(), user.timezone)}
        initial={{
          name: doc?.name ?? "Imported lab report",
          collectedAt:
            job.meta.collectedAt ??
            (doc?.documentDate
              ? toDateInputValue(doc.documentDate, user.timezone)
              : toDateInputValue(new Date(), user.timezone)),
          labName: job.meta.labName ?? doc?.providerName ?? "",
          results: job.candidates.map((c) => ({
            testName: c.testName,
            biomarkerCode: c.biomarkerCode ?? "",
            value: c.value,
            unit: c.unit ?? "",
            refLow: c.refLow !== null ? String(c.refLow) : "",
            refHigh: c.refHigh !== null ? String(c.refHigh) : "",
            refText: c.refText ?? "",
            labFlag: c.labFlag ?? "",
            notes: "",
            confidence: c.confidence,
            sourceLine: c.sourceLine,
          })),
        }}
      />
    </div>
  );
}
