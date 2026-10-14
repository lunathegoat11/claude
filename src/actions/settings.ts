"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, formToObject, type ActionState } from "@/server/action-utils";
import { clearSessionCookie, requireUserOrThrow, requestMeta } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import {
  deleteAccount,
  deleteHealthItem,
  updatePreferences,
  updateProfile,
  upsertAllergy,
  upsertCondition,
  upsertMedication,
} from "@/server/services/profile";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { uuid } from "@/lib/validation/common";
import { setImproveReading } from "@/server/services/reading-patterns";
import { reapplyRanges } from "@/server/services/labs";
import { getT } from "@/i18n/server";

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("updateProfile", async () => {
    const user = await requireUserOrThrow();
    await updateProfile(user.id, formToObject(fd), user.timezone);
    await audit(user.id, "profile.update", { type: "Profile" }, await requestMeta());
    revalidatePath("/", "layout");
    return { ok: true, message: (await getT())("account.msg.profileSaved") };
  });
}

export async function updatePreferencesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("updatePreferences", async () => {
    const user = await requireUserOrThrow();
    await updatePreferences(user.id, formToObject(fd));
    revalidatePath("/", "layout");
    return { ok: true, message: (await getT())("account.msg.prefsSaved") };
  });
}

export async function saveHealthItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("saveHealthItem", async () => {
    const t = await getT();
    const user = await requireUserOrThrow();
    const o = formToObject(fd);
    const id = typeof o.id === "string" && o.id ? uuid.parse(o.id) : null;
    if (o.kind === "medication") await upsertMedication(user.id, id, o, user.timezone);
    else if (o.kind === "allergy") await upsertAllergy(user.id, id, o);
    else if (o.kind === "condition") await upsertCondition(user.id, id, o, user.timezone);
    else throw new AppError("VALIDATION", t("account.msg.unknownItem"));
    await audit(
      user.id,
      "health_summary.update",
      { type: String(o.kind), id: id ?? undefined },
      await requestMeta(),
    );
    revalidatePath("/settings");
    return { ok: true, message: t("account.msg.saved") };
  });
}

export async function deleteHealthItemAction(
  kind: "medication" | "allergy" | "condition",
  id: string,
): Promise<ActionState> {
  return runAction("deleteHealthItem", async () => {
    const t = await getT();
    const user = await requireUserOrThrow();
    if (!["medication", "allergy", "condition"].includes(kind))
      throw new AppError("VALIDATION", t("account.msg.unknownItem"));
    await deleteHealthItem(user.id, kind, uuid.parse(id));
    await audit(user.id, "health_summary.update", { type: kind, id }, await requestMeta(), {
      deleted: true,
    });
    revalidatePath("/settings");
    return { ok: true, message: t("account.msg.removed") };
  });
}

export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction("deleteAccount", async () => {
    const t = await getT();
    const user = await requireUserOrThrow();
    if (user.isDemo) throw new AppError("FORBIDDEN", t("account.delete.demo"));
    if (fd.get("confirm") !== "DELETE")
      throw new AppError("VALIDATION", t("account.delete.typeConfirm"), {
        confirm: [t("account.delete.typeConfirm")],
      });
    await rateLimit("signIn", `user:${user.id}`);
    const row = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    // Accounts that sign in only with Google or Apple have no password; being signed in
    // and typing DELETE is the confirmation.
    if (
      row?.passwordHash &&
      !(await verifyPassword(row.passwordHash, String(fd.get("password") ?? "")))
    ) {
      throw new AppError("VALIDATION", t("account.msg.passwordWrong"), {
        password: [t("account.msg.passwordWrong")],
      });
    }
    await audit(user.id, "account.delete", { type: "User", id: user.id }, await requestMeta());
    await deleteAccount(user.id);
    await clearSessionCookie();
    return { ok: true };
  });
  if (res.ok) redirect("/?deleted=1");
  return res;
}

/** Opt in or out of letting corrections improve report reading (anonymous patterns only). */
export async function setImproveReadingAction(on: boolean): Promise<ActionState> {
  return runAction("setImproveReading", async () => {
    const t = await getT();
    const user = await requireUserOrThrow();
    if (user.isDemo) throw new AppError("FORBIDDEN", t("account.demoNoChange"));
    await setImproveReading(user.id, on);
    await audit(
      user.id,
      on ? "consent.improve_given" : "consent.improve_withdrawn",
      { type: "User" },
      await requestMeta(),
    );
    revalidatePath("/settings");
    return {
      ok: true,
      message: on ? t("account.msg.improveOn") : t("account.msg.improveOff"),
    };
  });
}

/**
 * Keep dates and times right where the person is: the browser reports the device's time
 * zone setting (e.g. "America/New_York"). No location or GPS is used.
 */
export async function syncTimezoneAction(timezone: string): Promise<ActionState> {
  return runAction("syncTimezone", async () => {
    const user = await requireUserOrThrow();
    if (user.isDemo) return { ok: true }; // shared account: leave it as it is
    const tz = String(timezone).slice(0, 64);
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
    } catch {
      throw new AppError("VALIDATION", (await getT())("account.msg.unknownTz"));
    }
    if (tz === user.timezone) return { ok: true };
    await db.profile.updateMany({ where: { userId: user.id }, data: { timezone: tz } });
    // Which ranges apply can depend on the country (Indian ranges in India).
    await reapplyRanges({ userId: user.id });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
