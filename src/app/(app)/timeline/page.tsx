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

export const metadata: Metadata = { title: "Timeline" };

const FILTERS: { key: string; label: string; category?: TimelineCategory }[] = [
  { key: "", label: "All" },
  { key: "VISIT", label: "Visits", category: "VISIT" },
  { key: "LAB", label: "Lab reports", category: "LAB" },
  { key: "DIAGNOSIS", label: "Diagnoses", category: "DIAGNOSIS" },
  { key: "HOSPITALIZATION", label: "Hospital stays", category: "HOSPITALIZATION" },
  { key: "PROCEDURE", label: "Procedures", category: "PROCEDURE" },
  { key: "VACCINATION", label: "Vaccinations", category: "VACCINATION" },
  { key: "PRESCRIPTION", label: "Prescriptions", category: "PRESCRIPTION" },
  { key: "DOCUMENT", label: "Documents", category: "DOCUMENT" },
  { key: "MEASUREMENT", label: "Readings", category: "MEASUREMENT" },
];

type SP = { category?: string; readings?: string; before?: string };

export default async function TimelinePage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
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
      <PageHeader
        title="Your health timeline"
        description="Every visit, report, document and reading — in the order it happened."
      />
      <div className="mb-6 space-y-3">
        <nav
          aria-label="Filter timeline"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={qs({ category: f.key || undefined, before: undefined })}
              aria-current={filter.key === f.key ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
                filter.key === f.key
                  ? "border-primary bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
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
            Show individual readings
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={before ? "No earlier events" : "Nothing here yet"}
          description="As you add records, lab reports, documents and readings, they'll appear here in date order."
        />
      ) : (
        <>
          <TimelineList events={items} timezone={user.timezone} />
          {hasMore && nextCursor && (
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={qs({ before: nextCursor.toISOString() })} scroll={false}>
                  <ChevronDown /> Show earlier events
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
                Back to most recent
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
