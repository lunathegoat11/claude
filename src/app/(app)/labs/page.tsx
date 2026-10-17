import { RangeStrip } from "@/components/labs/range-strip";
import { rangeOf } from "@/lib/lab-range";
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
import { CATEGORY_KEYS } from "@/lib/catalog/category-keys";
import {
  CATEGORY_ORDER,
  byName,
  categoriesOf,
  getBiomarker,
  type BiomarkerCategory,
} from "@/lib/catalog/biomarkers";
import { getT } from "@/i18n/server";
import { translateRangeLabel } from "@/components/labs/result-ledger";
import { formatDate, formatNumber } from "@/lib/format";
import { cn, toNum } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("labs.meta.list") };
}

export default async function LabsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const user = await requireUser();
  const t = await getT();
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

  // Each test under its category (some, like hs-CRP, under two), alphabetically.
  const grouped = new Map<BiomarkerCategory, typeof series>();
  for (const s of series)
    for (const c of categoriesOf(getBiomarker(s.biomarkerCode)))
      grouped.set(c, [...(grouped.get(c) ?? []), s]);
  for (const list of grouped.values())
    list.sort((a, b) => byName({ name: a.testName }, { name: b.testName }));
  const order = CATEGORY_ORDER;

  return (
    <div>
      <PageHeader
        title={t("labs.list.title")}
        description={t("labs.list.description")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/labs/new">
                <Plus /> {t("labs.list.typeIn")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/documents?upload=1">
                <Upload /> {t("labs.list.addReport")}
              </Link>
            </Button>
          </>
        }
      />

      {pending.length > 0 && (
        <Card className="border-primary/30 bg-accent/40 mb-6">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <strong>{t.n("labs.list.pending", pending.length)}</strong>{" "}
              {t("labs.list.pendingAfter")}
            </p>
            <Button asChild size="sm">
              <Link href={`/labs/import/${pending[0].id}`}>{t("labs.list.reviewNow")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!hasData ? (
        <EmptyState
          icon={FlaskConical}
          title={t("labs.empty.title")}
          description={t("labs.empty.description")}
          action={
            <>
              <Button asChild>
                <Link href="/labs/new">
                  <Plus /> {t("labs.empty.add")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/documents?upload=1">
                  <Upload /> {t("labs.empty.upload")}
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          <nav
            className="bg-muted mb-6 inline-flex rounded-md p-1"
            aria-label={t("labs.list.views")}
          >
            {[
              ["tests", t("labs.list.byTest")],
              ["reports", t("labs.list.byReport")],
            ].map(([k, l]) => (
              <Link
                key={k}
                href={k === "tests" ? "/labs" : "/labs?tab=reports"}
                aria-current={tab === k ? "page" : undefined}
                className={cn(
                  "text-muted-foreground inline-flex h-8 items-center rounded-lg px-4 text-sm font-medium pointer-coarse:h-10",
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
                      {t(CATEGORY_KEYS[cat])}
                    </h2>
                    <ul className="surface divide-y overflow-hidden">
                      {grouped.get(cat)!.map((s) => {
                        const latest = toNum(s.latest.valueNumeric);
                        const range = rangeOf(s.latest);
                        const prev =
                          s.previous && s.previous.unit === s.latest.unit
                            ? toNum(s.previous.valueNumeric)
                            : null;
                        return (
                          <li key={s.key} className="lazy-row">
                            <Link
                              href={`/labs/tests/${encodeURIComponent(s.key)}`}
                              className="hover:bg-muted/60 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_96px_132px] sm:px-5"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium">{s.testName}</div>
                                <div className="text-muted-foreground text-xs">
                                  {t.n("labs.list.count", s.count, {
                                    date: formatDate(s.latest.observedAt, tz),
                                  })}
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
                                    {t("labs.list.previous", { value: formatNumber(prev, 2) })}
                                  </div>
                                )}
                              </div>
                              <Sparkline
                                values={s.values}
                                className="hidden h-8 w-24 sm:block"
                                label={t("labs.list.history", { name: s.testName })}
                              />
                              <div className="hidden sm:block sm:justify-self-end">
                                <FlagBadge flag={s.latest.flag} compact />
                              </div>
                              <div className="col-span-2 mt-1 sm:col-span-4">
                                <RangeStrip value={latest} low={range.low} high={range.high} />
                                <div className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-[13px]">
                                  <span className="tabular">
                                    {range.text
                                      ? `${translateRangeLabel(t, range.label)} ${range.text}`
                                      : t("labs.range.none")}
                                  </span>
                                  <span className="sm:hidden">
                                    <FlagBadge flag={s.latest.flag} compact />
                                  </span>
                                </div>
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
              <ul className="surface divide-y overflow-hidden">
                {panels.items.map((p) => (
                  <li key={p.id} className="lazy-row">
                    <Link
                      href={`/labs/reports/${p.id}`}
                      className="hover:bg-muted/60 flex items-center gap-4 px-4 py-4 sm:px-5"
                    >
                      <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
                        <FlaskConical className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 leading-snug font-medium">{p.name}</div>
                        <div className="text-muted-foreground truncate text-sm">
                          {formatDate(p.collectedAt, tz)}
                          {p.labName && `, ${p.labName}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-muted-foreground text-sm">
                          {t.n("labs.list.results", p.resultCount)}
                        </span>
                        {p.flaggedCount > 0 && (
                          <Badge variant="warning">
                            {t("labs.list.outside", { n: p.flaggedCount })}
                          </Badge>
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
                label={t("labs.list.paginationLabel")}
                makeHref={(p) => `/labs?tab=reports&page=${p}`}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
