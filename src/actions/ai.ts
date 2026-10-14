"use server";
import { revalidatePath } from "next/cache";
import { runAction, formToObject, type ActionState } from "@/server/action-utils";
import { requireUserOrThrow, requestMeta } from "@/server/auth/session";
import {
  removeAiKey,
  saveAiKey,
  setAiConsent,
  setDocumentReading,
} from "@/server/services/ai-settings";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { getT } from "@/i18n/server";

export async function saveAiKeyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction("saveAiKey", async () => {
    const t = await getT();
    const user = await requireUserOrThrow();
    if (user.isDemo) throw new AppError("FORBIDDEN", t("account.msg.demoNoKeys"));
    await rateLimit("aiKey", user.id);
    const res = await saveAiKey(user.id, formToObject(fd));
    // Never log or audit the key itself.
    await audit(user.id, "ai.key_saved", { type: "AiCredential" }, await requestMeta(), {
      provider: res.provider,
    });
    revalidatePath("/settings");
    return {
      ok: true,
      message: res.verified ? t("account.msg.keySaved") : t("account.msg.keySavedUnchecked"),
    };
  });
}

export async function setDocumentReadingAction(on: boolean): Promise<ActionState> {
  return runAction("setDocumentReading", async () => {
    const user = await requireUserOrThrow();
    await setDocumentReading(user.id, on);
    await audit(user.id, "ai.document_reading", { type: "AiCredential" }, await requestMeta(), {
      on,
    });
    revalidatePath("/settings");
    return {
      ok: true,
      message: (await getT())(on ? "account.msg.readingOn" : "account.msg.readingOff"),
    };
  });
}

export async function removeAiKeyAction(): Promise<ActionState> {
  return runAction("removeAiKey", async () => {
    const user = await requireUserOrThrow();
    await removeAiKey(user.id);
    await audit(user.id, "ai.key_removed", { type: "AiCredential" }, await requestMeta());
    revalidatePath("/settings");
    return { ok: true, message: (await getT())("account.msg.keyRemoved") };
  });
}

/** Give or withdraw consent to use the AI service set up for this server. */
export async function setAiConsentAction(on: boolean): Promise<ActionState> {
  return runAction("setAiConsent", async () => {
    const t = await getT();
    const user = await requireUserOrThrow();
    if (user.isDemo) throw new AppError("FORBIDDEN", t("account.demoNoChange"));
    await setAiConsent(user.id, on);
    await audit(
      user.id,
      on ? "consent.ai_given" : "consent.ai_withdrawn",
      { type: "User" },
      await requestMeta(),
    );
    revalidatePath("/settings");
    return {
      ok: true,
      message: on ? t("account.msg.aiOn") : t("account.msg.aiOff"),
    };
  });
}
