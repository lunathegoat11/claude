import Link from "next/link";
import { cn } from "@/lib/utils";

export const RANGE_OPTIONS = [
  { key: "7d", label: "7D", full: "7 days" },
  { key: "30d", label: "30D", full: "30 days" },
  { key: "3m", label: "3M", full: "3 months" },
  { key: "6m", label: "6M", full: "6 months" },
  { key: "1y", label: "1Y", full: "1 year" },
  { key: "all", label: "All", full: "All time" },
] as const;

export function RangeSelector({
  value,
  makeHref,
}: {
  value: string;
  makeHref: (range: string) => string;
}) {
  return (
    <nav aria-label="Time range" className="bg-muted inline-flex rounded-xl p-1">
      {RANGE_OPTIONS.map((o) => (
        <Link
          key={o.key}
          href={makeHref(o.key)}
          scroll={false}
          aria-current={value === o.key ? "true" : undefined}
          aria-label={o.full}
          className={cn(
            "text-muted-foreground hover:text-foreground inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-2.5 text-[13px] font-medium transition",
            value === o.key && "bg-card text-foreground shadow-sm",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
