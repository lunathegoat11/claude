import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { PlusOnly } from "@/components/assistant/plus-only";
import { isPlus } from "@/server/services/billing";
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
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.assistant") };
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!(await isPlus(user.id))) return <PlusOnly />;
  const { id } = await params;
  const t = await getT();
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
          title={t("app.chat.deleteTitle")}
          description={t("app.chat.deleteBody")}
          redirectTo="/assistant"
          iconOnly
          triggerVariant="ghost"
          triggerSize="sm"
          triggerLabel={t("app.chat.deleteLabel")}
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
