import Link from "next/link";
import type { Metadata } from "next";
import type { TimelineCategory } from "@prisma/client";
import { CalendarClock, ChevronDown } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listTimeline } from "@/server/services/timeline";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TimelineList } from "@/components/timeline/timeline-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("files.meta.timeline") };
}

const FILTERS: { key: string; label: MessageKey; category?: TimelineCategory }[] = [
  { key: "", label: "files.timeline.filter.all" },
  { key: "VISIT", label: "files.timeline.filter.VISIT", category: "VISIT" },
  { key: "LAB", label: "files.timeline.filter.LAB", category: "LAB" },
  { key: "DIAGNOSIS", label: "files.timeline.filter.DIAGNOSIS", category: "DIAGNOSIS" },
  {
    key: "HOSPITALIZATION",
    label: "files.timeline.filter.HOSPITALIZATION",
    category: "HOSPITALIZATION",
  },
  { key: "PROCEDURE", label: "files.timeline.filter.PROCEDURE", category: "PROCEDURE" },
  { key: "VACCINATION", label: "files.timeline.filter.VACCINATION", category: "VACCINATION" },
  { key: "PRESCRIPTION", label: "files.timeline.filter.PRESCRIPTION", category: "PRESCRIPTION" },
  { key: "DOCUMENT", label: "files.timeline.filter.DOCUMENT", category: "DOCUMENT" },
  { key: "MEASUREMENT", label: "files.timeline.filter.MEASUREMENT", category: "MEASUREMENT" },
];

type SP = { category?: string; readings?: string; before?: string };

export default async function TimelinePage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const filter = FILTERS.find((f) => f.key === sp.category) ?? FILTERS[0];
  const includeRoutine = sp.readings === "1" || filter.category === "MEASUREMENT";
  const before =
    sp.before && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : undefined;
  const { items, hasMore, nextCursor } = await listTimeline(user.id, {
    category: filter.category,
    includeRoutine,
    before,
    limit: 60,
  });
  const qs = (over: Partial<SP>) =>
    `/timeline?${new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("files.timeline.title")} description={t("files.timeline.description")} />
      <div className="mb-6 space-y-3">
        <nav
          aria-label={t("files.timeline.filterLabel")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={qs({ category: f.key || undefined, before: undefined })}
              aria-current={filter.key === f.key ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition pointer-coarse:py-2.5",
                filter.key === f.key
                  ? "border-primary bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t(f.label)}
            </Link>
          ))}
        </nav>
        {filter.category !== "MEASUREMENT" && (
          <Link
            href={qs({ readings: includeRoutine ? undefined : "1", before: undefined })}
            role="switch"
            aria-checked={includeRoutine}
            scroll={false}
            className="text-muted-foreground hover:text-foreground -mx-2 inline-flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-sm"
          >
            <span
              aria-hidden
              className={cn(
                "relative inline-flex h-6 w-10 shrink-0 rounded-full transition",
                includeRoutine ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                  includeRoutine ? "left-[18px]" : "left-0.5",
                )}
              />
            </span>
            {t("files.timeline.showReadings")}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t(before ? "files.timeline.empty.earlier" : "files.timeline.empty.title")}
          description={t("files.timeline.empty.description")}
        />
      ) : (
        <>
          <TimelineList events={items} timezone={user.timezone} />
          {hasMore && nextCursor && (
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={qs({ before: nextCursor.toISOString() })} scroll={false}>
                  <ChevronDown /> {t("files.timeline.showEarlier")}
                </Link>
              </Button>
            </div>
          )}
          {before && (
            <div className="mt-4 text-center">
              <Link
                href={qs({ before: undefined })}
                className="text-primary text-sm hover:underline"
              >
                {t("files.timeline.backToRecent")}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
