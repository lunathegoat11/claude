import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarClock,
  FilePlus2,
  FlaskConical,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getDashboard } from "@/server/services/dashboard";
import { listPendingImports } from "@/server/services/imports";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TimelineList } from "@/components/timeline/timeline-list";
import { EmptyState } from "@/components/shared/empty-state";
import { DOCUMENT_ICONS, metricIcon } from "@/components/shared/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPE_LABELS } from "@/lib/catalog/labels";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import {
  formatDate,
  formatDateLong,
  formatRelativeDate,
  formatRelativeDateTime,
} from "@/lib/format";
import { presentMeasurement } from "@/lib/display";

export const metadata: Metadata = { title: "Dashboard" };

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
      className="text-primary -my-2 inline-flex min-h-10 items-center gap-1 py-2 text-[13px] font-medium hover:underline"
    >
      {children} <ArrowRight className="size-3.5" />
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{formatDateLong(new Date(), tz)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {sp.welcome ? `Welcome, ${firstName}` : `${greeting(tz)}, ${firstName}`}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/tracking?add=1">
              <Plus /> Add reading
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/labs/new">
              <FlaskConical /> Add lab result
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/documents?upload=1">
              <Upload /> Upload
            </Link>
          </Button>
        </div>
      </div>

      {user.isDemo && (
        <div className="border-warning/50 bg-warning/6 flex items-start gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm">
          <Sparkles className="text-warning mt-0.5 size-4 shrink-0" />
          <p>
            You&apos;re viewing a <strong>demo account</strong> with a fictional patient, Ananya
            Sharma. All data here is sample data and not real medical information.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <Card className="border-primary/30 bg-accent/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <FlaskConical className="text-primary mt-0.5 size-5" />
              <div>
                <p className="font-medium">Lab values are waiting for your review</p>
                <p className="text-muted-foreground text-sm">
                  We found possible results in “{pending[0].document?.name}”. Nothing is saved until
                  you confirm.
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href={`/labs/import/${pending[0].id}`}>Review values</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isEmpty ? (
        <EmptyState
          icon={Activity}
          title="Let's start your health record"
          description="Add a blood pressure or sugar reading, enter a lab report, or upload a prescription. Your dashboard will fill in as you go."
          action={
            <>
              <Button asChild>
                <Link href="/tracking?add=1">
                  <Plus /> Add first reading
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/documents?upload=1">
                  <Upload /> Upload a document
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          <section aria-labelledby="overview">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="overview" className="text-base font-semibold">
                Overview
              </h2>
              <SectionLink href="/tracking">All measurements</SectionLink>
            </div>
            {data.cards.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.cards.map((c) => (
                  <MetricCard
                    key={`${c.kind}-${c.key}`}
                    card={c}
                    prefs={user.prefs}
                    timezone={tz}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon={Activity}
                title="No measurements yet"
                description="Readings you record will appear here with their trends."
                action={
                  <Button asChild size="sm">
                    <Link href="/tracking?add=1">
                      <Plus /> Add reading
                    </Link>
                  </Button>
                }
              />
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] [&>*]:min-w-0">
            <Card>
              <CardHeader className="flex-row items-baseline justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="text-primary size-4" /> Recent health events
                </CardTitle>
                <SectionLink href="/timeline">Full timeline</SectionLink>
              </CardHeader>
              <CardContent>
                {data.timeline.length ? (
                  <TimelineList events={data.timeline} timezone={tz} compact />
                ) : (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    Doctor visits, lab reports and documents will appear here.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="flex-row items-baseline justify-between">
                  <CardTitle>Recent lab reports</CardTitle>
                  <SectionLink href="/labs">Lab results</SectionLink>
                </CardHeader>
                <CardContent className="space-y-1">
                  {data.recentPanels.length ? (
                    data.recentPanels.map((p) => (
                      <Link
                        key={p.id}
                        href={`/labs/reports/${p.id}`}
                        className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{p.name}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {formatDate(p.collectedAt, tz)}
                            {p.labName && ` · ${p.labName}`}
                          </div>
                        </div>
                        {p.flagged > 0 ? (
                          <Badge variant="warning">{p.flagged} outside range</Badge>
                        ) : (
                          <Badge variant="secondary">{p.total} results</Badge>
                        )}
                      </Link>
                    ))
                  ) : (
                    <p className="text-muted-foreground py-3 text-sm">No lab reports yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-baseline justify-between">
                  <CardTitle>Recent measurements</CardTitle>
                  <SectionLink href="/tracking">Tracking</SectionLink>
                </CardHeader>
                <CardContent className="space-y-1">
                  {data.recentMeasurements.length ? (
                    data.recentMeasurements.map((m) => {
                      const Icon = metricIcon(m.metric.key);
                      const pres = presentMeasurement(
                        { ...m.metric, unit: m.unit },
                        m.value,
                        m.value2,
                        user.prefs,
                      );
                      return (
                        <Link
                          key={m.id}
                          href={`/tracking/${m.metric.key}`}
                          className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-xl px-2 py-2"
                        >
                          <Icon className="text-muted-foreground size-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm">
                              {m.metric.name}
                              {m.context && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {CONTEXT_LABELS[m.context] ?? m.context}
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatRelativeDateTime(m.measuredAt, new Date(), tz)}
                            </div>
                          </div>
                          <div className="tabular text-sm font-semibold">
                            {pres.text}{" "}
                            <span className="text-muted-foreground font-normal">{pres.unit}</span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground py-3 text-sm">No readings yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-baseline justify-between">
                  <CardTitle>Recent uploads</CardTitle>
                  <SectionLink href="/documents">Documents</SectionLink>
                </CardHeader>
                <CardContent className="space-y-1">
                  {data.recentDocuments.length ? (
                    data.recentDocuments.map((d) => {
                      const Icon = DOCUMENT_ICONS[d.type];
                      return (
                        <Link
                          key={d.id}
                          href={`/documents/${d.id}`}
                          className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-xl px-2 py-2"
                        >
                          <span className="bg-muted flex size-8 items-center justify-center rounded-lg">
                            <Icon className="text-muted-foreground size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{d.name}</div>
                            <div className="text-muted-foreground text-xs">
                              {DOCUMENT_TYPE_LABELS[d.type]} ·{" "}
                              {formatRelativeDate(d.createdAt, new Date(), tz)}
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <Link
                      href="/documents?upload=1"
                      className="text-primary flex items-center gap-2 py-2 text-sm"
                    >
                      <FilePlus2 className="size-4" /> Upload your first document
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-baseline justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="text-primary size-4" /> Recent AI summaries
                  </CardTitle>
                  <SectionLink href="/assistant">Assistant</SectionLink>
                </CardHeader>
                <CardContent className="space-y-1">
                  {data.recentConversations.length ? (
                    data.recentConversations.map((c) => (
                      <Link
                        key={c.id}
                        href={`/assistant/${c.id}`}
                        className="hover:bg-muted -mx-2 block rounded-xl px-2 py-2"
                      >
                        <div className="truncate text-sm font-medium">{c.title}</div>
                        <div className="text-muted-foreground line-clamp-1 text-xs">
                          {c.messages[0]?.content
                            .replace(/\[[A-Z]\d{1,3}\]/g, "")
                            .replace(/[*>#]/g, "")
                            .slice(0, 120) ?? "No answer yet"}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <Link
                      href="/assistant"
                      className="text-primary flex items-center gap-2 py-2 text-sm"
                    >
                      <Sparkles className="size-4" /> Ask about your records
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
