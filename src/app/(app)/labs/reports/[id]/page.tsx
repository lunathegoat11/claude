import { ledgerRange } from "@/lib/lab-range";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getLabPanel, getPreviousResults, seriesKey } from "@/server/services/labs";
import { or404 } from "@/server/page-utils";
import { deleteLabPanelAction } from "@/actions/labs";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { ResultLedger } from "@/components/labs/result-ledger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS } from "@/lib/catalog/labels";
import { formatDate, formatNumber } from "@/lib/format";
import { toNum } from "@/lib/utils";

export const metadata: Metadata = { title: "Lab report" };

export default async function LabReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const justSaved = (await searchParams).new === "1";
  const panel = await or404(id, (i) => getLabPanel(user.id, i));
  const prev = await getPreviousResults(user.id, panel);
  const tz = user.timezone;
  const flagged = panel.results.filter((r) => ["HIGH", "LOW", "ABNORMAL"].includes(r.flag)).length;
  const imported = panel.source === "PDF_IMPORT" || panel.source === "IMAGE_IMPORT";
  const toCheck = imported ? panel.results.filter((r) => r.notes).length : 0;
  const sourceDoc = panel.document && !panel.document.deletedAt ? panel.document : null;

  return (
    <div>
      <Link
        href="/labs?tab=reports"
        className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
      >
        <ArrowLeft className="size-4" /> Lab results
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold sm:text-[2.5rem]">{panel.name}</h1>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-[15px]">
            {formatDate(panel.collectedAt, tz)}
            {panel.labName && `, ${panel.labName}`}
            {panel.isDemo && <Badge variant="demo">Sample data</Badge>}
          </p>
          <p className="mt-2 text-[15px]">
            {panel.results.length} results.{" "}
            {flagged
              ? `${flagged} outside the normal range.`
              : "All within the normal range, or no range available."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {panel.document && !panel.document.deletedAt && (
            <Button asChild variant="outline">
              <Link href={`/documents/${panel.document.id}`}>
                <FileText /> Original report
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/labs/reports/${panel.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <ConfirmDelete
            action={deleteLabPanelAction.bind(null, panel.id)}
            title="Delete this lab report?"
            description="All results in this report will be removed from your lab history and timeline."
            redirectTo="/labs?tab=reports"
            iconOnly
            triggerLabel="Delete report"
          />
        </div>
      </div>

      {imported && (justSaved || toCheck > 0) && (
        <div
          role="status"
          className="bg-accent/60 text-accent-foreground mb-5 rounded-md border px-4 py-3 text-sm"
        >
          <p className="font-medium">
            {justSaved ? `Saved ${panel.results.length} results` : "Read automatically"}
            {sourceDoc ? (
              <>
                {" "}
                from{" "}
                <Link href={`/documents/${sourceDoc.id}`} className="underline underline-offset-2">
                  {sourceDoc.name}
                </Link>
              </>
            ) : null}
            , dated {formatDate(panel.collectedAt, tz)}.
          </p>
          <p className="mt-1 opacity-80">
            {toCheck
              ? `${toCheck} value${toCheck === 1 ? " is" : "s are"} marked to check against the original. `
              : ""}
            If anything looks different from the report, tap Edit to correct it.
          </p>
        </div>
      )}

      <div className="surface">
        <ResultLedger
          label={`Results for ${panel.name}`}
          results={panel.results.map((r) => {
            const p = prev.get(seriesKey(r));
            const pv = p ? toNum(p.valueNumeric) : null;
            return {
              id: r.id,
              testName: r.testName,
              href: `/labs/tests/${encodeURIComponent(seriesKey(r))}`,
              value: toNum(r.valueNumeric),
              valueText: r.valueText,
              unit: r.unit,
              ...ledgerRange(r),
              flag: r.flag,
              notes: r.notes,
              previous: p
                ? `${pv !== null ? formatNumber(pv, 2) : (p.valueText ?? "")}${p.unit && p.unit !== r.unit ? ` ${p.unit}` : ""} on ${formatDate(p.observedAt, tz)}`
                : null,
            };
          })}
        />
      </div>
      <div className="text-muted-foreground mt-4 space-y-1 text-[13px]">
        <p>
          Status compares each value with a standard adult range from a US government health source
          (named next to each result; mostly MedlinePlus, part of the NIH). Where there is none, the
          range printed on this report is used. Labs&rsquo; methods differ, so the range on your
          report can be slightly different. Status is not a diagnosis. Please discuss results with
          your doctor.
        </p>
        <p>
          {SOURCE_LABELS[panel.source]}.{panel.notes && ` ${panel.notes}`}
        </p>
      </div>
    </div>
  );
}
