import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { CsvImport } from "@/components/tracking/csv-import";

export const metadata: Metadata = { title: "Import readings" };

export default async function ImportPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/tracking"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Health tracking
      </Link>
      <PageHeader
        title="Import readings from CSV"
        description="Bring in readings exported from a glucometer app, BP monitor or spreadsheet. You'll see a preview before anything is saved."
      />
      <CsvImport timezone={user.timezone} />
    </div>
  );
}
