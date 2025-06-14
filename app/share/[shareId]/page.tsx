import Chat from "@/components/chat";
import { notFound } from "next/navigation";
import { getChatBySharePath, getSharedChatMessages } from "@/db/queries";

type Props = {
  params: Promise<{ shareId: string }>;
};

export default async function SharedChatPage({ params }: Props) {
  const { shareId } = await params;
  if (!shareId) return notFound();

  // Get the chat by share path
  const chat = await getChatBySharePath(shareId);
  if (!chat) return notFound();

  // Get messages for this shared chat
  const messages = await getSharedChatMessages(chat.id);

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-muted/50 border-b px-4 py-2">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-semibold text-muted-foreground">
            Shared Chat: {chat.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            This is a read-only view of a shared conversation
          </p>
        </div>
      </div>
      <Chat chatId={chat.id} initialMessages={messages} isReadOnly={true} />
    </div>
  );
}
