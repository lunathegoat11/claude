import { cn } from "@/lib/utils";

/**
 * Where a result sits against the reference range printed on its own report.
 *
 * The printed range is drawn as an ink-washed band on a ruled line; the result is a
 * tick: ink when inside the band, sindoor when outside. Purely visual; the text
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
      <div className="bg-border absolute inset-x-0 top-1/2 h-px" />
      <div
        className="bg-primary/14 border-primary/30 absolute top-0.5 bottom-0.5 rounded-[2px] border-x"
        style={{ left: `${bandFrom}%`, width: `${Math.max(bandTo - bandFrom, 1)}%` }}
      />
      <div
        className={cn(
          "absolute top-0 bottom-0 w-[3px] -translate-x-1/2 rounded-full",
          outside ? "bg-destructive" : "bg-primary",
          clipped && "w-[5px]",
        )}
        style={{ left: `${at}%` }}
      />
    </div>
  );
}
