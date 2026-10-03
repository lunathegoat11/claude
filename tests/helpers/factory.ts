import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { ensureSystemMetrics } from "@/server/services/system-metrics";

export const TZ = "Asia/Kolkata";

export async function makeUser(name = "Test User") {
  await ensureSystemMetrics();
  return db.user.create({
    data: {
      email: `t-${randomUUID()}@test.example`,
      passwordHash: await hashPassword("correct-horse-battery-9"),
      profile: { create: { fullName: name } },
    },
  });
}

export async function cleanup(...userIds: string[]) {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}

export async function metricId(key: string) {
  await ensureSystemMetrics();
  return (await db.healthMetric.findFirstOrThrow({ where: { key, userId: null } })).id;
}

export function daysAgoInput(days: number, time = "09:00") {
  const d = new Date(Date.now() - days * 86_400_000);
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return `${ymd}T${time}`;
}
