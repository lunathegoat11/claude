"use server";
import { revalidatePath } from "next/cache";
import { runAction, formToObject, type ActionState } from "@/server/action-utils";
import { requireUserOrThrow, requestMeta } from "@/server/auth/session";
import {
  createCustomMetric,
  createMeasurement,
  deleteMeasurement,
  importCsv,
  previewCsv,
  updateMeasurement,
  type CsvRowResult,
} from "@/server/services/measurements";
import { audit } from "@/server/audit";
import { uuid } from "@/lib/validation/common";
import { AppError } from "@/server/errors";

export async function saveMeasurementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("saveMeasurement", async () => {
    const user = await requireUserOrThrow();
    const o = formToObject(fd);
    const id = typeof o.id === "string" && o.id ? uuid.parse(o.id) : null;
    const m = id
      ? await updateMeasurement(user.id, id, o, user.timezone)
      : await createMeasurement(user.id, o, user.timezone);
    await audit(
      user.id,
      id ? "measurement.update" : "measurement.create",
      { type: "HealthMeasurement", id: m.id },
      await requestMeta(),
    );
    revalidatePath("/tracking", "layout");
    revalidatePath("/dashboard");
    return { ok: true, message: id ? "Reading updated" : "Reading saved" };
  });
}

export async function deleteMeasurementAction(id: string): Promise<ActionState> {
  return runAction("deleteMeasurement", async () => {
    const user = await requireUserOrThrow();
    await deleteMeasurement(user.id, uuid.parse(id));
    await audit(
      user.id,
      "measurement.delete",
      { type: "HealthMeasurement", id },
      await requestMeta(),
    );
    revalidatePath("/tracking", "layout");
    return { ok: true, message: "Reading deleted" };
  });
}

export async function createMetricAction(
  _: ActionState,
  fd: FormData,
): Promise<ActionState<{ key: string }>> {
  return runAction("createMetric", async () => {
    const user = await requireUserOrThrow();
    const metric = await createCustomMetric(user.id, formToObject(fd));
    await audit(
      user.id,
      "metric.create",
      { type: "HealthMetric", id: metric.id },
      await requestMeta(),
    );
    revalidatePath("/tracking");
    return { ok: true, message: `“${metric.name}” added`, data: { key: metric.key } };
  });
}

async function readCsv(fd: FormData) {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0)
    throw new AppError("VALIDATION", "Choose a CSV file.");
  if (file.size > 1_000_000)
    throw new AppError("PAYLOAD_TOO_LARGE", "CSV file is too large (max 1 MB).");
  return file.text();
}

export async function previewCsvAction(
  _: ActionState<{ rows: CsvRowResult[]; csv: string }>,
  fd: FormData,
): Promise<ActionState<{ rows: CsvRowResult[]; csv: string }>> {
  return runAction("previewCsv", async () => {
    const user = await requireUserOrThrow();
    const csv = await readCsv(fd);
    const rows = await previewCsv(user.id, csv, user.timezone);
    return { ok: true, data: { rows, csv } };
  });
}

export async function importCsvAction(
  csv: string,
): Promise<ActionState<{ imported: number; skipped: number }>> {
  return runAction("importCsv", async () => {
    const user = await requireUserOrThrow();
    if (typeof csv !== "string" || csv.length > 1_000_000)
      throw new AppError("VALIDATION", "Invalid CSV.");
    const res = await importCsv(user.id, csv, user.timezone);
    await audit(user.id, "measurement.import", undefined, await requestMeta(), {
      imported: res.imported,
      skipped: res.skipped,
    });
    revalidatePath("/tracking", "layout");
    return { ok: true, message: `Imported ${res.imported} readings`, data: res };
  });
}
