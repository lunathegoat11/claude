"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, formToObject, type ActionState } from "@/server/action-utils";
import { requireUserOrThrow, requestMeta } from "@/server/auth/session";
import { createRecord, deleteRecord, updateRecord } from "@/server/services/records";
import { audit } from "@/server/audit";
import { uuid } from "@/lib/validation/common";

function input(fd: FormData) {
  const o = formToObject(fd);
  return { ...o, tags: typeof o.tags === "string" ? o.tags : "" };
}

export async function saveRecordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const res = await runAction("saveRecord", async () => {
    const user = await requireUserOrThrow();
    const id = fd.get("id");
    if (typeof id === "string" && id) {
      const rec = await updateRecord(user.id, uuid.parse(id), input(fd), user.timezone);
      await audit(
        user.id,
        "record.update",
        { type: "MedicalRecord", id: rec.id },
        await requestMeta(),
      );
      target = `/records/${rec.id}`;
    } else {
      const rec = await createRecord(user.id, input(fd), user.timezone);
      await audit(
        user.id,
        "record.create",
        { type: "MedicalRecord", id: rec.id },
        await requestMeta(),
      );
      target = `/records/${rec.id}`;
    }
    revalidatePath("/records");
    return { ok: true, message: "Record saved" };
  });
  if (res.ok) redirect(`${target}?saved=1`);
  return res;
}

export async function deleteRecordAction(id: string): Promise<ActionState> {
  return runAction("deleteRecord", async () => {
    const user = await requireUserOrThrow();
    await deleteRecord(user.id, uuid.parse(id));
    await audit(user.id, "record.delete", { type: "MedicalRecord", id }, await requestMeta());
    revalidatePath("/records");
    return { ok: true, message: "Record deleted" };
  });
}
