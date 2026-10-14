import Link from "next/link";
import { cn } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const RANGE_OPTIONS = [
  { key: "7d", label: "7D", full: "7 days" },
  { key: "30d", label: "30D", full: "30 days" },
  { key: "3m", label: "3M", full: "3 months" },
  { key: "6m", label: "6M", full: "6 months" },
  { key: "1y", label: "1Y", full: "1 year" },
  { key: "all", label: "All", full: "All time" },
] as const;

const LABEL_KEYS = {
  "7d": ["labs.chart.range.7d", "labs.chart.rangeFull.7d"],
  "30d": ["labs.chart.range.30d", "labs.chart.rangeFull.30d"],
  "3m": ["labs.chart.range.3m", "labs.chart.rangeFull.3m"],
  "6m": ["labs.chart.range.6m", "labs.chart.rangeFull.6m"],
  "1y": ["labs.chart.range.1y", "labs.chart.rangeFull.1y"],
  all: ["labs.chart.range.all", "labs.chart.rangeFull.all"],
} as const satisfies Record<(typeof RANGE_OPTIONS)[number]["key"], readonly [string, string]>;

export async function RangeSelector({
  value,
  makeHref,
}: {
  value: string;
  makeHref: (range: string) => string;
}) {
  const t = await getT();
  return (
    <nav
      aria-label={t("labs.chart.timeRange")}
      className="bg-muted inline-flex flex-wrap rounded-md p-1"
    >
      {RANGE_OPTIONS.map((o) => (
        <Link
          key={o.key}
          href={makeHref(o.key)}
          scroll={false}
          aria-current={value === o.key ? "true" : undefined}
          aria-label={t(LABEL_KEYS[o.key][1])}
          className={cn(
            "text-muted-foreground hover:text-foreground inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-2.5 text-[13px] font-medium transition pointer-coarse:h-10",
            value === o.key && "bg-card text-foreground shadow-sm",
          )}
        >
          {t(LABEL_KEYS[o.key][0])}
        </Link>
      ))}
    </nav>
  );
}
