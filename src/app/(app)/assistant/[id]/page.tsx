import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import {
  getConversation,
  listConversations,
  type AssistantSafety,
} from "@/server/services/assistant";
import { or404 } from "@/server/page-utils";
import { deleteConversationAction } from "@/actions/assistant";
import { AssistantLayout } from "@/components/assistant/assistant-layout";
import { Chat } from "@/components/assistant/chat";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import type { Citation } from "@/server/ai/types";

export const metadata: Metadata = { title: "AI Health Assistant" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [conversation, conversations] = await Promise.all([
    or404(id, (i) => getConversation(user.id, i)),
    listConversations(user.id),
  ]);
  return (
    <AssistantLayout
      conversations={conversations}
      activeId={conversation.id}
      tz={user.timezone}
      actions={
        <ConfirmDelete
          action={deleteConversationAction.bind(null, conversation.id)}
          title="Delete this conversation?"
          description="The questions and answers will be permanently deleted. Your records are not affected."
          redirectTo="/assistant"
          iconOnly
          triggerVariant="ghost"
          triggerSize="sm"
          triggerLabel="Delete conversation"
        />
      }
    >
      <Chat
        key={conversation.id}
        conversationId={conversation.id}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          provider: m.provider,
          citations: (m.citations as unknown as Citation[] | null) ?? [],
          safety: (m.safety as AssistantSafety | null) ?? null,
        }))}
      />
    </AssistantLayout>
  );
}
