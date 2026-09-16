import { requireUser } from "@/server/auth/session";
import { DocumentChat } from
  "@/modules/chat/components/document-chat";

export const runtime = "nodejs";

export default async function ChatPage() {
  await requireUser();

  return <DocumentChat />;
}