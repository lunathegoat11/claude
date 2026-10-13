import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";
import { logger } from "@/server/logger";
import { storage } from "@/server/storage";
import { reapplyRanges } from "./labs";
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
  const before = await db.profile.findUnique({
    where: { userId },
    select: { sex: true, dateOfBirth: true },
  });
  const saved = await db.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  // Some standard ranges depend on sex and age, so re-check results when these change.
  if (before?.sex !== data.sex || before?.dateOfBirth?.getTime() !== data.dateOfBirth?.getTime()) {
    await reapplyRanges({ userId });
  }
  return saved;
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
    select: { id: true, tokenHash: true, createdAt: true, lastUsedAt: true, device: true },
  });
}

/**
 * Permanently delete the account, all data, all stored files and the account's activity
 * log. Files go first (each tried up to three times), so a database failure can never
 * leave files behind that no account points to any more.
 */
export async function deleteAccount(userId: string) {
  const docs = await db.medicalDocument.findMany({
    where: { userId },
    select: { storageKey: true },
  });
  for (const d of docs) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ok = await storage()
        .delete(d.storageKey)
        .then(() => true)
        .catch((err) => {
          if (attempt === 3) logger.error("storage.delete_failed", { err });
          return false;
        });
      if (ok) break;
    }
  }
  await db.$transaction([
    db.auditLog.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
}

/**
 * Machine-readable export of everything Kosha holds about the user. Uploaded files
 * themselves are downloaded one by one from Reports & files; their details and the text
 * read from them are included here.
 */
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
    providers,
    sessions,
    activity,
    aiSettings,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        termsAcceptedAt: true,
        healthDataConsentAt: true,
        consentVersion: true,
        ageConfirmedAt: true,
        lastAgeConfirmedAt: true,
        aiConsentAt: true,
        improveReadingAt: true,
        accounts: { select: { provider: true, createdAt: true } },
      },
    }),
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
        extractedText: true,
        createdAt: true,
      },
    }),
    db.labPanel.findMany({
      where: { userId, deletedAt: null },
      include: { results: { where: { deletedAt: null } } },
      orderBy: { collectedAt: "asc" },
    }),
    db.healthMetric.findMany({ where: { OR: [{ userId: null }, { userId }] } }),
    db.healthMeasurement.findMany({
      where: { userId, deletedAt: null },
      orderBy: { measuredAt: "asc" },
    }),
    db.medication.findMany({ where: { userId } }),
    db.allergy.findMany({ where: { userId } }),
    db.condition.findMany({ where: { userId } }),
    db.aIConversation.findMany({
      where: { userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
    db.provider.findMany({ where: { userId } }),
    db.session.findMany({
      where: { userId },
      select: { device: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    }),
    db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { action: true, entityType: true, entityId: true, createdAt: true },
    }),
    // Never the key itself: only which service, its last four characters and the choices.
    db.aiCredential.findUnique({
      where: { userId },
      select: { provider: true, keyHint: true, readDocuments: true, createdAt: true },
    }),
  ]);
  const metricKey = new Map(metrics.map((m) => [m.id, m]));
  return {
    exportedAt: new Date().toISOString(),
    format: "kosha-health-export/v1",
    note: "Uploaded files are not inside this file; download each one from Reports & files. Their details and the text read from them are included below.",
    account: user,
    profile,
    providers,
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
    customMeasurements: metrics.filter((m) => m.userId === userId),
    assistantConversations: conversations,
    aiSettings,
    signedInDevices: sessions,
    accountActivity: activity,
  };
}
