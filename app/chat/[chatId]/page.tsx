import Chat from "@/components/chat";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { chat as chatTable, message as messageTable } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

type Props = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: Props) {
  const { chatId } = await params;
  if (!chatId) redirect("/");

  const { userId } = await auth();
  if (!userId) redirect("/");

  const chat = await db.query.chat.findFirst({
    where: and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)),
  });

  if (!chat) redirect("/");

  // Fetch messages for this chat, ordered by creation time
  const messages = await db
    .select()
    .from(messageTable)
    .where(eq(messageTable.chatId, chatId))
    .orderBy(asc(messageTable.createdAt));

  // Optionally: return notFound() if chat doesn't exist
  // if (!messages || messages.length === 0) return notFound();

  // Optionally adapt messages to UIMessage shape if needed
  return <Chat chatId={chatId} initialMessages={messages} />;
}
