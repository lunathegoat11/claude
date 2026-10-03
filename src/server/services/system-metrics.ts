import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { SYSTEM_METRICS } from "@/lib/catalog/metrics";

let ensured = false;

/** Idempotently create/update the built-in metric definitions (userId = NULL). */
export async function ensureSystemMetrics(force = false) {
  if (ensured && !force) return;
  for (const m of SYSTEM_METRICS) {
    const data = {
      name: m.name,
      shortName: m.shortName ?? null,
      unit: m.unit,
      valueType: m.valueType,
      primaryLabel: m.primaryLabel ?? null,
      secondaryLabel: m.secondaryLabel ?? null,
      decimals: m.decimals,
      minValue: new Prisma.Decimal(m.min),
      maxValue: new Prisma.Decimal(m.max),
      contexts: m.contexts,
      category: m.category,
      sortOrder: m.sortOrder,
    };
    const existing = await db.healthMetric.findFirst({
      where: { userId: null, key: m.key },
      select: { id: true },
    });
    if (existing) await db.healthMetric.update({ where: { id: existing.id }, data });
    else await db.healthMetric.create({ data: { ...data, key: m.key } });
  }
  ensured = true;
}
