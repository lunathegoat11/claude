import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { DocumentType } from "@prisma/client";
import { FileText, Upload } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listDocuments } from "@/server/services/documents";
import { listRecordOptions } from "@/server/services/records";
import { listProviderNames } from "@/server/services/providers";
import { env } from "@/server/env";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { DOCUMENT_ICONS } from "@/components/shared/icons";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPE_LABELS } from "@/lib/catalog/labels";
import { DOCUMENT_TYPES } from "@/lib/validation/health";
import { formatDate, toDateInputValue } from "@/lib/format";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports & files" };

type SP = { q?: string; type?: string; page?: string };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const type = DOCUMENT_TYPES.includes(sp.type as DocumentType)
    ? (sp.type as DocumentType)
    : undefined;
  const [{ items, total, page, pageCount }, records, providers] = await Promise.all([
    listDocuments(user.id, { q: sp.q, type, page: Number(sp.page) || 1 }),
    listRecordOptions(user.id),
    listProviderNames(user.id),
  ]);
  const filtered = !!(sp.q || type);
  const tz = user.timezone;
  const qs = (over: Partial<SP>) =>
    `/documents?${new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][])}`;
  const upload = (
    <Suspense>
      <UploadDialog
        records={records.map((r) => ({
          id: r.id,
          title: `${r.title} (${formatDate(r.date, tz)})`,
        }))}
        maxMb={env().MAX_UPLOAD_MB}
        today={toDateInputValue(new Date(), tz)}
        providers={providers.map((p) => p.name)}
      />
    </Suspense>
  );

  return (
    <div>
      <PageHeader
        title="Reports & files"
        description="Lab reports, prescriptions, discharge summaries and other papers. Only you can open them."
        actions={upload}
      />
      <div className="mb-5">
        <FilterBar
          action="/documents"
          q={sp.q}
          placeholder="Search names, providers, or text inside documents…"
          clearHref={filtered ? "/documents" : undefined}
        >
          <FilterSelect
            name="type"
            value={type}
            label="Document type"
            options={[
              { value: "", label: "All types" },
              ...DOCUMENT_TYPES.map((t) => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] })),
            ]}
          />
        </FilterBar>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filtered ? "Nothing matches that search" : "No reports or files yet"}
          description={
            filtered
              ? "Try a different search or clear the filters."
              : "Add a lab report, prescription or discharge summary. A PDF or a phone photo both work."
          }
          action={
            filtered ? undefined : (
              // Opens the one upload dialog in the page header (it listens for ?upload=1).
              <Button asChild>
                <Link href="/documents?upload=1" scroll={false}>
                  <Upload /> Add a report
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => {
            const Icon = DOCUMENT_ICONS[d.type];
            const isImage = d.mimeType.startsWith("image/") && d.mimeType !== "image/heic";
            return (
              <li key={d.id}>
                <Link
                  href={`/documents/${d.id}`}
                  className="group bg-card hover:border-primary/30 flex h-full flex-col overflow-hidden rounded-[var(--radius)] border transition hover:shadow-sm"
                >
                  <div className="bg-muted/60 relative flex h-32 items-center justify-center overflow-hidden border-b">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/documents/${d.id}/file`}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center gap-2">
                        <Icon className="size-8" strokeWidth={1.5} />
                        <span className="text-[11px] font-medium">
                          {d.mimeType === "application/pdf" ? "PDF" : d.mimeType.split("/")[1]}
                        </span>
                      </div>
                    )}
                    {d.isDemo && (
                      <Badge variant="demo" className="bg-card absolute top-2 left-2">
                        Sample
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="line-clamp-2 leading-snug font-medium">{d.name}</div>
                    <div className="text-muted-foreground mt-1 text-sm">
                      {DOCUMENT_TYPE_LABELS[d.type]}
                      {d.providerName && `, ${d.providerName}`}
                    </div>
                    <div className="text-muted-foreground tabular mt-auto flex items-center justify-between pt-3 text-xs">
                      <span>
                        {d.documentDate
                          ? formatDate(d.documentDate, tz)
                          : `Uploaded ${formatDate(d.createdAt, tz)}`}
                      </span>
                      <span>{formatBytes(d.sizeBytes)}</span>
                    </div>
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
        label="documents"
        makeHref={(p) => qs({ page: String(p) })}
      />
    </div>
  );
}
