import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import {
  getMetricByKey,
  getSeries,
  isRangeKey,
  listMeasurements,
} from "@/server/services/measurements";
import { AppError } from "@/server/errors";
import { LazyTrendChart as TrendChart } from "@/components/charts/lazy-trend-chart";
import { ChartLegend } from "@/components/charts/chart-legend";
import { RangeSelector, RANGE_OPTIONS } from "@/components/charts/range-selector";
import { MeasurementDialog } from "@/components/tracking/measurement-dialog";
import { ReadingActions } from "@/components/tracking/reading-actions";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { metricIcon } from "@/components/shared/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { formatDate, formatNumber, formatTime, toDateTimeInputValue } from "@/lib/format";
import { presentMeasurement } from "@/lib/display";
import { preferredInputUnits, toMetricOption } from "@/lib/tracking-helpers";
import { cn, toNum } from "@/lib/utils";

export const metadata: Metadata = { title: "Measurement" };

type SP = { range?: string; page?: string; context?: string };

export default async function MetricPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const [{ key }, sp] = await Promise.all([params, searchParams]);
  const metric = await getMetricByKey(user.id, key.slice(0, 80)).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const range = isRangeKey(sp.range) ? sp.range : "30d";
  const context = sp.context && metric.contexts.includes(sp.context) ? sp.context : undefined;
  const [series, list] = await Promise.all([
    getSeries(user.id, metric.id, range),
    listMeasurements(user.id, metric.id, { page: Number(sp.page) || 1 }),
  ]);
  const tz = user.timezone;
  const option = toMetricOption(metric);
  const sample = presentMeasurement(metric, 0, null, user.prefs);
  const conv = sample.convert;
  const shown = (context ? series.filter((p) => p.context === context) : series).map((p) => ({
    ...p,
    value: Number(conv(p.value).toFixed(3)),
  }));
  const dual = metric.valueType === "DUAL";
  const values = shown.map((p) => p.value);
  const stats = values.length
    ? {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        avg2: dual ? shown.reduce((a, p) => a + (p.value2 ?? 0), 0) / shown.length : null,
      }
    : null;
  const latest = list.items[0];
  const Icon = metricIcon(metric.key);
  const now = toDateTimeInputValue(new Date(), tz);
  const qs = (over: Partial<SP>) =>
    `/tracking/${metric.key}?${new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][])}`;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)!.full.toLowerCase();
  const fmt = (v: number) => formatNumber(v, sample.decimals || 1);

  return (
    <div>
      <Link
        href="/tracking"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Health tracking
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-2xl">
            <Icon className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{metric.name}</h1>
            {latest && (
              <p className="text-muted-foreground text-sm">
                Latest:{" "}
                <span className="text-foreground tabular font-medium">
                  {
                    presentMeasurement(
                      metric,
                      toNum(latest.value)!,
                      toNum(latest.value2),
                      user.prefs,
                    ).text
                  }{" "}
                  {sample.unit}
                </span>{" "}
                · {formatDate(latest.measuredAt, tz)}, {formatTime(latest.measuredAt, tz)}
              </p>
            )}
          </div>
        </div>
        <Suspense>
          <MeasurementDialog
            metrics={[option]}
            defaultMetricKey={metric.key}
            now={now}
            preferredUnits={preferredInputUnits(user.prefs)}
          />
        </Suspense>
      </div>

      {list.total === 0 ? (
        <EmptyState
          icon={Icon}
          title={`No ${metric.name.toLowerCase()} readings yet`}
          description="Add a reading to start building your history."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Trend</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {metric.contexts.length > 0 && (
                  <nav aria-label="Filter by context" className="flex flex-wrap gap-1.5">
                    <Link
                      href={qs({ context: undefined })}
                      scroll={false}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        !context
                          ? "border-primary bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      All
                    </Link>
                    {metric.contexts
                      .filter((c) => series.some((p) => p.context === c))
                      .map((c) => (
                        <Link
                          key={c}
                          href={qs({ context: c })}
                          scroll={false}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            context === c
                              ? "border-primary bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {CONTEXT_LABELS[c] ?? c}
                        </Link>
                      ))}
                  </nav>
                )}
                <RangeSelector value={range} makeHref={(r) => qs({ range: r, page: undefined })} />
              </div>
            </CardHeader>
            <CardContent>
              {shown.length >= 2 ? (
                <>
                  {dual && (
                    <div className="mb-3">
                      <ChartLegend
                        items={[
                          { label: metric.primaryLabel ?? "Value 1", color: "var(--chart-1)" },
                          { label: metric.secondaryLabel ?? "Value 2", color: "var(--chart-2)" },
                        ]}
                      />
                    </div>
                  )}
                  <TrendChart
                    points={shown}
                    unit={sample.unit}
                    decimals={sample.decimals}
                    dual={dual}
                    seriesLabels={[
                      metric.primaryLabel ?? "Value 1",
                      metric.secondaryLabel ?? "Value 2",
                    ]}
                    timezone={tz}
                  />
                </>
              ) : (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  {shown.length === 1
                    ? "Only one reading in this period."
                    : "No readings in this period."}{" "}
                  Try a longer time range.
                </p>
              )}
              {stats && (
                <div className="mt-5 border-t pt-4">
                  <p className="text-muted-foreground mb-3 text-xs">
                    Calculated from {shown.length} reading{shown.length === 1 ? "" : "s"} in the
                    last {rangeLabel}
                    {context ? ` (${CONTEXT_LABELS[context]})` : ""}
                  </p>
                  <dl className="grid grid-cols-3 gap-4">
                    <div>
                      <dt className="text-muted-foreground text-xs">Average</dt>
                      <dd className="tabular mt-0.5 text-lg font-semibold">
                        {dual
                          ? `${formatNumber(stats.avg, 0)}/${formatNumber(stats.avg2!, 0)}`
                          : fmt(stats.avg)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {dual ? "Lowest systolic" : "Lowest"}
                      </dt>
                      <dd className="tabular mt-0.5 text-lg font-semibold">{fmt(stats.min)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {dual ? "Highest systolic" : "Highest"}
                      </dt>
                      <dd className="tabular mt-0.5 text-lg font-semibold">{fmt(stats.max)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-muted-foreground mt-3 text-xs">
            Charts show what you recorded. They don&apos;t indicate whether values are healthy for
            you — ask your doctor about your personal targets.
          </p>

          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold">All readings</h2>
            <ul className="bg-card divide-y overflow-hidden rounded-2xl border">
              {list.items.map((m) => {
                const pres = presentMeasurement(
                  metric,
                  toNum(m.value)!,
                  toNum(m.value2),
                  user.prefs,
                );
                const label = `${formatDate(m.measuredAt, tz)} ${formatTime(m.measuredAt, tz)}`;
                return (
                  <li
                    key={m.id}
                    id={`m-${m.id}`}
                    className="flex items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="w-28 shrink-0 sm:w-36">
                      <div className="text-sm">{formatDate(m.measuredAt, tz)}</div>
                      <div className="text-muted-foreground tabular text-xs">
                        {formatTime(m.measuredAt, tz)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <span className="tabular font-semibold">{pres.text}</span>{" "}
                        <span className="text-muted-foreground text-sm">{pres.unit}</span>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                        {m.context && (
                          <Badge variant="secondary">
                            {m.context === "CUSTOM" && m.contextNote
                              ? m.contextNote
                              : (CONTEXT_LABELS[m.context] ?? m.context)}
                          </Badge>
                        )}
                        {m.notes && <span className="truncate">{m.notes}</span>}
                        {m.source === "CSV_IMPORT" && <span>Imported</span>}
                      </div>
                    </div>
                    <ReadingActions
                      metric={option}
                      now={now}
                      label={label}
                      initial={{
                        id: m.id,
                        metricId: metric.id,
                        value: String(toNum(m.value)),
                        value2: m.value2 != null ? String(toNum(m.value2)) : "",
                        unit: m.unit,
                        measuredAt: toDateTimeInputValue(m.measuredAt, tz),
                        context: m.context ?? "",
                        contextNote: m.contextNote ?? "",
                        notes: m.notes ?? "",
                      }}
                    />
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={list.page}
              pageCount={list.pageCount}
              total={list.total}
              label="readings"
              makeHref={(p) => qs({ page: String(p) })}
            />
          </section>
        </>
      )}
    </div>
  );
}
