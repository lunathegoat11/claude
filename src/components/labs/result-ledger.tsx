import Link from "next/link";
import { FlagBadge } from "./flag-badge";
import { RangeStrip } from "./range-strip";
import { formatNumber } from "@/lib/format";
import { formatRange } from "@/lib/lab-range";
import { formatTestName } from "@/lib/test-name";

export interface LedgerResult {
  id: string;
  testName: string;
  href: string;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  /** Which range this is, e.g. "NIH range" or "Report range". */
  rangeLabel?: string;
  flag: string;
  notes?: string | null;
  /** e.g. "5.5 on 5 Mar 2026" */
  previous?: string | null;
}

/**
 * Lab results as ruled register lines: test, value, where it sits in the printed
 * range, and the status in words. Used on the dashboard and on every report.
 */
export function ResultLedger({ results, label }: { results: LedgerResult[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y">
      {results.map((r) => {
        const range = r.rangeLabel ? r.refText : formatRange(r.refLow, r.refHigh, r.refText);
        return (
          <li
            key={r.id}
            className="lazy-row grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1.25fr)_7.5rem_minmax(9rem,1fr)_7rem] sm:items-center sm:px-5"
          >
            <div className="min-w-0">
              <Link
                href={r.href}
                className="hover:text-primary font-medium underline-offset-2 hover:underline"
              >
                {formatTestName(r.testName)}
              </Link>
              {r.previous && (
                <div className="text-muted-foreground text-[13px]">Before: {r.previous}</div>
              )}
              {r.notes && (
                <div className="text-warning mt-0.5 flex gap-1.5 text-[13px]">
                  <span className="bg-marigold mt-[7px] size-1.5 shrink-0 rounded-full" />
                  {r.notes}
                </div>
              )}
            </div>
            <div className="text-right whitespace-nowrap">
              <span className="figure text-[1.375rem] leading-none font-semibold">
                {r.value !== null ? formatNumber(r.value, 2) : r.valueText}
              </span>{" "}
              <span className="text-muted-foreground text-sm">{r.unit}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <RangeStrip value={r.value} low={r.refLow} high={r.refHigh} />
              <div className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-[13px]">
                <span className="tabular">
                  {range ? `${r.rangeLabel ?? "Report range"} ${range}` : "No range available"}
                </span>
                <span className="sm:hidden">
                  <FlagBadge flag={r.flag} compact />
                </span>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <FlagBadge flag={r.flag} compact />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
