import Chat from '@/components/chat';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { message as messageTable } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export default async function ChatPage({ params }: { params: { chatId: string } }) {
  const { chatId } = params;
  if (!chatId) return notFound();

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

