import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Download, FlaskConical, Link2, ScanText } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getDocument } from "@/server/services/documents";
import { listRecordOptions } from "@/server/services/records";
import { or404 } from "@/server/page-utils";
import { deleteDocumentAction } from "@/actions/documents";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { DocumentPreview } from "@/components/documents/document-preview";
import { EditDocumentDialog } from "@/components/documents/edit-document-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/i18n/server";
import { DOCUMENT_TYPE_KEYS } from "@/i18n/messages/files-labels";
import { formatDate, formatDateTime, toDateInputValue } from "@/lib/format";
import { formatBytes } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("files.meta.document") };
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const doc = await or404(id, (i) => getDocument(user.id, i));
  const records = await listRecordOptions(user.id);
  const tz = user.timezone;
  const t = await getT();

  const meta: [string, React.ReactNode][] = [
    [t("files.doc.meta.type"), t(DOCUMENT_TYPE_KEYS[doc.type])],
    [
      t("files.doc.meta.date"),
      doc.documentDate ? formatDate(doc.documentDate, tz) : t("files.common.notSet"),
    ],
    [t("files.doc.meta.provider"), doc.providerName ?? t("files.common.notSet")],
    [t("files.doc.meta.uploaded"), formatDateTime(doc.createdAt, tz)],
    [
      t("files.doc.meta.file"),
      `${doc.mimeType === "application/pdf" ? "PDF" : doc.mimeType.replace("image/", "").toUpperCase()}, ${formatBytes(doc.sizeBytes)}`,
    ],
  ];

  return (
    <div>
      <Link
        href="/documents"
        className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
      >
        <ArrowLeft className="size-4" /> {t("nav.documents")}
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {t(DOCUMENT_TYPE_KEYS[doc.type])}{" "}
            {doc.isDemo && <Badge variant="demo">{t("files.doc.sample")}</Badge>}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-balance">{doc.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/api/documents/${doc.id}/file?download=1`}>
              <Download /> {t("files.doc.download")}
            </a>
          </Button>
          <EditDocumentDialog
            doc={{
              id: doc.id,
              name: doc.name,
              type: doc.type,
              documentDate: toDateInputValue(doc.documentDate, tz),
              providerName: doc.providerName,
              notes: doc.notes,
              tags: doc.tags,
              recordId: doc.record && !doc.record.deletedAt ? doc.record.id : null,
            }}
            records={records.map((r) => ({
              id: r.id,
              title: `${r.title} (${formatDate(r.date, tz)})`,
            }))}
          />
          <ConfirmDelete
            action={deleteDocumentAction.bind(null, doc.id)}
            title={t("files.doc.delete.title")}
            description={t("files.doc.delete.description", { name: doc.name })}
            redirectTo="/documents"
            iconOnly
            triggerLabel={t("files.doc.delete.trigger")}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <div className="space-y-6">
          {doc.importJobs.length > 0 && (
            <Card className="border-primary/30 bg-accent/40">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <FlaskConical className="text-primary mt-0.5 size-5" />
                  <p className="text-sm">
                    {t("files.doc.import.found")}{" "}
                    <strong>{t("files.doc.import.nothingSaved")}</strong>
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/labs/import/${doc.importJobs[0].id}`}>
                    {t("files.doc.import.review")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          <DocumentPreview id={doc.id} mimeType={doc.mimeType} name={doc.name} />
          {doc.extractedText && (
            <details className="group surface">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium">
                <ScanText className="text-muted-foreground size-4" /> {t("files.doc.text.title")}
                <span className="text-muted-foreground ml-auto text-xs font-normal group-open:hidden">
                  {t("files.doc.text.show")}
                </span>
              </summary>
              <pre className="text-muted-foreground max-h-96 overflow-auto border-t px-5 py-4 font-sans text-[13px] leading-relaxed whitespace-pre-wrap">
                {doc.extractedText}
              </pre>
            </details>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-5 sm:pt-6">
              <dl className="space-y-3 text-sm">
                {meta.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              {doc.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-4">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
              {doc.notes && (
                <p className="text-muted-foreground mt-4 border-t pt-4 text-sm">{doc.notes}</p>
              )}
            </CardContent>
          </Card>
          {(doc.record && !doc.record.deletedAt) || doc.labPanels.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="text-muted-foreground size-4" /> {t("files.doc.linked")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {doc.record && !doc.record.deletedAt && (
                  <Link
                    href={`/records/${doc.record.id}`}
                    className="hover:bg-muted -mx-2 block rounded-lg px-2 py-2 text-sm"
                  >
                    {t("files.doc.linked.record")}{" "}
                    <span className="font-medium">{doc.record.title}</span>
                  </Link>
                )}
                {doc.labPanels.map((p) => (
                  <Link
                    key={p.id}
                    href={`/labs/reports/${p.id}`}
                    className="hover:bg-muted -mx-2 block rounded-lg px-2 py-2 text-sm"
                  >
                    {t("files.doc.linked.labReport")} <span className="font-medium">{p.name}</span>{" "}
                    · {formatDate(p.collectedAt, tz)}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {doc.extractionStatus === "UNSUPPORTED" && doc.type === "LAB_REPORT" && (
            <p className="bg-muted/40 text-muted-foreground rounded-md border p-4 text-sm">
              {t("files.doc.unreadable.before")}{" "}
              <Link
                href={`/labs/new?documentId=${doc.id}`}
                className="text-primary font-medium hover:underline"
              >
                {t("files.doc.unreadable.link")}
              </Link>
              {t("files.doc.unreadable.after")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
