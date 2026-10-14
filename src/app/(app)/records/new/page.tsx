import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listProviderNames } from "@/server/services/providers";
import { PageHeader } from "@/components/shared/page-header";
import { RecordForm } from "@/components/records/record-form";
import { Card, CardContent } from "@/components/ui/card";
import { toDateInputValue } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("files.meta.newRecord") };
}

export default async function NewRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireUser();
  const { type } = await searchParams;
  const providers = await listProviderNames(user.id);
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("files.recordNew.title")}
        description={t("files.recordNew.description")}
      />
      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <RecordForm
            initial={{ type }}
            providers={providers.map((p) => p.name)}
            today={toDateInputValue(new Date(), user.timezone)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
