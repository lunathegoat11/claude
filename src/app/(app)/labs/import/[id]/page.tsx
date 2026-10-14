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
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("labs.meta.import") };
}

export default async function ImportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const t = await getT();
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
          className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
        >
          <ArrowLeft className="size-4" /> {doc.name}
        </Link>
      )}
      <PageHeader
        title={t("labs.import.title")}
        description={t("labs.import.description")}
        actions={<DiscardImportButton jobId={job.id} />}
      />
      <div className="bg-accent/40 mb-6 flex items-start gap-3 rounded-[var(--radius)] border p-4 text-sm">
        <ShieldCheck className="text-primary mt-0.5 size-5 shrink-0" />
        <p>
          {t("labs.import.notSavedBefore")} <strong>{t("labs.form.confirmSave")}</strong>
          {t("labs.import.notSavedAfter")}
          {doc && (
            <>
              {" "}
              {t("labs.import.compareBefore")}{" "}
              <a
                href={`/api/documents/${doc.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline"
              >
                {t("labs.import.compareLink")}
              </a>{" "}
              {t("labs.import.compareAfter")}
            </>
          )}
        </p>
      </div>
      {job.extractor === "ocr" && (
        <p
          role="note"
          className="border-warning/50 bg-warning/8 mb-6 rounded-[var(--radius)] border p-4 text-sm"
        >
          <strong>{t("labs.import.ocrTitle")}</strong> {t("labs.import.ocrBody")}
        </p>
      )}
      <LabPanelForm
        mode="import"
        jobId={job.id}
        documents={[]}
        providers={providers.map((p) => p.name)}
        today={toDateInputValue(new Date(), user.timezone)}
        initial={{
          name: doc?.name ?? t("labs.import.defaultName"),
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
            warnings: c.warnings,
          })),
        }}
      />
    </div>
  );
}
