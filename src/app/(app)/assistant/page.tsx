import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listConversations } from "@/server/services/assistant";
import { AssistantLayout } from "@/components/assistant/assistant-layout";
import { Chat } from "@/components/assistant/chat";
import { PlusOnly } from "@/components/assistant/plus-only";
import { isPlus } from "@/server/services/billing";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.assistant") };
}

export default async function AssistantPage() {
  const user = await requireUser();
  if (!(await isPlus(user.id))) return <PlusOnly />;
  const conversations = await listConversations(user.id);
  return (
    <AssistantLayout conversations={conversations} tz={user.timezone}>
      <Chat initialMessages={[]} />
    </AssistantLayout>
  );
}
