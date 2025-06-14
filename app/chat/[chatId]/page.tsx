import Chat from "@/components/chat";
import { chat as chatTable, message as messageTable } from "@/db/schema";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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

  // Optionally adapt messages to UIMessage shape if needed
  return <Chat chatId={chatId} initialMessages={messages} />;
}
