import { sortByCategory } from "@/lib/lab-groups";
import { ledgerRange } from "@/lib/lab-range";
import Link from "next/link";
import type { Metadata } from "next";
import { Bot, Plus, Upload } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getDashboard } from "@/server/services/dashboard";
import { listPendingImports } from "@/server/services/imports";
import { getLabPanel, seriesKey } from "@/server/services/labs";
import { MetricRow } from "@/components/dashboard/metric-card";
import { ResultLedger } from "@/components/labs/result-ledger";
import { TimelineList } from "@/components/timeline/timeline-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateLong } from "@/lib/format";
import { toNum } from "@/lib/utils";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.home") };
}

function greeting(tz: string) {
  const h = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: tz }).format(
      new Date(),
    ),
  );
  return h < 12 ? "app.dash.morning" : h < 17 ? "app.dash.afternoon" : "app.dash.evening";
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-primary -my-2 inline-flex min-h-11 items-center py-2 text-[15px] font-medium underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser();
  const t = await getT();
  const [data, pending, sp] = await Promise.all([
    getDashboard(user.id),
    listPendingImports(user.id),
    searchParams,
  ]);
  const tz = user.timezone;
  const firstName = user.name.split(" ")[0];
  const isEmpty = !data.cards.length && !data.timeline.length && !data.totals.documents;

  const latest = data.recentPanels[0]
    ? await getLabPanel(user.id, data.recentPanels[0].id).catch(() => null)
    : null;
  const latestRows = latest
    ? sortByCategory(latest.results)
        // Results outside their range first, then the rest by category and name.
        .sort((a, b) => Number(isOut(b.flag)) - Number(isOut(a.flag)))
        .slice(0, 6)
    : [];
  const readings = data.cards.filter((c) => c.kind === "measurement");
  const labTrends = data.cards.filter((c) => c.kind === "lab");
  const latestDoc = latest?.document && !latest.document.deletedAt ? latest.document : null;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold sm:text-[2.5rem]">
            {t(sp.welcome ? "app.dash.welcome" : greeting(tz), { name: firstName })}
          </h1>
          <p className="text-muted-foreground mt-1">{formatDateLong(new Date(), tz)}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {/* On computers "Add a report" lives in the top bar. */}
          <Button asChild size="lg" className="w-full sm:w-auto lg:hidden">
            <Link href="/documents?upload=1">
              <Upload /> {t("app.dash.addReport")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/tracking?add=1">
              <Plus /> {t("app.dash.addReading")}
            </Link>
          </Button>
        </div>
      </header>

      {user.isDemo && (
        <p className="border-marigold text-muted-foreground border-l-[3px] pl-3 text-[15px]">
          {t("app.dash.demo")}
        </p>
      )}

      {pending.length > 0 && (
        <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium">
              {t("app.dash.pendingTitle", { name: pending[0].document?.name ?? "" })}
            </span>{" "}
            <span className="text-muted-foreground">{t("app.dash.pendingBody")}</span>
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/labs/import/${pending[0].id}`}>{t("app.dash.review")}</Link>
          </Button>
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          icon={Upload}
          title={t("app.dash.emptyTitle")}
          description={t("app.dash.emptyBody")}
          action={
            <>
              <Button asChild>
                <Link href="/documents?upload=1">
                  <Upload /> {t("app.dash.addReport")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tracking?add=1">
                  <Plus /> {t("app.dash.addReading")}
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          {latest && (
            <section aria-labelledby="latest-report">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="text-muted-foreground text-[15px]">{t("app.dash.latestReport")}</p>
                  <h2 id="latest-report" className="text-2xl font-semibold">
                    {latest.name}
                  </h2>
                  <p className="text-muted-foreground text-[15px]">
                    {formatDate(latest.collectedAt, tz)}
                    {latest.labName && `, ${latest.labName}`}
                    {latestDoc && (
                      <>
                        {t("app.dash.fromBefore")}
                        <Link
                          href={`/documents/${latestDoc.id}`}
                          className="hover:text-foreground underline underline-offset-2"
                        >
                          {latestDoc.name}
                        </Link>
                        {t("app.dash.fromAfter")}
                      </>
                    )}
                  </p>
                </div>
                <SectionLink href={`/labs/reports/${latest.id}`}>
                  {latest.results.length > latestRows.length
                    ? t("app.dash.allResults", { n: latest.results.length })
                    : t("app.dash.openReport")}
                </SectionLink>
              </div>
              <div className="surface">
                <ResultLedger
                  label={t("app.dash.resultsFrom", { name: latest.name })}
                  results={latestRows.map((r) => ({
                    id: r.id,
                    testName: r.testName,
                    href: `/labs/tests/${encodeURIComponent(seriesKey(r))}`,
                    value: toNum(r.valueNumeric),
                    valueText: r.valueText,
                    unit: r.unit,
                    ...ledgerRange(r),
                    flag: r.flag,
                    notes: r.notes,
                  }))}
                />
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <div className="space-y-10">
              <section aria-labelledby="readings">
                <div className="mb-3 flex items-end justify-between">
                  <h2 id="readings" className="text-xl font-semibold">
                    {t("nav.tracking")}
                  </h2>
                  <SectionLink href="/tracking">{t("app.dash.allReadings")}</SectionLink>
                </div>
                {readings.length ? (
                  <ul className="surface divide-y">
                    {readings.map((c) => (
                      <MetricRow key={c.key} card={c} prefs={user.prefs} timezone={tz} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    {t("app.dash.noReadings")}{" "}
                    <Link
                      href="/tracking?add=1"
                      className="text-primary font-medium underline-offset-2 hover:underline"
                    >
                      {t("app.dash.addFirst")}
                    </Link>
                    .
                  </p>
                )}
              </section>

              {labTrends.length > 0 && (
                <section aria-labelledby="lab-trends">
                  <div className="mb-3 flex items-end justify-between">
                    <h2 id="lab-trends" className="text-xl font-semibold">
                      {t("app.dash.labTrends")}
                    </h2>
                    <SectionLink href="/labs">{t("app.dash.allLabs")}</SectionLink>
                  </div>
                  <ul className="surface divide-y">
                    {labTrends.map((c) => (
                      <MetricRow key={c.key} card={c} prefs={user.prefs} timezone={tz} />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="space-y-10">
              <section aria-labelledby="recent">
                <div className="mb-3 flex items-end justify-between">
                  <h2 id="recent" className="text-xl font-semibold">
                    {t("app.dash.recent")}
                  </h2>
                  <SectionLink href="/timeline">{t("nav.timeline")}</SectionLink>
                </div>
                {data.timeline.length ? (
                  <TimelineList events={data.timeline} timezone={tz} compact />
                ) : (
                  <p className="text-muted-foreground">{t("app.dash.recentEmpty")}</p>
                )}
              </section>

              <section aria-labelledby="ask" className="surface p-6">
                <h2 id="ask" className="text-lg font-semibold">
                  {t("app.dash.askTitle")}
                </h2>
                <p className="text-muted-foreground mt-1 text-[15px]">{t("app.dash.askBody")}</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/assistant">
                    <Bot /> {t("nav.assistant")}
                  </Link>
                </Button>
                {data.recentConversations.length > 0 && (
                  <ul className="mt-4 space-y-1 border-t pt-3">
                    {data.recentConversations.slice(0, 3).map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/assistant/${c.id}`}
                          className="hover:text-primary block truncate py-1 text-[15px]"
                        >
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const isOut = (flag: string) => flag === "HIGH" || flag === "LOW" || flag === "ABNORMAL";
