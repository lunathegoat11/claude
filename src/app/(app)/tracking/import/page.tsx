import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { CsvImport } from "@/components/tracking/csv-import";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("app.meta.import") };
}

export default async function ImportPage() {
  const user = await requireUser();
  const t = await getT();
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/tracking"
        className="text-muted-foreground hover:text-foreground -my-2 mb-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm"
      >
        <ArrowLeft className="size-4" /> {t("nav.tracking")}
      </Link>
      <PageHeader title={t("app.import.title")} description={t("app.import.body")} />
      <CsvImport timezone={user.timezone} />
    </div>
  );
}
