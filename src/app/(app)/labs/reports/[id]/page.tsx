import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getLabPanel, getPreviousResults, seriesKey } from "@/server/services/labs";
import { or404 } from "@/server/page-utils";
import { deleteLabPanelAction } from "@/actions/labs";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { FlagBadge } from "@/components/labs/flag-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS } from "@/lib/catalog/labels";
import { formatDate, formatNumber, formatSigned } from "@/lib/format";
import { formatRange } from "@/lib/lab-range";
import { toNum } from "@/lib/utils";

export const metadata: Metadata = { title: "Lab report" };

export default async function LabReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const panel = await or404(id, (i) => getLabPanel(user.id, i));
  const prev = await getPreviousResults(user.id, panel);
  const tz = user.timezone;
  const flagged = panel.results.filter((r) => ["HIGH", "LOW", "ABNORMAL"].includes(r.flag)).length;

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
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {formatDate(panel.collectedAt, tz)}
            {panel.labName && ` · ${panel.labName}`}
            {panel.isDemo && <Badge variant="demo">Sample data</Badge>}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{panel.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {panel.results.length} results ·{" "}
            {flagged
              ? `${flagged} outside the ranges printed on this report`
              : "all within the ranges printed on this report or no range given"}
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

      <div className="bg-card overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <caption className="sr-only">Results for {panel.name}</caption>
          <thead className="bg-muted/50 text-muted-foreground border-b text-left text-xs">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium sm:px-5">
                Test
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Result
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">
                Range on report
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">
                Previous
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">
                <span className="sr-only">Status</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {panel.results.map((r) => {
              const v = toNum(r.valueNumeric);
              const p = prev.get(seriesKey(r));
              const pv = p && p.unit === r.unit ? toNum(p.valueNumeric) : null;
              const range = formatRange(toNum(r.refLow), toNum(r.refHigh), r.refText);
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3.5 sm:px-5">
                    <Link
                      href={`/labs/tests/${encodeURIComponent(seriesKey(r))}`}
                      className="hover:text-primary font-medium hover:underline"
                    >
                      {r.testName}
                    </Link>
                    <div className="text-muted-foreground mt-0.5 text-xs md:hidden">
                      {range ? `Range ${range}` : "No range on report"}
                    </div>
                    {r.notes && (
                      <div className="text-muted-foreground mt-0.5 text-xs">{r.notes}</div>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="tabular font-semibold">
                      {v !== null ? formatNumber(v, 2) : r.valueText}
                    </span>{" "}
                    <span className="text-muted-foreground">{r.unit}</span>
                  </td>
                  <td className="text-muted-foreground tabular hidden px-3 py-3.5 md:table-cell">
                    {range || "—"}
                  </td>
                  <td className="text-muted-foreground tabular hidden px-3 py-3.5 sm:table-cell">
                    {p ? (
                      <>
                        {pv !== null ? formatNumber(pv, 2) : (p.valueText ?? toNum(p.valueNumeric))}{" "}
                        {pv !== null && v !== null && (
                          <span className="text-xs">({formatSigned(v - pv, 2)})</span>
                        )}
                        <div className="text-xs">{formatDate(p.observedAt, tz)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right sm:px-5">
                    <FlagBadge flag={r.flag} compact />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-muted-foreground mt-4 space-y-1 text-xs">
        <p>
          Status compares each value only with the reference range printed on this report. It is not
          a diagnosis — please discuss results with your doctor.
        </p>
        <p>
          Source: {SOURCE_LABELS[panel.source]}
          {panel.notes && ` · ${panel.notes}`}
        </p>
      </div>
    </div>
  );
}
