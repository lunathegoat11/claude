import Link from "next/link";
import type { Metadata } from "next";
import type { RecordType } from "@prisma/client";
import { FolderHeart, List, Paperclip, Plus, Rows3 } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listRecords, listRecordTags } from "@/server/services/records";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { RECORD_ICONS } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/i18n/server";
import type { T } from "@/i18n/translate";
import { RECORD_TYPE_KEYS } from "@/i18n/messages/files-labels";
import { RECORD_TYPES } from "@/lib/validation/health";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("files.meta.records") };
}

type SP = { q?: string; type?: string; tag?: string; sort?: string; page?: string; view?: string };

export default async function RecordsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const type = RECORD_TYPES.includes(sp.type as RecordType) ? (sp.type as RecordType) : undefined;
  const sort = sp.sort === "date_asc" || sp.sort === "updated" ? sp.sort : "date_desc";
  const view = sp.view === "timeline" ? "timeline" : "list";
  const [{ items, total, page, pageCount }, tags] = await Promise.all([
    listRecords(user.id, {
      q: sp.q,
      type,
      tag: sp.tag,
      sort,
      page: Number(sp.page) || 1,
      pageSize: view === "timeline" ? 50 : 20,
    }),
    listRecordTags(user.id),
  ]);
  const filtered = !!(sp.q || type || sp.tag);
  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams(
      Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][],
    );
    return `/records?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title={t("nav.records")}
        description={t("files.records.description")}
        actions={
          <Button asChild>
            <Link href="/records/new">
              <Plus /> {t("files.records.add")}
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterBar
          action="/records"
          q={sp.q}
          placeholder={t("files.records.searchPlaceholder")}
          clearHref={filtered ? "/records" : undefined}
          hidden={{ view: sp.view }}
        >
          <FilterSelect
            name="type"
            value={type}
            label={t("files.records.typeLabel")}
            options={[
              { value: "", label: t("files.common.allTypes") },
              ...RECORD_TYPES.map((r) => ({ value: r, label: t(RECORD_TYPE_KEYS[r]) })),
            ]}
          />
          {tags.length > 0 && (
            <FilterSelect
              name="tag"
              value={sp.tag}
              label={t("files.records.tagLabel")}
              options={[
                { value: "", label: t("files.records.allTags") },
                ...tags.map((g) => ({ value: g.tag, label: `#${g.tag}` })),
              ]}
            />
          )}
          <FilterSelect
            name="sort"
            value={sort}
            label={t("files.records.sortLabel")}
            options={[
              { value: "date_desc", label: t("files.records.sort.newest") },
              { value: "date_asc", label: t("files.records.sort.oldest") },
              { value: "updated", label: t("files.records.sort.updated") },
            ]}
          />
        </FilterBar>
        <div
          className="bg-muted inline-flex self-start rounded-md p-1"
          role="group"
          aria-label={t("files.records.viewLabel")}
        >
          <Link
            href={qs({ view: undefined, page: undefined })}
            aria-current={view === "list" ? "true" : undefined}
            className={cn(
              "text-muted-foreground inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium pointer-coarse:h-10",
              view === "list" && "bg-card text-foreground shadow-sm",
            )}
          >
            <List className="size-4" /> {t("files.records.view.list")}
          </Link>
          <Link
            href={qs({ view: "timeline", page: undefined })}
            aria-current={view === "timeline" ? "true" : undefined}
            className={cn(
              "text-muted-foreground inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium pointer-coarse:h-10",
              view === "timeline" && "bg-card text-foreground shadow-sm",
            )}
          >
            <Rows3 className="size-4" /> {t("nav.timeline")}
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={FolderHeart}
            title={t("files.records.empty.filteredTitle")}
            description={t("files.common.tryDifferent")}
            action={
              <Button asChild variant="outline">
                <Link href="/records">{t("files.common.clearFilters")}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FolderHeart}
            title={t("files.records.empty.title")}
            description={t("files.records.empty.description")}
            action={
              <Button asChild>
                <Link href="/records/new">
                  <Plus /> {t("files.records.addFirst")}
                </Link>
              </Button>
            }
          />
        )
      ) : view === "timeline" ? (
        <RecordsTimeline items={items} tz={user.timezone} t={t} />
      ) : (
        <ul className="surface divide-y overflow-hidden">
          {items.map((r) => {
            const Icon = RECORD_ICONS[r.type];
            return (
              <li key={r.id} className="lazy-row">
                <Link
                  href={`/records/${r.id}`}
                  className="hover:bg-muted/60 flex items-start gap-4 px-4 py-4 transition-colors sm:px-5"
                >
                  <span className="bg-accent text-accent-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{r.title}</span>
                      {r.isDemo && <Badge variant="demo">{t("files.common.sample")}</Badge>}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-sm">
                      {t(RECORD_TYPE_KEYS[r.type])}
                      {(r.doctorName || r.facilityName) && (
                        <>, {[r.doctorName, r.facilityName].filter(Boolean).join(", ")}</>
                      )}
                    </div>
                    {r.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular text-sm">{formatDate(r.date, user.timezone)}</div>
                    {r._count.documents > 0 && (
                      <div
                        className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-xs"
                        title={t("files.records.attachedCount")}
                      >
                        <Paperclip className="size-3" aria-hidden />{" "}
                        <span className="sr-only">{t("files.records.attachedCount")}:</span>
                        {r._count.documents}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        label={t("files.pagination.records")}
        makeHref={(p) => qs({ page: String(p) })}
      />
    </div>
  );
}

function RecordsTimeline({
  items,
  tz,
  t,
}: {
  items: Awaited<ReturnType<typeof listRecords>>["items"];
  tz: string;
  t: T;
}) {
  const byYear = new Map<string, typeof items>();
  for (const r of items) {
    const y = new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: tz }).format(r.date);
    byYear.set(y, [...(byYear.get(y) ?? []), r]);
  }
  return (
    <div className="space-y-10">
      {[...byYear].map(([year, recs]) => (
        <section key={year}>
          <h2 className="tabular mb-4 text-lg font-semibold">{year}</h2>
          <ol className="relative ml-3 space-y-6 border-l pl-8">
            {recs.map((r) => {
              const Icon = RECORD_ICONS[r.type];
              return (
                <li key={r.id} className="relative">
                  <span className="bg-card text-primary ring-border absolute top-1 -left-[calc(2rem+15px)] flex size-[30px] items-center justify-center rounded-full ring-1">
                    <Icon className="size-4" />
                  </span>
                  <Link
                    href={`/records/${r.id}`}
                    className="surface block p-4 transition hover:shadow-[0_2px_4px_rgb(29_29_31/0.05),0_12px_32px_rgb(29_29_31/0.08)]"
                  >
                    <div className="text-muted-foreground text-xs font-medium">
                      {formatDate(r.date, tz)}, {t(RECORD_TYPE_KEYS[r.type])}
                    </div>
                    <div className="mt-1 font-medium">{r.title}</div>
                    {(r.doctorName || r.facilityName) && (
                      <div className="text-muted-foreground mt-0.5 text-sm">
                        {[r.doctorName, r.facilityName].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {r.notes && (
                      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{r.notes}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
