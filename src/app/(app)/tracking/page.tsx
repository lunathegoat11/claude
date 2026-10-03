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
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { presentMeasurement } from "@/lib/display";
import { preferredInputUnits, toMetricOption } from "@/lib/tracking-helpers";

export const metadata: Metadata = { title: "Health tracking" };

export default async function TrackingPage() {
  const user = await requireUser();
  const { metrics, tracked } = await metricOverview(user.id);
  const tz = user.timezone;
  const options = metrics.map(toMetricOption);
  const trackedIds = new Set(tracked.map((t) => t.metric.id));
  const untracked = metrics.filter((m) => !trackedIds.has(m.id));
  const now = toDateTimeInputValue(new Date(), tz);
  const prefs = preferredInputUnits(user.prefs);

  return (
    <div>
      <PageHeader
        title="Health tracking"
        description="Blood sugar, blood pressure, weight and more — recorded over time."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/tracking/import">
                <FileSpreadsheet /> Import CSV
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
          title="No readings yet"
          description="Add your first blood pressure, sugar, weight or other reading. You'll see trends once you have a few."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tracked.map(({ metric, count, points }) => {
            const Icon = metricIcon(metric.key);
            const last = points[points.length - 1];
            const pres = presentMeasurement(metric, last.value, last.value2, user.prefs);
            return (
              <Link
                key={metric.id}
                href={`/tracking/${metric.key}`}
                className="group bg-card hover:border-primary/30 rounded-2xl border p-5 transition hover:shadow-sm"
              >
                <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <span className="bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </span>
                  {metric.name}
                  <span className="ml-auto text-xs font-normal">{count} readings</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="tabular text-[26px] leading-none font-semibold tracking-tight">
                        {pres.text}
                      </span>
                      <span className="text-muted-foreground text-sm">{pres.unit}</span>
                    </div>
                    <div className="text-muted-foreground mt-2 text-[13px]">
                      {formatRelativeDateTime(last.at, new Date(), tz)}
                      {last.context && ` · ${CONTEXT_LABELS[last.context] ?? last.context}`}
                    </div>
                  </div>
                  <Sparkline
                    values={points.map((p) => p.value)}
                    className="h-9 w-24"
                    label={`${metric.name} trend`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {untracked.length > 0 && (
        <section className="mt-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold">Start tracking</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {untracked.map((m) => {
              const Icon = metricIcon(m.key);
              return (
                <Link
                  key={m.id}
                  href={`/tracking?add=1&metric=${m.key}`}
                  scroll={false}
                  className="bg-card/50 hover:border-primary/40 hover:bg-card flex items-center gap-2.5 rounded-xl border border-dashed px-3 py-3 text-sm transition"
                >
                  <Icon className="text-muted-foreground size-4" />
                  <span className="truncate">{m.name}</span>
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
