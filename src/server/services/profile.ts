import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";
import { logger } from "@/server/logger";
import { storage } from "@/server/storage";
import { parseZonedInput } from "@/lib/format";
import { normaliseIndianPhone } from "@/lib/india";
import {
  allergySchema,
  conditionSchema,
  medicationSchema,
  preferencesSchema,
  profileSchema,
} from "@/lib/validation/health";

export async function getProfile(userId: string) {
  const [user, profile, medications, allergies, conditions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { email: true, createdAt: true, isDemo: true },
    }),
    db.profile.findUnique({ where: { userId } }),
    db.medication.findMany({ where: { userId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.allergy.findMany({ where: { userId }, orderBy: { allergen: "asc" } }),
    db.condition.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);
  if (!user) throw notFound("Account");
  return { user, profile, medications, allergies, conditions };
}

export async function updateProfile(userId: string, raw: unknown, tz: string) {
  const p = profileSchema.parse(raw);
  const data = {
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth ? parseZonedInput(p.dateOfBirth, tz) : null,
    sex: p.sex ?? null,
    phone: p.phone ? normaliseIndianPhone(p.phone) : null,
    city: p.city ?? null,
    state: p.state ?? null,
    bloodGroup: p.bloodGroup ?? null,
    heightCm: p.heightCm !== undefined ? new Prisma.Decimal(p.heightCm) : null,
    emergencyContactName: p.emergencyContactName ?? null,
    emergencyContactPhone: p.emergencyContactPhone
      ? normaliseIndianPhone(p.emergencyContactPhone)
      : null,
    emergencyContactRelation: p.emergencyContactRelation ?? null,
  };
  return db.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

export async function updatePreferences(userId: string, raw: unknown) {
  const p = preferencesSchema.parse(raw);
  const existing = await db.profile.findUnique({ where: { userId }, select: { id: true } });
  if (!existing) throw notFound("Profile");
  return db.profile.update({ where: { userId }, data: p });
}

// ── Medications / allergies / conditions ───────────────────

export async function upsertMedication(
  userId: string,
  id: string | null,
  raw: unknown,
  tz: string,
) {
  const m = medicationSchema.parse(raw);
  const data = {
    name: m.name,
    dosage: m.dosage ?? null,
    frequency: m.frequency ?? null,
    prescribedBy: m.prescribedBy ?? null,
    active: m.active,
    notes: m.notes ?? null,
    startDate: m.startDate ? parseZonedInput(m.startDate, tz) : null,
    endDate: m.endDate ? parseZonedInput(m.endDate, tz) : null,
  };
  if (id) {
    const res = await db.medication.updateMany({ where: { id, userId }, data });
    if (!res.count) throw notFound("Medication");
    return;
  }
  await db.medication.create({ data: { ...data, userId } });
}

export async function upsertAllergy(userId: string, id: string | null, raw: unknown) {
  const a = allergySchema.parse(raw);
  const data = {
    allergen: a.allergen,
    reaction: a.reaction ?? null,
    severity: a.severity,
    notes: a.notes ?? null,
  };
  if (id) {
    const res = await db.allergy.updateMany({ where: { id, userId }, data });
    if (!res.count) throw notFound("Allergy");
    return;
  }
  await db.allergy.create({ data: { ...data, userId } });
}

export async function upsertCondition(userId: string, id: string | null, raw: unknown, tz: string) {
  const c = conditionSchema.parse(raw);
  const data = {
    name: c.name,
    status: c.status,
    notes: c.notes ?? null,
    diagnosedOn: c.diagnosedOn ? parseZonedInput(c.diagnosedOn, tz) : null,
  };
  if (id) {
    const res = await db.condition.updateMany({ where: { id, userId }, data });
    if (!res.count) throw notFound("Condition");
    return;
  }
  await db.condition.create({ data: { ...data, userId } });
}

export async function deleteHealthItem(
  userId: string,
  kind: "medication" | "allergy" | "condition",
  id: string,
) {
  const res =
    kind === "medication"
      ? await db.medication.deleteMany({ where: { id, userId } })
      : kind === "allergy"
        ? await db.allergy.deleteMany({ where: { id, userId } })
        : await db.condition.deleteMany({ where: { id, userId } });
  if (!res.count) throw notFound("Item");
}

// ── Sessions / account ─────────────────────────────────────

export async function listSessions(userId: string) {
  return db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, tokenHash: true, createdAt: true, lastUsedAt: true, userAgent: true },
  });
}

/** Permanently delete the account, all data and all stored files. */
export async function deleteAccount(userId: string) {
  const docs = await db.medicalDocument.findMany({
    where: { userId },
    select: { storageKey: true },
  });
  await db.user.delete({ where: { id: userId } });
  for (const d of docs) {
    await storage()
      .delete(d.storageKey)
      .catch((err) => logger.error("storage.delete_failed", { err }));
  }
}

/** Machine-readable export of everything the user has stored (no binaries). */
export async function exportUserData(userId: string) {
  const [
    user,
    profile,
    records,
    documents,
    labPanels,
    metrics,
    measurements,
    medications,
    allergies,
    conditions,
    conversations,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true, createdAt: true } }),
    db.profile.findUnique({ where: { userId } }),
    db.medicalRecord.findMany({ where: { userId, deletedAt: null }, orderBy: { date: "asc" } }),
    db.medicalDocument.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        documentDate: true,
        providerName: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        tags: true,
        notes: true,
        createdAt: true,
      },
    }),
    db.labPanel.findMany({
      where: { userId, deletedAt: null },
      include: { results: { where: { deletedAt: null } } },
      orderBy: { collectedAt: "asc" },
    }),
    db.healthMetric.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      select: { id: true, key: true, name: true, unit: true },
    }),
    db.healthMeasurement.findMany({
      where: { userId, deletedAt: null },
      orderBy: { measuredAt: "asc" },
    }),
    db.medication.findMany({ where: { userId } }),
    db.allergy.findMany({ where: { userId } }),
    db.condition.findMany({ where: { userId } }),
    db.aIConversation.findMany({
      where: { userId },
      include: { messages: { select: { role: true, content: true, createdAt: true } } },
    }),
  ]);
  const metricKey = new Map(metrics.map((m) => [m.id, m]));
  return {
    exportedAt: new Date().toISOString(),
    format: "kosha-health-export/v1",
    note: "Document files are not included in this export; download them individually from the Documents page.",
    account: user,
    profile,
    records,
    documents,
    labReports: labPanels,
    measurements: measurements.map(({ metricId, ...m }) => ({
      ...m,
      metric: metricKey.get(metricId)?.key,
      metricName: metricKey.get(metricId)?.name,
    })),
    medications,
    allergies,
    conditions,
    assistantConversations: conversations,
  };
}
