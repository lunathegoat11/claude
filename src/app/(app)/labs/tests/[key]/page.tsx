import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getTestHistory } from "@/server/services/labs";
import { AppError } from "@/server/errors";
import { deleteLabResultAction } from "@/actions/labs";
import { LazyTrendChart as TrendChart } from "@/components/charts/lazy-trend-chart";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { FlagBadge } from "@/components/labs/flag-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber, formatSigned } from "@/lib/format";
import { formatRange } from "@/lib/lab-range";
import { toNum } from "@/lib/utils";

export const metadata: Metadata = { title: "Test history" };

export default async function TestHistoryPage({ params }: { params: Promise<{ key: string }> }) {
  const user = await requireUser();
  const key = decodeURIComponent((await params).key).slice(0, 200);
  const history = await getTestHistory(user.id, key).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const tz = user.timezone;
  const rows = history.results;
  const latestUnit = rows[rows.length - 1].unit;
  // Only chart results that share the latest unit, so different units are never mixed on one axis.
  const numeric = rows.filter((r) => r.valueNumeric !== null && r.unit === latestUnit);
  const otherUnits = rows.filter((r) => r.valueNumeric !== null && r.unit !== latestUnit).length;
  const ranges = new Set(numeric.map((r) => `${toNum(r.refLow)}|${toNum(r.refHigh)}`));
  const sameRange =
    ranges.size === 1 &&
    numeric.length > 0 &&
    (numeric[0].refLow !== null || numeric[0].refHigh !== null);
  const band = sameRange
    ? { low: toNum(numeric[0].refLow), high: toNum(numeric[0].refHigh), label: "Range on reports" }
    : null;
  const decimals = Math.max(
    ...numeric.map((r) => String(toNum(r.valueNumeric)).split(".")[1]?.length ?? 0),
    0,
  );
  const first = numeric[0] ? toNum(numeric[0].valueNumeric)! : null;
  const last = numeric.length ? toNum(numeric[numeric.length - 1].valueNumeric)! : null;

  return (
    <div>
      <Link
        href="/labs"
        className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
      >
        <ArrowLeft className="size-4" /> Lab results
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{history.testName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {rows.length} result{rows.length === 1 ? "" : "s"} from{" "}
          {formatDate(rows[0].observedAt, tz)} to {formatDate(rows[rows.length - 1].observedAt, tz)}
        </p>
      </div>

      {numeric.length >= 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="sr-only">Results over time</CardTitle>
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]"
              aria-label="Values in date order"
            >
              {numeric.map((r, i) => (
                <span key={r.id} className="inline-flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-muted-foreground" aria-hidden>
                      →
                    </span>
                  )}
                  <span className="tabular font-semibold">
                    {formatNumber(toNum(r.valueNumeric)!, 2)}
                  </span>
                </span>
              ))}
              <span className="text-muted-foreground text-sm">{latestUnit}</span>
            </div>
            {first !== null && last !== null && numeric.length > 1 && (
              <p className="text-muted-foreground text-sm">
                Calculated change from first to latest:{" "}
                <span className="tabular">
                  {formatSigned(last - first, Math.min(decimals, 2))} {latestUnit}
                </span>
              </p>
            )}
          </CardHeader>
          <CardContent>
            {numeric.length >= 2 ? (
              <TrendChart
                points={numeric.map((r) => ({
                  at: r.observedAt.toISOString(),
                  value: toNum(r.valueNumeric)!,
                  label: [r.labName, r.panel?.name].filter(Boolean).join(" · "),
                  rangeText:
                    formatRange(toNum(r.refLow), toNum(r.refHigh), r.refText) || "not given",
                  notes: r.notes,
                }))}
                unit={latestUnit ?? ""}
                decimals={Math.min(Math.max(decimals, 1), 2)}
                timezone={tz}
                band={band}
                showDots
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Add another result to see a trend chart.
              </p>
            )}
            <p className="text-muted-foreground mt-3 text-xs">
              {band
                ? "The shaded band is the reference range printed on these reports."
                : "Reference ranges differ between these reports, so no single range is drawn. Hover a point to see the range printed on that report."}
              {otherUnits > 0 &&
                ` ${otherUnits} result${otherUnits > 1 ? "s" : ""} in a different unit ${otherUnits > 1 ? "are" : "is"} listed below but not charted.`}{" "}
              A visual trend is not a diagnosis.
            </p>
          </CardContent>
        </Card>
      )}

      {history.description && (
        <div className="bg-card mb-6 flex gap-3 rounded-2xl border p-4 text-sm">
          <Info className="text-primary mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">General information:</span> {history.description}{" "}
            <span className="text-muted-foreground">
              This describes the test in general and is not specific to you.
            </span>
          </p>
        </div>
      )}

      <div className="bg-card overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <caption className="sr-only">All {history.testName} results</caption>
          <thead className="bg-muted/50 text-muted-foreground border-b text-left text-xs">
            <tr>
              <th className="px-4 py-3 font-medium sm:px-5">Date</th>
              <th className="px-3 py-3 text-right font-medium">Result</th>
              <th className="hidden px-3 py-3 font-medium sm:table-cell">Range on report</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">Lab</th>
              <th className="px-3 py-3 font-medium">
                <span className="sr-only">Status</span>
              </th>
              <th className="w-12 px-3 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...rows].reverse().map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 sm:px-5">
                  {r.panelId ? (
                    <Link
                      href={`/labs/reports/${r.panelId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {formatDate(r.observedAt, tz)}
                    </Link>
                  ) : (
                    formatDate(r.observedAt, tz)
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="tabular font-semibold">
                    {r.valueNumeric !== null
                      ? formatNumber(toNum(r.valueNumeric)!, 2)
                      : r.valueText}
                  </span>{" "}
                  <span className="text-muted-foreground">{r.unit}</span>
                </td>
                <td className="text-muted-foreground tabular hidden px-3 py-3 sm:table-cell">
                  {formatRange(toNum(r.refLow), toNum(r.refHigh), r.refText) || "—"}
                </td>
                <td className="text-muted-foreground hidden px-3 py-3 md:table-cell">
                  {r.labName ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <FlagBadge flag={r.flag} compact />
                </td>
                <td className="px-2 py-2 text-right">
                  <ConfirmDelete
                    action={deleteLabResultAction.bind(null, r.id)}
                    redirectTo={rows.length === 1 ? "/labs" : undefined}
                    title="Delete this result?"
                    description={`${history.testName} from ${formatDate(r.observedAt, tz)} will be removed.`}
                    iconOnly
                    triggerVariant="ghost"
                    triggerSize="sm"
                    triggerLabel="Delete result"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
