import "server-only";
import type { ProviderType } from "@prisma/client";
import { db, type Tx } from "@/server/db";

/** Find or create a user-owned provider entity by display name. */
export async function ensureProvider(
  tx: Tx,
  userId: string,
  name: string | null | undefined,
  type: ProviderType,
) {
  const clean = name?.trim();
  if (!clean) return null;
  const existing = await tx.provider.findFirst({
    where: { userId, name: { equals: clean, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.provider.create({
    data: { userId, name: clean, type },
    select: { id: true },
  });
  return created.id;
}

export async function listProviderNames(userId: string) {
  const rows = await db.provider.findMany({
    where: { userId },
    select: { name: true, type: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  return rows;
}
