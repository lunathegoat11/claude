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

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("updateProfile", async () => {
    const user = await requireUserOrThrow();
    await updateProfile(user.id, formToObject(fd), user.timezone);
    await audit(user.id, "profile.update", { type: "Profile" }, await requestMeta());
    revalidatePath("/", "layout");
    return { ok: true, message: "Profile saved" };
  });
}

export async function updatePreferencesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("updatePreferences", async () => {
    const user = await requireUserOrThrow();
    await updatePreferences(user.id, formToObject(fd));
    revalidatePath("/", "layout");
    return { ok: true, message: "Preferences saved" };
  });
}

export async function saveHealthItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("saveHealthItem", async () => {
    const user = await requireUserOrThrow();
    const o = formToObject(fd);
    const id = typeof o.id === "string" && o.id ? uuid.parse(o.id) : null;
    if (o.kind === "medication") await upsertMedication(user.id, id, o, user.timezone);
    else if (o.kind === "allergy") await upsertAllergy(user.id, id, o);
    else if (o.kind === "condition") await upsertCondition(user.id, id, o, user.timezone);
    else throw new AppError("VALIDATION", "Unknown item type.");
    await audit(
      user.id,
      "health_summary.update",
      { type: String(o.kind), id: id ?? undefined },
      await requestMeta(),
    );
    revalidatePath("/settings");
    return { ok: true, message: "Saved" };
  });
}

export async function deleteHealthItemAction(
  kind: "medication" | "allergy" | "condition",
  id: string,
): Promise<ActionState> {
  return runAction("deleteHealthItem", async () => {
    const user = await requireUserOrThrow();
    if (!["medication", "allergy", "condition"].includes(kind))
      throw new AppError("VALIDATION", "Unknown item type.");
    await deleteHealthItem(user.id, kind, uuid.parse(id));
    await audit(user.id, "health_summary.update", { type: kind, id }, await requestMeta(), {
      deleted: true,
    });
    revalidatePath("/settings");
    return { ok: true, message: "Removed" };
  });
}

export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction("deleteAccount", async () => {
    const user = await requireUserOrThrow();
    if (user.isDemo) throw new AppError("FORBIDDEN", "The shared demo account can't be deleted.");
    if (fd.get("confirm") !== "DELETE")
      throw new AppError("VALIDATION", "Type DELETE to confirm.", {
        confirm: ["Type DELETE to confirm"],
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
      throw new AppError("VALIDATION", "Password is incorrect.", {
        password: ["Password is incorrect"],
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
    const user = await requireUserOrThrow();
    if (user.isDemo)
      throw new AppError("FORBIDDEN", "This can't be changed on the shared demo account.");
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
      message: on
        ? "Thanks! Your corrections will help Kosha read reports better."
        : "Turned off. Your corrections won't be used.",
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
      throw new AppError("VALIDATION", "Unknown time zone.");
    }
    if (tz === user.timezone) return { ok: true };
    await db.profile.updateMany({ where: { userId: user.id }, data: { timezone: tz } });
    // Which ranges apply can depend on the country (Indian ranges in India).
    await reapplyRanges({ userId: user.id });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
