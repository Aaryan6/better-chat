"use server";
import {
  chat as chatTable,
  message,
  message as messageTable,
  stream as streamTable,
} from "@/db/schema";
import { db } from "@/lib/db";
import { UIMessage } from "ai";
import { desc, eq, and, asc, gt, gte, inArray } from "drizzle-orm";
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

// Share-related queries
export async function createSharePath(chatId: string, userId: string) {
  const shareId = uuidv4();
  const sharePath = `share-${shareId}`;

  // First verify the user owns this chat
  const chat = await db
    .select()
    .from(chatTable)
    .where(and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)));

  if (!chat[0]) {
    throw new Error("Chat not found or unauthorized");
  }

  // Update the chat with the share path
  await db.update(chatTable).set({ sharePath }).where(eq(chatTable.id, chatId));

  return sharePath;
}

export async function getChatBySharePath(sharePath: string) {
  const chat = await db
    .select()
    .from(chatTable)
    .where(eq(chatTable.sharePath, sharePath));
  return chat[0] || null;
}

export async function getSharedChatMessages(chatId: string) {
  const messages = await db
    .select()
    .from(messageTable)
    .where(eq(messageTable.chatId, chatId))
    .orderBy(asc(messageTable.createdAt));
  return messages;
}

export async function removeSharePath(chatId: string, userId: string) {
  // First verify the user owns this chat
  const chat = await db
    .select()
    .from(chatTable)
    .where(and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)));

  if (!chat[0]) {
    throw new Error("Chat not found or unauthorized");
  }

  // Remove the share path by setting it to null
  await db
    .update(chatTable)
    .set({ sharePath: null })
    .where(eq(chatTable.id, chatId));

  return true;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    // Helper function to validate UUID
    function isValidUUID(str: string): boolean {
      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return uuidRegex.test(str);
    }

    let foundMessage = null;

    // First, try to find the message by the provided ID if it's a valid UUID
    if (isValidUUID(id)) {
      const messageToFind = await db
        .select()
        .from(message)
        .where(eq(message.id, id))
        .limit(1);

      if (messageToFind.length > 0) {
        foundMessage = messageToFind[0];
      }
    }

    // If we couldn't find the message by ID (either invalid UUID or not found),
    // this typically means the frontend has a message with an AI SDK generated ID
    // but the database has stored it with a UUID. In this case, we should handle
    // it gracefully by not deleting anything from the database since the message
    // with this ID doesn't exist there.
    if (!foundMessage) {
      console.warn(
        `Message not found for deleteTrailingMessages: ${id}. This is expected when frontend messages have AI SDK generated IDs.`
      );
      return { success: true }; // Return success to allow frontend optimistic updates
    }

    // Delete all messages in the chat after this timestamp (including this message)
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: foundMessage.chatId,
      timestamp: foundMessage.createdAt,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete trailing messages:", error);
    // Instead of throwing an error, return success to avoid breaking the frontend
    // The frontend will handle message deletion optimistically
    return { success: true };
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    // Find all messages to delete
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((msg) => msg.id);

    if (messageIds.length > 0) {
      // Delete the messages
      await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }

    return { success: true };
  } catch (error) {
    console.error(
      "Failed to delete messages by chat id after timestamp:",
      error
    );
    throw new Error("Failed to delete messages by chat id after timestamp");
  }
}

export async function deleteResponsesAfterMessage({ id }: { id: string }) {
  try {
    // Helper function to validate UUID
    function isValidUUID(str: string): boolean {
      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return uuidRegex.test(str);
    }

    let foundMessage = null;

    // First, try to find the message by the provided ID if it's a valid UUID
    if (isValidUUID(id)) {
      const messageToFind = await db
        .select()
        .from(message)
        .where(eq(message.id, id))
        .limit(1);

      if (messageToFind.length > 0) {
        foundMessage = messageToFind[0];
      }
    }

    // If we couldn't find the message by ID, handle it gracefully
    if (!foundMessage) {
      console.warn(
        `Message not found for deleteResponsesAfterMessage: ${id}. This is expected when frontend messages have AI SDK generated IDs.`
      );
      return { success: true }; // Return success to allow frontend optimistic updates
    }

    // Delete all messages in the chat AFTER this timestamp (excluding this message)
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(
          eq(message.chatId, foundMessage.chatId),
          gt(message.createdAt, foundMessage.createdAt)
        )
      );

    const messageIds = messagesToDelete.map((msg) => msg.id);

    if (messageIds.length > 0) {
      // Delete the messages
      await db
        .delete(message)
        .where(
          and(
            eq(message.chatId, foundMessage.chatId),
            inArray(message.id, messageIds)
          )
        );
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete responses after message:", error);
    // Instead of throwing an error, return success to avoid breaking the frontend
    return { success: true };
  }
}
