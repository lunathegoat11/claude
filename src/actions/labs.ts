"use server";
import { revalidatePath } from "next/cache";
import { runAction, type ActionState } from "@/server/action-utils";
import { requireUserOrThrow, requestMeta } from "@/server/auth/session";
import {
  createLabPanel,
  deleteLabPanel,
  deleteLabResult,
  updateLabPanel,
} from "@/server/services/labs";
import { confirmImport, discardImport } from "@/server/services/imports";
import { audit } from "@/server/audit";
import { uuid } from "@/lib/validation/common";

export async function saveLabPanelAction(
  panelId: string | null,
  payload: unknown,
): Promise<ActionState<{ id: string }>> {
  return runAction("saveLabPanel", async () => {
    const user = await requireUserOrThrow();
    const panel = panelId
      ? await updateLabPanel(user.id, uuid.parse(panelId), payload, user.timezone)
      : await createLabPanel(user.id, payload, user.timezone);
    await audit(
      user.id,
      panelId ? "lab.update" : "lab.create",
      { type: "LabPanel", id: panel.id },
      await requestMeta(),
    );
    revalidatePath("/labs");
    return { ok: true, message: "Lab report saved", data: { id: panel.id } };
  });
}

export async function deleteLabPanelAction(id: string): Promise<ActionState> {
  return runAction("deleteLabPanel", async () => {
    const user = await requireUserOrThrow();
    await deleteLabPanel(user.id, uuid.parse(id));
    await audit(user.id, "lab.delete", { type: "LabPanel", id }, await requestMeta());
    revalidatePath("/labs");
    return { ok: true, message: "Lab report deleted" };
  });
}

export async function deleteLabResultAction(id: string): Promise<ActionState> {
  return runAction("deleteLabResult", async () => {
    const user = await requireUserOrThrow();
    await deleteLabResult(user.id, uuid.parse(id));
    await audit(user.id, "lab.delete", { type: "LabResult", id }, await requestMeta());
    revalidatePath("/labs");
    return { ok: true, message: "Result deleted" };
  });
}

export async function confirmImportAction(
  jobId: string,
  payload: unknown,
): Promise<ActionState<{ id: string }>> {
  return runAction("confirmImport", async () => {
    const user = await requireUserOrThrow();
    const panel = await confirmImport(user.id, uuid.parse(jobId), payload, user.timezone);
    await audit(
      user.id,
      "lab.import_confirmed",
      { type: "ImportJob", id: jobId },
      await requestMeta(),
      { panelId: panel.id },
    );
    revalidatePath("/labs");
    return { ok: true, message: "Lab values saved", data: { id: panel.id } };
  });
}

export async function discardImportAction(jobId: string): Promise<ActionState> {
  return runAction("discardImport", async () => {
    const user = await requireUserOrThrow();
    await discardImport(user.id, uuid.parse(jobId));
    await audit(
      user.id,
      "lab.import_discarded",
      { type: "ImportJob", id: jobId },
      await requestMeta(),
    );
    return { ok: true, message: "Extracted values discarded" };
  });
}
