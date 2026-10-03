import Link from "next/link";
import type { Metadata } from "next";
import { FlaskConical, Plus, Upload } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listLabPanels, listTestSeries } from "@/server/services/labs";
import { listPendingImports } from "@/server/services/imports";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Sparkline } from "@/components/charts/sparkline";
import { FlagBadge } from "@/components/labs/flag-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, type BiomarkerCategory } from "@/lib/catalog/biomarkers";
import { formatDate, formatNumber } from "@/lib/format";
import { cn, toNum } from "@/lib/utils";

export const metadata: Metadata = { title: "Lab results" };

export default async function LabsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = sp.tab === "reports" ? "reports" : "tests";
  const tz = user.timezone;
  const [series, panels, pending] = await Promise.all([
    tab === "tests" ? listTestSeries(user.id) : Promise.resolve([]),
    tab === "reports"
      ? listLabPanels(user.id, { page: Number(sp.page) || 1 })
      : listLabPanels(user.id, { pageSize: 1 }),
    listPendingImports(user.id),
  ]);
  const hasData = panels.total > 0;

  const grouped = new Map<string, typeof series>();
  for (const s of series) grouped.set(s.category, [...(grouped.get(s.category) ?? []), s]);
  const order: BiomarkerCategory[] = [
    "DIABETES",
    "LIPID",
    "CBC",
    "THYROID",
    "LIVER",
    "KIDNEY",
    "METABOLIC",
    "VITAMINS",
    "OTHER",
  ];

  return (
    <div>
      <PageHeader
        title="Lab results"
        description="Every test result with the reference range printed on its own report. Compare values across dates."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/documents?upload=1">
                <Upload /> Import report
              </Link>
            </Button>
            <Button asChild>
              <Link href="/labs/new">
                <Plus /> Add results
              </Link>
            </Button>
          </>
        }
      />

      {pending.length > 0 && (
        <Card className="border-primary/30 bg-accent/40 mb-6">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <strong>
                {pending.length} imported report{pending.length > 1 ? "s" : ""}
              </strong>{" "}
              waiting for review. Values aren&apos;t saved until you confirm them.
            </p>
            <Button asChild size="sm">
              <Link href={`/labs/import/${pending[0].id}`}>Review now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!hasData ? (
        <EmptyState
          icon={FlaskConical}
          title="No lab results yet"
          description="Enter values from a report, or upload a PDF lab report and we'll find the values for you to confirm."
          action={
            <>
              <Button asChild>
                <Link href="/labs/new">
                  <Plus /> Add results
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/documents?upload=1">
                  <Upload /> Upload report
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          <nav className="bg-muted mb-6 inline-flex rounded-xl p-1" aria-label="Lab views">
            {[
              ["tests", "By test"],
              ["reports", "By report"],
            ].map(([k, l]) => (
              <Link
                key={k}
                href={k === "tests" ? "/labs" : "/labs?tab=reports"}
                aria-current={tab === k ? "page" : undefined}
                className={cn(
                  "text-muted-foreground inline-flex h-8 items-center rounded-lg px-4 text-sm font-medium",
                  tab === k && "bg-card text-foreground shadow-sm",
                )}
              >
                {l}
              </Link>
            ))}
          </nav>

          {tab === "tests" ? (
            <div className="space-y-8">
              {order
                .filter((c) => grouped.has(c))
                .map((cat) => (
                  <section key={cat} aria-labelledby={`cat-${cat}`}>
                    <h2
                      id={`cat-${cat}`}
                      className="text-muted-foreground mb-3 text-sm font-semibold"
                    >
                      {CATEGORY_LABELS[cat]}
                    </h2>
                    <ul className="bg-card divide-y overflow-hidden rounded-2xl border">
                      {grouped.get(cat)!.map((s) => {
                        const latest = toNum(s.latest.valueNumeric);
                        const prev =
                          s.previous && s.previous.unit === s.latest.unit
                            ? toNum(s.previous.valueNumeric)
                            : null;
                        return (
                          <li key={s.key}>
                            <Link
                              href={`/labs/tests/${encodeURIComponent(s.key)}`}
                              className="hover:bg-muted/60 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_96px_132px] sm:px-5"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium">{s.testName}</div>
                                <div className="text-muted-foreground text-xs">
                                  {s.count} result{s.count === 1 ? "" : "s"} · latest{" "}
                                  {formatDate(s.latest.observedAt, tz)}
                                </div>
                              </div>
                              <div className="text-right sm:text-left">
                                <span className="tabular text-lg font-semibold">
                                  {latest !== null ? formatNumber(latest, 2) : s.latest.valueText}
                                </span>{" "}
                                <span className="text-muted-foreground text-sm">
                                  {s.latest.unit}
                                </span>
                                {prev !== null && latest !== null && (
                                  <div className="text-muted-foreground tabular text-xs">
                                    previous {formatNumber(prev, 2)}
                                  </div>
                                )}
                              </div>
                              <Sparkline
                                values={s.values}
                                className="hidden h-8 w-24 sm:block"
                                label={`${s.testName} history`}
                              />
                              <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
                                <FlagBadge flag={s.latest.flag} compact />
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
            </div>
          ) : (
            <>
              <ul className="bg-card divide-y overflow-hidden rounded-2xl border">
                {panels.items.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/labs/reports/${p.id}`}
                      className="hover:bg-muted/60 flex items-center gap-4 px-4 py-4 sm:px-5"
                    >
                      <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <FlaskConical className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 leading-snug font-medium">{p.name}</div>
                        <div className="text-muted-foreground truncate text-sm">
                          {formatDate(p.collectedAt, tz)}
                          {p.labName && ` · ${p.labName}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-muted-foreground text-sm">
                          {p.resultCount} results
                        </span>
                        {p.flaggedCount > 0 && (
                          <Badge variant="warning">{p.flaggedCount} outside range</Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination
                page={panels.page}
                pageCount={panels.pageCount}
                total={panels.total}
                label="reports"
                makeHref={(p) => `/labs?tab=reports&page=${p}`}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
