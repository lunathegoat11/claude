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
import { DOCUMENT_TYPE_LABELS, PROVIDER_TYPE_LABELS } from "@/lib/catalog/labels";
import { CONTEXT_LABELS } from "@/lib/catalog/metrics";
import { formatDate, formatDateTime, formatNumber, parseZonedInput } from "@/lib/format";
import { presentMeasurement } from "@/lib/display";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Search" };

const TYPE_LABELS: Record<SearchType, string> = {
  records: "Records",
  documents: "Documents",
  labs: "Lab results",
  measurements: "Measurements",
  providers: "Providers",
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
      <ul className="bg-card divide-y overflow-hidden rounded-2xl border">{children}</ul>
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
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
      <PageHeader
        title="Search"
        description="Search across records, documents, lab results, measurements and providers. Try “glucose”, “Pune”, “Sep 2026” or “dengue”."
      />
      <div className="mb-4">
        <FilterBar
          action="/search"
          q={q}
          placeholder="Search everything…"
          hidden={{ type }}
          submitLabel="Search"
        >
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            From{" "}
            <input
              type="date"
              name="from"
              defaultValue={sp.from}
              className="border-input bg-card h-10 rounded-lg border px-2 text-sm"
            />
          </label>
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            To{" "}
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
        <nav aria-label="Result types" className="mb-6 flex flex-wrap gap-2">
          <Link
            href={qs({ type: undefined })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              !type
                ? "border-primary bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            All
          </Link>
          {SEARCH_TYPES.map((t) => (
            <Link
              key={t}
              href={qs({ type: t })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                type === t
                  ? "border-primary bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {TYPE_LABELS[t]}
            </Link>
          ))}
        </nav>
      )}

      {!results ? (
        <EmptyState
          icon={SearchIcon}
          title="Search your health records"
          description="Type a test name, doctor, hospital, condition, tag or a date like 12/09/2026."
        />
      ) : results.total === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={`No results for “${q}”`}
          description="Check the spelling or try a broader term, like “sugar” instead of “fasting blood sugar”."
        />
      ) : (
        <div className="space-y-8">
          <Section icon={FlaskConical} title="Lab results" count={results.labs.length}>
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
                      {r.labName && ` · ${r.labName}`}
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
          <Section icon={Activity} title="Measurements" count={results.measurements.length}>
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
                            · {CONTEXT_LABELS[m.context] ?? m.context}
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
          <Section icon={FolderHeart} title="Medical records" count={results.records.length}>
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
                    {r.typeLabel}
                    {(r.doctorName || r.facilityName) &&
                      ` · ${[r.doctorName, r.facilityName].filter(Boolean).join(", ")}`}
                  </div>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={FileText} title="Documents" count={results.documents.length}>
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
                    {DOCUMENT_TYPE_LABELS[d.type]}
                    {d.providerName && ` · ${d.providerName}`}
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
          <Section icon={Building2} title="Providers" count={results.providers.length}>
            {results.providers.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/search?q=${encodeURIComponent(p.name)}`}
                  className="hover:bg-muted/60 flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {PROVIDER_TYPE_LABELS[p.type]}
                      {p.city && ` · ${p.city}`}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {p._count.records + p._count.documents + p._count.labPanels} items
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
