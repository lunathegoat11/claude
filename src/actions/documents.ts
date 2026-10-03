"use server";
import { revalidatePath } from "next/cache";
import { runAction, formToObject, type ActionState } from "@/server/action-utils";
import { requireUserOrThrow, requestMeta } from "@/server/auth/session";
import { deleteDocument, updateDocument } from "@/server/services/documents";
import { audit } from "@/server/audit";
import { uuid } from "@/lib/validation/common";

export async function updateDocumentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("updateDocument", async () => {
    const user = await requireUserOrThrow();
    const id = uuid.parse(fd.get("id"));
    const o = formToObject(fd);
    await updateDocument(
      user.id,
      id,
      { ...o, tags: typeof o.tags === "string" ? o.tags : "" },
      user.timezone,
    );
    await audit(user.id, "document.update", { type: "MedicalDocument", id }, await requestMeta());
    revalidatePath(`/documents/${id}`);
    revalidatePath("/documents");
    return { ok: true, message: "Document details saved" };
  });
}

export async function deleteDocumentAction(id: string): Promise<ActionState> {
  return runAction("deleteDocument", async () => {
    const user = await requireUserOrThrow();
    await deleteDocument(user.id, uuid.parse(id));
    await audit(user.id, "document.delete", { type: "MedicalDocument", id }, await requestMeta());
    revalidatePath("/documents");
    return { ok: true, message: "Document deleted" };
  });
}
