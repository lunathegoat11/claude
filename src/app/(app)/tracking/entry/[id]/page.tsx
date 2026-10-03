import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getMeasurement } from "@/server/services/measurements";
import { or404 } from "@/server/page-utils";

/** Timeline links point here; resolve the reading to its metric page. */
export default async function MeasurementEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const m = await or404(id, (i) => getMeasurement(user.id, i));
  redirect(`/tracking/${m.metric.key}?range=all#m-${m.id}`);
}
