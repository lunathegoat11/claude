import Link from "next/link";
import type { TimelineEvent } from "@prisma/client";
import { TIMELINE_ICONS } from "@/components/shared/icons";
import { formatDayMonth, formatMonthYear, formatTime } from "@/lib/format";
import { timelineHref } from "@/server/services/timeline";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  LAB: "bg-info/12 text-info",
  MEASUREMENT: "bg-accent text-accent-foreground",
  DOCUMENT: "bg-muted text-muted-foreground",
  HOSPITALIZATION: "bg-destructive/10 text-destructive",
  PROCEDURE: "bg-info/12 text-info",
};

function dayKey(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Chronological, grouped-by-month timeline. */
export function TimelineList({
  events,
  timezone,
  compact,
}: {
  events: TimelineEvent[];
  timezone: string;
  compact?: boolean;
}) {
  const groups: { month: string; days: { key: string; date: Date; items: TimelineEvent[] }[] }[] =
    [];
  for (const e of events) {
    const month = formatMonthYear(e.occurredAt, timezone);
    let g = groups[groups.length - 1];
    if (!g || g.month !== month) groups.push((g = { month, days: [] }));
    const k = dayKey(e.occurredAt, timezone);
    let d = g.days[g.days.length - 1];
    if (!d || d.key !== k) g.days.push((d = { key: k, date: e.occurredAt, items: [] }));
    d.items.push(e);
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.month} aria-label={g.month}>
          {!compact && (
            <h2 className="bg-background/90 sticky top-16 z-10 -mx-1 mb-3 px-1 py-2 text-sm font-semibold backdrop-blur">
              {g.month}
            </h2>
          )}
          <ol className="relative space-y-1">
            {g.days.map((d) => (
              <li
                key={d.key}
                className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:gap-5"
              >
                <div className="pt-3 text-right">
                  <div className="tabular text-[13px] leading-none font-semibold">
                    {formatDayMonth(d.date, timezone).split(" ")[0]}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11px] tracking-wide uppercase">
                    {formatDayMonth(d.date, timezone).split(" ")[1]}
                  </div>
                </div>
                <ol className="relative space-y-1 border-l pl-4 sm:pl-6">
                  {d.items.map((e) => {
                    const Icon = TIMELINE_ICONS[e.category];
                    return (
                      <li key={e.id} className="relative">
                        <span
                          className={cn(
                            "ring-background absolute top-3 -left-[calc(1rem+13px)] flex size-[26px] items-center justify-center rounded-full ring-4 sm:-left-[calc(1.5rem+13px)]",
                            TONE[e.category] ?? "bg-accent text-accent-foreground",
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <Link
                          href={timelineHref(e)}
                          className="hover:bg-muted block rounded-xl px-3 py-2.5 transition-colors"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span
                              className={cn(
                                "leading-snug font-medium",
                                e.importance >= 3 && "text-foreground",
                                e.importance === 1 && "text-[14px]",
                              )}
                            >
                              {e.title}
                            </span>
                            {e.category === "MEASUREMENT" && (
                              <span className="text-muted-foreground tabular shrink-0 text-xs">
                                {formatTime(e.occurredAt, timezone)}
                              </span>
                            )}
                          </div>
                          {e.summary && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[13.5px]">
                              {e.summary}
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
