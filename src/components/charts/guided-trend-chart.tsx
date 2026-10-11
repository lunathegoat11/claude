"use client";
import { useEffect, useState } from "react";
import { LazyTrendChart } from "./lazy-trend-chart";
import type { ChartGuide, TrendPoint } from "./trend-chart";
import type { ResolvedGuide } from "@/lib/catalog/reference-guides";
import { cn } from "@/lib/utils";

type Source = "india" | "us";
const PREF_KEY = "kosha.guides";

function bandText(b: { low: number | null; high: number | null }, unit: string) {
  const f = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (b.low != null && b.high != null) return `${f(b.low)} – ${f(b.high)} ${unit}`;
  if (b.high != null) return `below ${f(b.high)} ${unit}`;
  if (b.low != null) return `${f(b.low)} ${unit} or more`;
  return "";
}

/**
 * A trend chart with optional general reference ranges from India (shaded zones, on by
 * default) and the US (dashed lines). The choice is remembered on this device only.
 */
export function GuidedTrendChart({
  guides,
  decimals = 1,
  unit,
  ...chart
}: {
  guides: Partial<Record<Source, ResolvedGuide>>;
  points: TrendPoint[];
  unit: string;
  decimals?: number;
  dual?: boolean;
  seriesLabels?: [string, string];
  timezone?: string;
  band?: { low: number | null; high: number | null; label: string } | null;
  showDots?: boolean;
}) {
  const [on, setOn] = useState<Record<Source, boolean>>({ india: true, us: false });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null");
      if (saved && typeof saved.india === "boolean" && typeof saved.us === "boolean") setOn(saved);
    } catch {
      /* private mode etc. — defaults are fine */
    }
  }, []);
  const toggle = (s: Source) =>
    setOn((prev) => {
      const next = { ...prev, [s]: !prev[s] };
      try {
        localStorage.setItem(PREF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const available = (["india", "us"] as const).filter((s) => guides[s]);
  const chartGuides: ChartGuide[] = [];
  const india = guides.india;
  const us = guides.us;
  if (on.india && india?.lines)
    chartGuides.push({ style: "line", bands: [], lines: india.lines, color: "var(--success)" });
  else if (on.india && india?.bands.length) chartGuides.push({ style: "fill", bands: india.bands });
  if (on.us && us && (us.lines || us.bands.length))
    chartGuides.push({ style: "line", bands: us.bands, lines: us.lines });

  return (
    <div>
      {available.length > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="General ranges"
        >
          <span className="text-muted-foreground text-[13px]">General ranges:</span>
          {available.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={on[s]}
              onClick={() => toggle(s)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors pointer-coarse:min-h-11",
                on[s]
                  ? "border-primary bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "india" ? (
                india?.lines ? (
                  <span className="border-success w-4 border-t-2 border-dashed" aria-hidden />
                ) : (
                  <span className="bg-success/40 size-3 rounded-sm" aria-hidden />
                )
              ) : (
                <span className="border-info w-4 border-t-2 border-dashed" aria-hidden />
              )}
              {s === "india" ? "India" : "USA"}
            </button>
          ))}
        </div>
      )}
      <LazyTrendChart {...chart} unit={unit} decimals={decimals} guides={chartGuides} />
      {available.some((s) => on[s]) && (
        <dl className="mt-3 space-y-2 text-[13px]">
          {available
            .filter((s) => on[s])
            .map((s) => {
              const g = guides[s]!;
              return (
                <div key={s}>
                  <dt className="font-medium">
                    {s === "india" ? "India" : "USA"}:{" "}
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary font-normal underline underline-offset-2"
                    >
                      {g.source}
                    </a>
                  </dt>
                  <dd className="text-muted-foreground">
                    {g.unavailable
                      ? `${g.unavailable}.`
                      : `${
                          g.summary ??
                          g.bands.map((b) => `${b.label}: ${bandText(b, g.unit)}`).join("; ")
                        }.${g.note ? ` ${g.note}.` : ""}`}
                  </dd>
                </div>
              );
            })}
          <p className="text-muted-foreground">
            General ranges are for orientation only. Your report&apos;s own range, and your doctor,
            decide what a result means for you.
          </p>
        </dl>
      )}
    </div>
  );
}
