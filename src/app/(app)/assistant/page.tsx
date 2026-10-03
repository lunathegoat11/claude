import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listConversations } from "@/server/services/assistant";
import { AssistantLayout } from "@/components/assistant/assistant-layout";
import { Chat } from "@/components/assistant/chat";

export const metadata: Metadata = { title: "AI Health Assistant" };

export default async function AssistantPage() {
  const user = await requireUser();
  const conversations = await listConversations(user.id);
  return (
    <AssistantLayout conversations={conversations} tz={user.timezone}>
      <Chat initialMessages={[]} />
    </AssistantLayout>
  );
}
