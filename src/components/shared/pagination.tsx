import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";

/** Translations for the plain English labels pages pass in ("records", "readings", …). */
const LABEL_KEYS: Record<string, MessageKey> = {
  items: "files.pagination.items",
  documents: "files.pagination.documents",
  records: "files.pagination.records",
  readings: "files.pagination.readings",
  reports: "files.pagination.reports",
};

/** Server component. `label` is what is being counted, already translated or a plain English word. */
export async function Pagination({
  page,
  pageCount,
  makeHref,
  total,
  label = "items",
}: {
  page: number;
  pageCount: number;
  total: number;
  makeHref: (page: number) => string;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const t = await getT();
  const noun = LABEL_KEYS[label] ? t(LABEL_KEYS[label]) : label;
  return (
    <nav
      aria-label={t("files.pagination.label")}
      className="text-muted-foreground mt-6 flex items-center justify-between gap-3 text-sm"
    >
      <span className="tabular">
        {t("files.pagination.summary", { page, pageCount, total, label: noun })}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page - 1)}>
              <ChevronLeft /> {t("files.pagination.prev")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft /> {t("files.pagination.prev")}
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page + 1)}>
              {t("files.pagination.next")} <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {t("files.pagination.next")} <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  );
}
