"use client";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { formatDate, formatDayMonth, formatNumber, formatTime } from "@/lib/format";
import { useT } from "@/i18n/client";

export interface TrendPoint {
  at: string;
  value: number;
  value2?: number | null;
  context?: string | null;
  notes?: string | null;
  label?: string | null;
  flag?: string | null;
  rangeText?: string | null;
}

interface Props {
  points: TrendPoint[];
  unit: string;
  decimals?: number;
  dual?: boolean;
  seriesLabels?: [string, string];
  timezone?: string;
  /** Shaded band — only pass when the same range applies to every point (e.g. one lab's printed range). */
  band?: { low: number | null; high: number | null; label: string } | null;
  height?: number;
  showDots?: boolean;
  /**
   * General reference ranges (e.g. India / US guidance). "fill" draws shaded zones,
   * "line" draws dashed lines at each threshold, so both can be shown together.
   */
  guides?: ChartGuide[];
}

export type GuideTone = "low" | "normal" | "borderline" | "high";
export interface ChartGuide {
  style: "fill" | "line";
  bands: { low: number | null; high: number | null; label: string; tone: GuideTone }[];
  /** Explicit values to draw as lines (otherwise the band boundaries are used). */
  lines?: number[];
  color?: string;
}

const TONE_FILL: Record<GuideTone, string> = {
  normal: "var(--success)",
  borderline: "var(--marigold)",
  high: "var(--destructive)",
  low: "var(--destructive)",
};

function ChartTooltip({
  active,
  payload,
  unit,
  decimals,
  dual,
  seriesLabels,
  timezone,
}: TooltipProps<number, string> & Omit<Props, "points">) {
  const t = useT();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as TrendPoint & { t: number };
  return (
    <div className="bg-popover max-w-64 min-w-44 rounded-md border px-3 py-2.5 text-sm shadow-lg">
      <div className="text-muted-foreground text-xs">
        {formatDate(p.at, timezone)}, {formatTime(p.at, timezone)}
      </div>
      {dual ? (
        <div className="mt-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="bg-chart-1 size-2 rounded-full" /> {seriesLabels?.[0]}{" "}
            <b className="tabular ml-auto">{formatNumber(p.value, 0)}</b>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-chart-2 size-2 rounded-full" /> {seriesLabels?.[1]}{" "}
            <b className="tabular ml-auto">{p.value2 != null ? formatNumber(p.value2, 0) : "—"}</b>
          </div>
          <div className="text-muted-foreground text-xs">{unit}</div>
        </div>
      ) : (
        <div className="tabular mt-0.5 text-base font-semibold">
          {formatNumber(p.value, decimals ?? 1)}{" "}
          <span className="text-muted-foreground text-sm font-normal">{unit}</span>
        </div>
      )}
      {p.context && <div className="mt-1 text-xs">{CONTEXT_LABELS[p.context] ?? p.context}</div>}
      {p.label && <div className="text-muted-foreground mt-1 text-xs">{p.label}</div>}
      {p.rangeText && (
        <div className="text-muted-foreground mt-1 text-xs">
          {t("labs.chart.rangeOnReport", { range: p.rangeText })}
        </div>
      )}
      {p.notes && (
        <div className="text-muted-foreground mt-1.5 line-clamp-3 border-t pt-1.5 text-xs">
          {p.notes}
        </div>
      )}
    </div>
  );
}

export function TrendChart({
  points,
  unit,
  decimals = 1,
  dual,
  seriesLabels: seriesLabelsProp,
  timezone,
  band,
  height = 280,
  showDots,
  guides,
}: Props) {
  const t = useT();
  const seriesLabels: [string, string] = seriesLabelsProp ?? [
    t("labs.chart.systolic"),
    t("labs.chart.diastolic"),
  ];
  const data = useMemo(() => points.map((p) => ({ ...p, t: new Date(p.at).getTime() })), [points]);
  const domain = useMemo(() => {
    const vals = data.flatMap((d) => [d.value, ...(dual && d.value2 != null ? [d.value2] : [])]);
    if (band?.low != null) vals.push(band.low);
    if (band?.high != null) vals.push(band.high);
    // Bring nearby guide thresholds into view (e.g. an anaemia cut-off just below the data),
    // without letting a far-away one squash the line flat.
    const dMin = Math.min(...vals),
      dMax = Math.max(...vals);
    const reach = Math.max(dMax - dMin, Math.abs(dMax) * 0.1);
    for (const g of guides ?? []) {
      for (const y of g.lines ?? thresholds(g.bands)) {
        if (y >= dMin - reach && y <= dMax + reach) vals.push(y);
      }
    }
    const min = Math.min(...vals),
      max = Math.max(...vals);
    const pad = (max - min || Math.abs(max) || 1) * 0.15;
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)] as [number, number];
  }, [data, dual, band, guides]);
  const spanDays = data.length > 1 ? (data[data.length - 1].t - data[0].t) / 86_400_000 : 0;
  const dots = showDots ?? data.length <= 40;

  return (
    <div
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={t.n("labs.chart.aria", data.length, { unit })}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          {guides
            ?.filter((g) => g.style === "fill")
            .flatMap((g) => g.bands)
            .map((b, i) => (
              <ReferenceArea
                key={`gf-${i}`}
                y1={b.low ?? domain[0]}
                y2={b.high ?? domain[1]}
                fill={TONE_FILL[b.tone]}
                fillOpacity={b.tone === "normal" ? 0.1 : 0.08}
                stroke="none"
                ifOverflow="hidden"
              />
            ))}
          {guides
            ?.filter((g) => g.style === "line")
            .flatMap((g) => (g.lines ?? thresholds(g.bands)).map((y) => ({ y, c: g.color })))
            .map(({ y, c }, i) => (
              <ReferenceLine
                key={`gl-${i}-${y}`}
                y={y}
                stroke={c ?? "var(--info)"}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                ifOverflow="hidden"
              />
            ))}
          {band && (band.low != null || band.high != null) && (
            <ReferenceArea
              y1={band.low ?? domain[0]}
              y2={band.high ?? domain[1]}
              fill="var(--muted-foreground)"
              fillOpacity={0.07}
              stroke="none"
              ifOverflow="extendDomain"
              label={{
                value: band.label,
                position: "insideBottomRight",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
          )}
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) =>
              spanDays > 300
                ? formatDate(t, timezone).replace(/^\d+ /, "")
                : formatDayMonth(t, timezone)
            }
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            domain={domain}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => formatNumber(v, decimals > 1 ? 1 : decimals)}
          />
          <Tooltip
            cursor={{
              stroke: "var(--muted-foreground)",
              strokeDasharray: "3 3",
              strokeOpacity: 0.5,
            }}
            content={
              <ChartTooltip
                unit={unit}
                decimals={decimals}
                dual={dual}
                seriesLabels={seriesLabels}
                timezone={timezone}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            name={dual ? seriesLabels[0] : unit}
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={
              dots
                ? { r: 3.5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }
                : false
            }
            activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
            // No animation: it costs a lot of CPU on low-end phones and adds nothing.
            isAnimationActive={false}
          />
          {dual && (
            <Line
              type="monotone"
              dataKey="value2"
              name={seriesLabels[1]}
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={
                dots
                  ? { r: 3.5, fill: "var(--chart-2)", stroke: "var(--card)", strokeWidth: 2 }
                  : false
              }
              activeDot={{ r: 6, fill: "var(--chart-2)", stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * The cut-off values between bands, e.g. 100 and 126 for fasting glucose. Where one band
 * ends at 125 and the next starts at 126, only the start of the next band is drawn.
 */
function thresholds(bands: ChartGuide["bands"]) {
  const lows = bands.map((b) => b.low).filter((v): v is number => v != null);
  const ys = new Set<number>(lows);
  for (const b of bands) {
    if (b.high == null) continue;
    const h = b.high;
    if (!lows.some((l) => l > h && l - h <= Math.max(1, h * 0.02))) ys.add(h);
  }
  return [...ys];
}
