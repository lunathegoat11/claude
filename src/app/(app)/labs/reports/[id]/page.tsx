import { ledgerRange } from "@/lib/lab-range";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getLabPanel, getPreviousResults, seriesKey } from "@/server/services/labs";
import { or404 } from "@/server/page-utils";
import { deleteLabPanelAction } from "@/actions/labs";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { ResultLedger } from "@/components/labs/result-ledger";
import { groupByCategory } from "@/lib/lab-groups";
import { CATEGORY_KEYS } from "@/lib/catalog/category-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/format";
import { toNum } from "@/lib/utils";
import { getT } from "@/i18n/server";
import type { DataSource } from "@prisma/client";

const SOURCE_KEYS = {
  MANUAL: "labs.source.MANUAL",
  PDF_IMPORT: "labs.source.PDF_IMPORT",
  IMAGE_IMPORT: "labs.source.IMAGE_IMPORT",
  CSV_IMPORT: "labs.source.CSV_IMPORT",
  DEVICE: "labs.source.DEVICE",
  DEMO: "labs.source.DEMO",
} as const satisfies Record<DataSource, string>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("labs.meta.report") };
}

export default async function LabReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser();
  const t = await getT();
  const { id } = await params;
  const justSaved = (await searchParams).new === "1";
  const panel = await or404(id, (i) => getLabPanel(user.id, i));
  const groups = groupByCategory(panel.results);
  const prev = await getPreviousResults(user.id, panel);
  const tz = user.timezone;
  const flagged = panel.results.filter((r) => ["HIGH", "LOW", "ABNORMAL"].includes(r.flag)).length;
  const imported = panel.source === "PDF_IMPORT" || panel.source === "IMAGE_IMPORT";
  const toCheck = imported ? panel.results.filter((r) => r.notes).length : 0;
  const sourceDoc = panel.document && !panel.document.deletedAt ? panel.document : null;
  const fromBefore = t("labs.report.fromBefore");
  const fromAfter = t("labs.report.fromAfter");

  return (
    <div>
      <Link
        href="/labs?tab=reports"
        className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
      >
        <ArrowLeft className="size-4" /> {t("nav.labs")}
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold sm:text-[2.5rem]">{panel.name}</h1>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-[15px]">
            {formatDate(panel.collectedAt, tz)}
            {panel.labName && `, ${panel.labName}`}
            {panel.isDemo && <Badge variant="demo">{t("labs.report.sample")}</Badge>}
          </p>
          <p className="mt-2 text-[15px]">
            {t.n("labs.report.count", panel.results.length)}{" "}
            {flagged ? t.n("labs.report.flagged", flagged) : t("labs.report.allNormal")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {panel.document && !panel.document.deletedAt && (
            <Button asChild variant="outline">
              <Link href={`/documents/${panel.document.id}`}>
                <FileText /> {t("labs.report.original")}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/labs/reports/${panel.id}/edit`}>
              <Pencil /> {t("labs.report.edit")}
            </Link>
          </Button>
          <ConfirmDelete
            action={deleteLabPanelAction.bind(null, panel.id)}
            title={t("labs.report.deleteTitle")}
            description={t("labs.report.deleteDescription")}
            redirectTo="/labs?tab=reports"
            iconOnly
            triggerLabel={t("labs.report.deleteTrigger")}
          />
        </div>
      </div>

      {imported && (justSaved || toCheck > 0) && (
        <div
          role="status"
          className="bg-accent/60 text-accent-foreground mb-5 rounded-md border px-4 py-3 text-sm"
        >
          <p className="font-medium">
            {justSaved ? t.n("labs.report.saved", panel.results.length) : t("labs.report.readAuto")}
            {sourceDoc ? (
              <>
                {" "}
                {fromBefore && `${fromBefore} `}
                <Link href={`/documents/${sourceDoc.id}`} className="underline underline-offset-2">
                  {sourceDoc.name}
                </Link>
                {fromAfter && ` ${fromAfter}`}
              </>
            ) : null}
            {t("labs.report.dated", { date: formatDate(panel.collectedAt, tz) })}
          </p>
          <p className="mt-1 opacity-80">
            {toCheck ? `${t.n("labs.report.toCheck", toCheck)} ` : ""}
            {t("labs.report.editHint")}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.category}>
            {groups.length > 1 && (
              <h2 className="text-muted-foreground mb-2 text-sm font-semibold">
                {t(CATEGORY_KEYS[group.category])}
              </h2>
            )}
            <div className="surface">
              <ResultLedger
                label={t("labs.report.ledgerLabel", { name: panel.name })}
                results={group.rows.map((r) => {
                  const p = prev.get(seriesKey(r));
                  const pv = p ? toNum(p.valueNumeric) : null;
                  return {
                    id: r.id,
                    testName: r.testName,
                    href: `/labs/tests/${encodeURIComponent(seriesKey(r))}`,
                    value: toNum(r.valueNumeric),
                    valueText: r.valueText,
                    unit: r.unit,
                    ...ledgerRange(r),
                    flag: r.flag,
                    notes: r.notes,
                    previous: p
                      ? t("labs.report.previous", {
                          value: `${pv !== null ? formatNumber(pv, 2) : (p.valueText ?? "")}${p.unit && p.unit !== r.unit ? ` ${p.unit}` : ""}`,
                          date: formatDate(p.observedAt, tz),
                        })
                      : null,
                  };
                })}
              />
            </div>
          </section>
        ))}
      </div>
      <div className="text-muted-foreground mt-4 space-y-1 text-[13px]">
        <p>{t("labs.report.statusNote")}</p>
        <p>
          {t(SOURCE_KEYS[panel.source])}.{panel.notes && ` ${panel.notes}`}
        </p>
      </div>
    </div>
  );
}
