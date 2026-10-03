import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarDays,
  Building2,
  FilePlus2,
  Pencil,
  Stethoscope,
  Tag,
} from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getRecord } from "@/server/services/records";
import { or404 } from "@/server/page-utils";
import { deleteRecordAction } from "@/actions/records";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { FlashToast } from "@/components/shared/flash-toast";
import { DOCUMENT_ICONS, RECORD_ICONS } from "@/components/shared/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPE_LABELS, RECORD_TYPE_LABELS } from "@/lib/catalog/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = { title: "Medical record" };

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await or404(id, (i) => getRecord(user.id, i));
  const tz = user.timezone;
  const Icon = RECORD_ICONS[r.type];

  return (
    <div className="mx-auto max-w-3xl">
      <Suspense>
        <FlashToast message="Record saved" />
      </Suspense>
      <Link
        href="/records"
        className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
      >
        <ArrowLeft className="size-4" /> Records
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="bg-accent text-accent-foreground flex size-12 shrink-0 items-center justify-center rounded-2xl">
            <Icon className="size-6" />
          </span>
          <div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {RECORD_TYPE_LABELS[r.type]} {r.isDemo && <Badge variant="demo">Sample data</Badge>}
            </div>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-balance">{r.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/records/${r.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <ConfirmDelete
            action={deleteRecordAction.bind(null, r.id)}
            title="Delete this record?"
            description={
              <>
                “{r.title}” will be removed from your records and timeline. Attached documents are
                kept in Documents.
              </>
            }
            redirectTo="/records"
            iconOnly
            triggerLabel="Delete record"
          />
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 sm:pt-6">
          <Detail
            icon={CalendarDays}
            label={r.endDate ? "Dates" : "Date"}
            value={
              r.endDate
                ? `${formatDate(r.date, tz)} – ${formatDate(r.endDate, tz)}`
                : formatDate(r.date, tz)
            }
          />
          {r.doctorName && (
            <Detail
              icon={Stethoscope}
              label="Doctor"
              value={[r.doctorName, r.specialty].filter(Boolean).join(" · ")}
            />
          )}
          {!r.doctorName && r.specialty && (
            <Detail icon={Stethoscope} label="Specialty" value={r.specialty} />
          )}
          {r.facilityName && (
            <Detail icon={Building2} label="Hospital / clinic" value={r.facilityName} />
          )}
          {r.tags.length > 0 && (
            <div className="flex gap-3">
              <Tag className="text-muted-foreground mt-0.5 size-4" />
              <div>
                <div className="text-muted-foreground text-xs">Tags</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.tags.map((t) => (
                    <Link key={t} href={`/records?tag=${encodeURIComponent(t)}`}>
                      <Badge variant="secondary">#{t}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
          {r.notes && (
            <div className="sm:col-span-2">
              <div className="text-muted-foreground mb-1.5 text-xs">Notes</div>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{r.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Attachments</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/documents?upload=1&recordId=${r.id}`}>
              <FilePlus2 /> Attach document
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {r.documents.length ? (
            <ul className="space-y-1">
              {r.documents.map((d) => {
                const DIcon = DOCUMENT_ICONS[d.type];
                return (
                  <li key={d.id}>
                    <Link
                      href={`/documents/${d.id}`}
                      className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5"
                    >
                      <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
                        <DIcon className="text-muted-foreground size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{d.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {DOCUMENT_TYPE_LABELS[d.type]} · {formatBytes(d.sizeBytes)}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No documents attached. Attach a prescription, report or discharge summary to keep
              everything together.
            </p>
          )}
        </CardContent>
      </Card>
      <p className="text-muted-foreground mt-6 text-xs">
        Created {formatDateTime(r.createdAt, tz)} · Last updated {formatDateTime(r.updatedAt, tz)}
      </p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div>
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="mt-0.5 text-[15px]">{value}</div>
      </div>
    </div>
  );
}
