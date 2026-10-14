import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Activity, FileSpreadsheet, Plus } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { metricOverview } from "@/server/services/measurements";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { metricIcon } from "@/components/shared/icons";
import { Sparkline } from "@/components/charts/sparkline";
import { MeasurementDialog } from "@/components/tracking/measurement-dialog";
import { CustomMetricDialog } from "@/components/tracking/custom-metric-dialog";
import { Button } from "@/components/ui/button";
import { formatRelativeDateTime, toDateTimeInputValue } from "@/lib/format";
import { presentMeasurement } from "@/lib/display";
import { preferredInputUnits, toMetricOption } from "@/lib/tracking-helpers";
import { getT } from "@/i18n/server";
import { contextLabel, metricName } from "@/components/tracking/metric-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.tracking") };
}

export default async function TrackingPage() {
  const user = await requireUser();
  const t = await getT();
  const { metrics, tracked } = await metricOverview(user.id);
  const tz = user.timezone;
  const options = metrics.map((m) => ({ ...toMetricOption(m), name: metricName(t, m) }));
  const trackedIds = new Set(tracked.map((x) => x.metric.id));
  const untracked = metrics.filter((m) => !trackedIds.has(m.id));
  const now = toDateTimeInputValue(new Date(), tz);
  const prefs = preferredInputUnits(user.prefs);

  return (
    <div>
      <PageHeader
        title={t("nav.tracking")}
        description={t("app.tracking.description")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/tracking/import">
                <FileSpreadsheet /> {t("app.tracking.importCsv")}
              </Link>
            </Button>
            <CustomMetricDialog />
            <Suspense>
              <MeasurementDialog metrics={options} now={now} preferredUnits={prefs} autoOpenParam />
            </Suspense>
          </>
        }
      />

      {tracked.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={t("app.tracking.emptyTitle")}
          description={t("app.tracking.emptyBody")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tracked.map(({ metric, count, points }) => {
            const Icon = metricIcon(metric.key);
            const last = points[points.length - 1];
            const pres = presentMeasurement(metric, last.value, last.value2, user.prefs);
            const name = metricName(t, metric);
            return (
              <Link
                key={metric.id}
                href={`/tracking/${metric.key}`}
                className="group surface p-5 transition hover:shadow-[0_2px_4px_rgb(29_29_31/0.05),0_12px_32px_rgb(29_29_31/0.08)]"
              >
                <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <span className="bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </span>
                  {name}
                  <span className="ml-auto text-xs font-normal">
                    {t.n("app.tracking.count", count)}
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="tabular text-[26px] leading-none font-semibold">
                        {pres.text}
                      </span>
                      <span className="text-muted-foreground text-sm">{pres.unit}</span>
                    </div>
                    <div className="text-muted-foreground mt-2 text-[13px]">
                      {formatRelativeDateTime(last.at, new Date(), tz)}
                      {last.context && `, ${contextLabel(t, last.context)}`}
                    </div>
                  </div>
                  <Sparkline
                    values={points.map((p) => p.value)}
                    className="h-9 w-24"
                    label={t("app.tracking.trend", { name })}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {untracked.length > 0 && (
        <section className="mt-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold">
            {t("app.tracking.start")}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {untracked.map((m) => {
              const Icon = metricIcon(m.key);
              return (
                <Link
                  key={m.id}
                  href={`/tracking?add=1&metric=${m.key}`}
                  scroll={false}
                  className="bg-card/50 hover:border-primary/40 hover:bg-card flex items-center gap-2.5 rounded-md border border-dashed px-3 py-3 text-sm transition"
                >
                  <Icon className="text-muted-foreground size-4" />
                  <span className="truncate">{metricName(t, m)}</span>
                  <Plus className="text-muted-foreground ml-auto size-4" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
