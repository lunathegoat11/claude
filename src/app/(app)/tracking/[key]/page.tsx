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
import { GuidedTrendChart as TrendChart } from "@/components/charts/guided-trend-chart";
import { resolveGuides } from "@/lib/catalog/reference-guides";
import { ChartLegend } from "@/components/charts/chart-legend";
import { RangeSelector } from "@/components/charts/range-selector";
import { MeasurementDialog } from "@/components/tracking/measurement-dialog";
import { ReadingActions } from "@/components/tracking/reading-actions";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { metricIcon } from "@/components/shared/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber, formatTime, toDateTimeInputValue } from "@/lib/format";
import { presentMeasurement } from "@/lib/display";
import { preferredInputUnits, toMetricOption } from "@/lib/tracking-helpers";
import { cn, toNum } from "@/lib/utils";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { contextLabel, dualLabels, metricName } from "@/components/tracking/metric-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("app.meta.measurement") };
}

const RANGE_LABELS: Record<string, MessageKey> = {
  "7d": "app.range.7d",
  "30d": "app.range.30d",
  "3m": "app.range.3m",
  "6m": "app.range.6m",
  "1y": "app.range.1y",
  all: "app.range.all",
};

type SP = { range?: string; page?: string; context?: string };

export default async function MetricPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const t = await getT();
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
  const name = metricName(t, metric);
  const option = { ...toMetricOption(metric), name };
  const [label1, label2] = dualLabels(t, metric);
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
  const rangeLabel = t(RANGE_LABELS[range] ?? "app.range.all");
  const fmt = (v: number) => formatNumber(v, sample.decimals || 1);

  return (
    <div>
      <Link
        href="/tracking"
        className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
      >
        <ArrowLeft className="size-4" /> {t("nav.tracking")}
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-[var(--radius)]">
            <Icon className="size-5" />
          </span>
          <div>
            <h1 className="text-[2rem] font-semibold sm:text-[2.5rem]">{name}</h1>
            {latest && (
              <p className="text-muted-foreground text-sm">
                {t("app.reading.latest")}{" "}
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
                , {formatDate(latest.measuredAt, tz)}, {formatTime(latest.measuredAt, tz)}
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
          title={t("app.reading.emptyTitle", {
            name: t.locale === "en" ? name.toLowerCase() : name,
          })}
          description={t("app.reading.emptyBody")}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{t("app.reading.trendTitle")}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {metric.contexts.length > 0 && (
                  <nav aria-label={t("app.reading.filter")} className="flex flex-wrap gap-1.5">
                    <Link
                      href={qs({ context: undefined })}
                      scroll={false}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium pointer-coarse:px-3.5 pointer-coarse:py-3",
                        !context
                          ? "border-primary bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t("app.reading.all")}
                    </Link>
                    {metric.contexts
                      .filter((c) => series.some((p) => p.context === c))
                      .map((c) => (
                        <Link
                          key={c}
                          href={qs({ context: c })}
                          scroll={false}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium pointer-coarse:px-3.5 pointer-coarse:py-3",
                            context === c
                              ? "border-primary bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {contextLabel(t, c)}
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
                          { label: label1, color: "var(--chart-1)" },
                          { label: label2, color: "var(--chart-2)" },
                        ]}
                      />
                    </div>
                  )}
                  {metric.key === "blood_glucose" && !context && (
                    <p className="text-muted-foreground mb-2 text-[13px]">
                      {t("app.reading.glucoseHint", {
                        a: contextLabel(t, "FASTING"),
                        b: contextLabel(t, "BEFORE_MEAL"),
                        c: contextLabel(t, "AFTER_MEAL"),
                      })}
                    </p>
                  )}
                  <TrendChart
                    points={shown}
                    unit={sample.unit}
                    decimals={sample.decimals}
                    dual={dual}
                    seriesLabels={[label1, label2]}
                    timezone={tz}
                    guides={resolveGuides(
                      metric.key === "blood_glucose"
                        ? `blood_glucose:${context ?? ""}`
                        : metric.key,
                      sample.unit,
                    )}
                  />
                </>
              ) : (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  {shown.length === 1 ? t("app.reading.onlyOne") : t("app.reading.none")}{" "}
                  {t("app.reading.tryLonger")}
                </p>
              )}
              {stats && (
                <div className="mt-5 border-t pt-4">
                  <p className="text-muted-foreground mb-3 text-xs">
                    {t.n("app.reading.basedOn", shown.length, { period: rangeLabel })}
                    {context ? `, ${contextLabel(t, context)}` : ""}
                  </p>
                  <dl className="grid grid-cols-3 gap-4">
                    <div>
                      <dt className="text-muted-foreground text-xs">{t("app.reading.average")}</dt>
                      <dd className="tabular mt-0.5 text-lg font-semibold">
                        {dual
                          ? `${formatNumber(stats.avg, 0)}/${formatNumber(stats.avg2!, 0)}`
                          : fmt(stats.avg)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {dual ? t("app.reading.lowestSys") : t("app.reading.lowest")}
                      </dt>
                      <dd className="tabular mt-0.5 text-lg font-semibold">{fmt(stats.min)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {dual ? t("app.reading.highestSys") : t("app.reading.highest")}
                      </dt>
                      <dd className="tabular mt-0.5 text-lg font-semibold">{fmt(stats.max)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-muted-foreground mt-3 text-xs">{t("app.reading.disclaimer")}</p>

          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold">{t("app.dash.allReadings")}</h2>
            <ul className="surface divide-y overflow-hidden">
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
                              : contextLabel(t, m.context)}
                          </Badge>
                        )}
                        {m.notes && <span className="truncate">{m.notes}</span>}
                        {m.source === "CSV_IMPORT" && <span>{t("app.reading.imported")}</span>}
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
              label={t("app.reading.readingsWord")}
              makeHref={(p) => qs({ page: String(p) })}
            />
          </section>
        </>
      )}
    </div>
  );
}
