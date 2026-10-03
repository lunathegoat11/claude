import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { getRecord } from "@/server/services/records";
import { listProviderNames } from "@/server/services/providers";
import { PageHeader } from "@/components/shared/page-header";
import { RecordForm } from "@/components/records/record-form";
import { Card, CardContent } from "@/components/ui/card";
import { toDateInputValue } from "@/lib/format";
import { or404 } from "@/server/page-utils";

export const metadata: Metadata = { title: "Edit record" };

export default async function EditRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const record = await or404(id, (i) => getRecord(user.id, i));
  const providers = await listProviderNames(user.id);
  const tz = user.timezone;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit record" description={record.title} />
      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <RecordForm
            providers={providers.map((p) => p.name)}
            today={toDateInputValue(new Date(), tz)}
            initial={{
              id: record.id,
              type: record.type,
              title: record.title,
              date: toDateInputValue(record.date, tz),
              endDate: toDateInputValue(record.endDate, tz),
              doctorName: record.doctorName,
              facilityName: record.facilityName,
              specialty: record.specialty,
              notes: record.notes,
              tags: record.tags,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
