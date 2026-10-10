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

export const metadata: Metadata = { title: "Home" };

function greeting(tz: string) {
  const h = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: tz }).format(
      new Date(),
    ),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
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
    ? [...latest.results]
        // Results outside the printed range first, then the rest in report order.
        .sort((a, b) => Number(isOut(b.flag)) - Number(isOut(a.flag)))
        .slice(0, 6)
    : [];
  const readings = data.cards.filter((c) => c.kind === "measurement");
  const labTrends = data.cards.filter((c) => c.kind === "lab");
  const latestDoc = latest?.document && !latest.document.deletedAt ? latest.document : null;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold sm:text-[2.5rem]">
            {sp.welcome ? `Welcome, ${firstName}` : `${greeting(tz)}, ${firstName}`}
          </h1>
          <p className="text-muted-foreground mt-1">{formatDateLong(new Date(), tz)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link href="/documents?upload=1">
              <Upload /> Add a report
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/tracking?add=1">
              <Plus /> Add a reading
            </Link>
          </Button>
        </div>
      </header>

      {user.isDemo && (
        <p className="border-marigold text-muted-foreground border-l-[3px] pl-3 text-[15px]">
          This is the demo account. Ananya Sharma is a made-up patient and none of these results are
          real.
        </p>
      )}

      {pending.length > 0 && (
        <div className="bg-card flex flex-col gap-3 rounded-[var(--radius)] border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium">
              Values from “{pending[0].document?.name}” need a look.
            </span>{" "}
            <span className="text-muted-foreground">
              They were read before results were saved automatically.
            </span>
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/labs/import/${pending[0].id}`}>Review them</Link>
          </Button>
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          icon={Upload}
          title="Start with a lab report"
          description="Upload a PDF or take a photo of a report. Kosha reads every test result and saves it with the report's date, so you can see how your numbers change."
          action={
            <>
              <Button asChild>
                <Link href="/documents?upload=1">
                  <Upload /> Add a report
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tracking?add=1">
                  <Plus /> Add a reading
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
                  <p className="text-muted-foreground text-[15px]">Your latest report</p>
                  <h2 id="latest-report" className="text-2xl font-semibold">
                    {latest.name}
                  </h2>
                  <p className="text-muted-foreground text-[15px]">
                    {formatDate(latest.collectedAt, tz)}
                    {latest.labName && `, ${latest.labName}`}
                    {latestDoc && (
                      <>
                        {". From "}
                        <Link
                          href={`/documents/${latestDoc.id}`}
                          className="hover:text-foreground underline underline-offset-2"
                        >
                          {latestDoc.name}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <SectionLink href={`/labs/reports/${latest.id}`}>
                  {latest.results.length > latestRows.length
                    ? `All ${latest.results.length} results`
                    : "Open report"}
                </SectionLink>
              </div>
              <div className="bg-card rounded-[var(--radius)] border">
                <ResultLedger
                  label={`Results from ${latest.name}`}
                  results={latestRows.map((r) => ({
                    id: r.id,
                    testName: r.testName,
                    href: `/labs/tests/${encodeURIComponent(seriesKey(r))}`,
                    value: toNum(r.valueNumeric),
                    valueText: r.valueText,
                    unit: r.unit,
                    refLow: toNum(r.refLow),
                    refHigh: toNum(r.refHigh),
                    refText: r.refText,
                    flag: r.flag,
                    notes: r.notes,
                  }))}
                />
              </div>
            </section>
          )}

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="space-y-10">
              <section aria-labelledby="readings">
                <div className="mb-3 flex items-end justify-between">
                  <h2 id="readings" className="text-xl font-semibold">
                    Readings
                  </h2>
                  <SectionLink href="/tracking">All readings</SectionLink>
                </div>
                {readings.length ? (
                  <ul className="bg-card divide-y rounded-[var(--radius)] border">
                    {readings.map((c) => (
                      <MetricRow key={c.key} card={c} prefs={user.prefs} timezone={tz} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No readings yet.{" "}
                    <Link
                      href="/tracking?add=1"
                      className="text-primary font-medium underline-offset-2 hover:underline"
                    >
                      Add your blood pressure, sugar or weight
                    </Link>
                    .
                  </p>
                )}
              </section>

              {labTrends.length > 0 && (
                <section aria-labelledby="lab-trends">
                  <div className="mb-3 flex items-end justify-between">
                    <h2 id="lab-trends" className="text-xl font-semibold">
                      Tests over time
                    </h2>
                    <SectionLink href="/labs">All lab results</SectionLink>
                  </div>
                  <ul className="bg-card divide-y rounded-[var(--radius)] border">
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
                    Recently added
                  </h2>
                  <SectionLink href="/timeline">Timeline</SectionLink>
                </div>
                {data.timeline.length ? (
                  <TimelineList events={data.timeline} timezone={tz} compact />
                ) : (
                  <p className="text-muted-foreground">
                    Visits, reports and files you add will appear here in date order.
                  </p>
                )}
              </section>

              <section
                aria-labelledby="ask"
                className="border-primary/25 bg-accent/50 rounded-[var(--radius)] border p-5"
              >
                <h2 id="ask" className="text-lg font-semibold">
                  Ask about your records
                </h2>
                <p className="text-muted-foreground mt-1 text-[15px]">
                  For example, “How has my HbA1c changed?” Answers come only from what you&apos;ve
                  saved, with links to the reports.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/assistant">
                    <Bot /> Ask Kosha
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
