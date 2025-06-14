import {
  chat as chatTable,
  message as messageTable,
  stream as streamTable,
} from "@/db/schema";
import { db } from "@/lib/db";
import { UIMessage } from "ai";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function getChat(chatId: string) {
  const chat = await db
    .select()
    .from(chatTable)
    .where(eq(chatTable.id, chatId));
  return chat[0] || null;
}

export async function updateChatTitle(chatId: string, title: string) {
  await db.update(chatTable).set({ title }).where(eq(chatTable.id, chatId));
}

// Chat queries
export async function createChat(
  chatId: string,
  userId: string,
  title: string
) {
  try {
    await db.insert(chatTable).values({
      id: chatId,
      userId: userId,
      title: title.substring(0, 100),
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error("Failed to create chat:", error);
    return false;
  }
}

// Message queries
export async function saveMessage(message: {
  chatId: string;
  role: UIMessage["role"];
  parts: UIMessage["parts"] | undefined;
  attachments: UIMessage["experimental_attachments"];
  id: string;
}) {
  try {
    await db.insert(messageTable).values({
      id: message.id,
      chatId: message.chatId,
      role: message.role,
      parts: message.parts ?? [],
      attachments: message.attachments,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to save ${message.role} message:`, error);
    return false;
  }
}

export async function getLastMessage(chatId: string) {
  try {
    const messages = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.chatId, chatId))
      .orderBy(desc(messageTable.createdAt))
      .limit(1);

    return messages[0] || null;
  } catch (error) {
    console.error("Failed to get last message:", error);
    return null;
  }
}

// Stream queries
export async function saveStreamId(chatId: string, streamId: string) {
  try {
    await db.insert(streamTable).values({
      id: streamId,
      chatId: chatId,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to save stream ID ${streamId}:`, error);
    return false;
  }
}
