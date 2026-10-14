import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  Building2,
  FileText,
  FlaskConical,
  FolderHeart,
  Search as SearchIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { SEARCH_TYPES, searchAll, type SearchType } from "@/server/services/search";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FlagBadge } from "@/components/labs/flag-badge";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import {
  CONTEXT_KEYS,
  DOCUMENT_TYPE_KEYS,
  PROVIDER_TYPE_KEYS,
  RECORD_TYPE_KEYS,
} from "@/i18n/messages/files-labels";
import { formatDate, formatDateTime, formatNumber, parseZonedInput } from "@/lib/format";
import { presentMeasurement } from "@/lib/display";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("files.meta.search") };
}

const TYPE_LABELS: Record<SearchType, MessageKey> = {
  records: "files.search.type.records",
  documents: "files.search.type.documents",
  labs: "files.search.type.labs",
  measurements: "files.search.type.measurements",
  providers: "files.search.type.providers",
};

type SP = { q?: string; type?: string; from?: string; to?: string };

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="text-primary size-4" /> {title}{" "}
        <span className="text-muted-foreground font-normal">{count}</span>
      </h2>
      <ul className="surface divide-y overflow-hidden">{children}</ul>
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const q = (sp.q ?? "").trim();
  const type = SEARCH_TYPES.includes(sp.type as SearchType) ? (sp.type as SearchType) : undefined;
  const tz = user.timezone;
  const from = sp.from ? (parseZonedInput(sp.from, tz) ?? undefined) : undefined;
  const to = sp.to ? (parseZonedInput(sp.to, tz) ?? undefined) : undefined;
  const results =
    q || from
      ? await searchAll(user.id, q, {
          types: type ? [type] : undefined,
          from,
          to: to ? new Date(to.getTime() + 86_400_000) : undefined,
        })
      : null;
  const qs = (over: Partial<SP>) =>
    `/search?${new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("files.meta.search")} description={t("files.search.description")} />
      <div className="mb-4">
        <FilterBar
          action="/search"
          q={q}
          placeholder={t("files.search.placeholder")}
          hidden={{ type }}
          submitLabel={t("files.search.submit")}
        >
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            {t("files.search.from")}{" "}
            <input
              type="date"
              name="from"
              defaultValue={sp.from}
              className="border-input bg-card h-10 rounded-lg border px-2 text-sm"
            />
          </label>
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            {t("files.search.to")}{" "}
            <input
              type="date"
              name="to"
              defaultValue={sp.to}
              className="border-input bg-card h-10 rounded-lg border px-2 text-sm"
            />
          </label>
        </FilterBar>
      </div>
      {results && (
        <nav aria-label={t("files.search.typesLabel")} className="mb-6 flex flex-wrap gap-2">
          <Link
            href={qs({ type: undefined })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm pointer-coarse:py-2.5",
              !type
                ? "border-primary bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t("files.search.all")}
          </Link>
          {SEARCH_TYPES.map((st) => (
            <Link
              key={st}
              href={qs({ type: st })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm pointer-coarse:py-2.5",
                type === st
                  ? "border-primary bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t(TYPE_LABELS[st])}
            </Link>
          ))}
        </nav>
      )}

      {!results ? (
        <EmptyState
          icon={SearchIcon}
          title={t("files.search.empty.title")}
          description={t("files.search.empty.description")}
        />
      ) : results.total === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={t("files.search.noResults", { q })}
          description={t("files.search.noResults.description")}
        />
      ) : (
        <div className="space-y-8">
          <Section
            icon={FlaskConical}
            title={t("files.search.type.labs")}
            count={results.labs.length}
          >
            {results.labs.map((r) => (
              <li key={r.id}>
                <Link
                  href={
                    r.panelId
                      ? `/labs/reports/${r.panelId}`
                      : `/labs/tests/${encodeURIComponent(r.testKey)}`
                  }
                  className="hover:bg-muted/60 flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{r.displayName}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatDate(r.observedAt, tz)}
                      {r.labName && `, ${r.labName}`}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="tabular font-semibold">
                      {r.valueNumeric !== null ? formatNumber(r.valueNumeric, 2) : r.valueText}
                    </span>{" "}
                    <span className="text-muted-foreground">{r.unit}</span>
                  </div>
                  <FlagBadge flag={r.flag} compact />
                </Link>
              </li>
            ))}
          </Section>
          <Section
            icon={Activity}
            title={t("files.search.type.measurements")}
            count={results.measurements.length}
          >
            {results.measurements.map((m) => {
              const pres = presentMeasurement(
                {
                  key: m.metric.key,
                  unit: m.unit,
                  decimals: m.metric.decimals,
                  valueType: m.metric.valueType,
                },
                m.value,
                m.value2,
                user.prefs,
              );
              return (
                <li key={m.id}>
                  <Link
                    href={`/tracking/${m.metric.key}`}
                    className="hover:bg-muted/60 flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {m.metric.name}
                        {m.context && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            , {CONTEXT_KEYS[m.context] ? t(CONTEXT_KEYS[m.context]) : m.context}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatDateTime(m.measuredAt, tz)}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="tabular font-semibold">{pres.text}</span>{" "}
                      <span className="text-muted-foreground">{pres.unit}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </Section>
          <Section
            icon={FolderHeart}
            title={t("files.search.section.records")}
            count={results.records.length}
          >
            {results.records.map((r) => (
              <li key={r.id}>
                <Link href={`/records/${r.id}`} className="hover:bg-muted/60 block px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDate(r.date, tz)}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {t(RECORD_TYPE_KEYS[r.type])}
                    {(r.doctorName || r.facilityName) &&
                      `, ${[r.doctorName, r.facilityName].filter(Boolean).join(", ")}`}
                  </div>
                </Link>
              </li>
            ))}
          </Section>
          <Section
            icon={FileText}
            title={t("files.search.type.documents")}
            count={results.documents.length}
          >
            {results.documents.map((d) => (
              <li key={d.id}>
                <Link href={`/documents/${d.id}`} className="hover:bg-muted/60 block px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDate(d.documentDate ?? d.createdAt, tz)}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {t(DOCUMENT_TYPE_KEYS[d.type])}
                    {d.providerName && `, ${d.providerName}`}
                  </div>
                  {d.snippet && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-[13px]">
                      “{d.snippet}”
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </Section>
          <Section
            icon={Building2}
            title={t("files.search.type.providers")}
            count={results.providers.length}
          >
            {results.providers.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/search?q=${encodeURIComponent(p.name)}`}
                  className="hover:bg-muted/60 flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {t(PROVIDER_TYPE_KEYS[p.type])}
                      {p.city && `, ${p.city}`}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {t.n(
                      "files.search.items",
                      p._count.records + p._count.documents + p._count.labPanels,
                    )}
                  </Badge>
                </Link>
              </li>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
