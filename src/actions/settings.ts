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
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { uuid } from "@/lib/validation/common";

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
    const row = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (
      !row?.passwordHash ||
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
