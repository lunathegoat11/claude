"use server";
import { revalidatePath } from "next/cache";
import { runAction, type ActionState } from "@/server/action-utils";
import { requireUserOrThrow, requestMeta } from "@/server/auth/session";
import { ask, deleteConversation, type AssistantReply } from "@/server/services/assistant";
import { rateLimit } from "@/server/rate-limit";
import { audit } from "@/server/audit";
import { uuid } from "@/lib/validation/common";

export async function askAction(input: {
  conversationId?: string;
  message: string;
}): Promise<ActionState<AssistantReply>> {
  return runAction("ask", async () => {
    const user = await requireUserOrThrow();
    await rateLimit("ai", user.id);
    const reply = await ask(user.id, input, user.timezone);
    // Audit the fact of a query only — never the question or answer text.
    await audit(
      user.id,
      "ai.query",
      { type: "AIConversation", id: reply.conversationId },
      await requestMeta(),
      { provider: reply.message.provider, citations: reply.message.citations.length },
    );
    return { ok: true, data: reply };
  });
}

export async function deleteConversationAction(id: string): Promise<ActionState> {
  return runAction("deleteConversation", async () => {
    const user = await requireUserOrThrow();
    await deleteConversation(user.id, uuid.parse(id));
    await audit(
      user.id,
      "ai.conversation_delete",
      { type: "AIConversation", id },
      await requestMeta(),
    );
    revalidatePath("/assistant");
    return { ok: true, message: "Conversation deleted" };
  });
}
