import { requireUser } from "@/server/auth/session";

import { DocumentChat } from
  "@/modules/chat/components/document-chat";

import { getUserConversation } from
  "@/modules/chat/server/chat.dal";

export const runtime = "nodejs";

export default async function ChatPage() {
  await requireUser();

  const conversation =
    await getUserConversation();

  return (
    <DocumentChat
      initialConversation={
        conversation
      }
    />
  );
}