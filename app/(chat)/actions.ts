"use server";

import { db } from "@/lib/db";
import { message } from "@/db/schema";
import { eq, gte, gt, and, inArray } from "drizzle-orm";

export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    // Get the message to find its chatId and timestamp
    const messageToFind = await db
      .select()
      .from(message)
      .where(eq(message.id, id))
      .limit(1);

    if (messageToFind.length === 0) {
      throw new Error("Message not found");
    }

    const foundMessage = messageToFind[0];

    // Delete all messages in the chat after this timestamp (including this message)
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: foundMessage.chatId,
      timestamp: foundMessage.createdAt,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete trailing messages:", error);
    throw new Error("Failed to delete trailing messages");
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
    // Get the message to find its chatId and timestamp
    const messageToFind = await db
      .select()
      .from(message)
      .where(eq(message.id, id))
      .limit(1);

    if (messageToFind.length === 0) {
      throw new Error("Message not found");
    }

    const foundMessage = messageToFind[0];

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
    throw new Error("Failed to delete responses after message");
  }
}
