import { cn } from "@/lib/utils";

/**
 * Where a result sits against the reference range printed on its own report.
 *
 * A soft capsule track with the printed range as a green segment; the result is a dot,
 * green inside the range and red outside. Purely visual; the text
 * next to it always states the value, the range and the status.
 */
export function RangeStrip({
  value,
  low,
  high,
  className,
}: {
  value: number | null;
  low: number | null;
  high: number | null;
  className?: string;
}) {
  if (value === null || (low === null && high === null)) {
    return <div className={cn("h-3", className)} aria-hidden />;
  }
  // Domain: the printed range with room either side, so "a bit high" and "far too high" look different.
  let min: number;
  let max: number;
  if (low !== null && high !== null) {
    const pad = Math.max((high - low) * 0.6, Math.abs(high) * 0.05, 0.01);
    min = low - pad;
    max = high + pad;
  } else if (high !== null) {
    min = 0;
    max = high * 1.6 || 1;
  } else {
    min = 0;
    max = (low as number) * 2 || 1;
  }
  const pct = (n: number) => Math.min(100, Math.max(0, ((n - min) / (max - min)) * 100));
  const bandFrom = pct(low ?? min);
  const bandTo = pct(high ?? max);
  const at = pct(value);
  const outside = (low !== null && value < low) || (high !== null && value > high);
  const clipped = value < min || value > max;
  return (
    <div className={cn("relative h-3", className)} aria-hidden>
      <div className="bg-secondary absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" />
      <div
        className="bg-success/30 absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{ left: `${bandFrom}%`, width: `${Math.max(bandTo - bandFrom, 1)}%` }}
      />
      <div
        className={cn(
          "ring-card absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
          outside ? "bg-destructive" : "bg-success",
          clipped && "size-3.5",
        )}
        style={{ left: `${at}%` }}
      />
    </div>
  );
}
