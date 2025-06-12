"use server";
import {
  chat as chatTable,
  message as messageTable,
  stream as streamTable,
} from "@/db/schema";
import { db } from "@/lib/db";
import { UIMessage } from "ai";
import { desc, eq } from "drizzle-orm";

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

// Ensure chat exists before performing operations
export async function ensureChatExists(
  chatId: string,
  userId: string,
  title?: string
) {
  try {
    // First check if chat already exists
    const existingChat = await getChat(chatId);
    if (existingChat) {
      return true;
    }

    // Create chat if it doesn't exist
    const defaultTitle = title || "New Chat";
    await db.insert(chatTable).values({
      id: chatId,
      userId: userId,
      title: defaultTitle.substring(0, 100),
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    // If error is due to duplicate key (race condition), check if chat exists now
    if (error instanceof Error && error.message.includes("duplicate key")) {
      const existingChat = await getChat(chatId);
      return !!existingChat;
    }
    console.error("Failed to ensure chat exists:", error);
    return false;
  }
}

// Message queries - Enhanced with chat existence check
export async function saveMessage(
  message: UIMessage,
  chatId: string,
  attachments?: string[]
) {
  try {
    await db.insert(messageTable).values({
      ...message,
      chatId: chatId,
      attachments: attachments || [],
    });
    return true;
  } catch (error) {
    console.error(`Failed to save message:`, error);
    return false;
  }
}

// Safe message save that ensures chat exists first
export async function saveMessageSafely(
  message: UIMessage,
  chatId: string,
  userId: string,
  chatTitle?: string,
  attachments?: string[]
) {
  try {
    // Ensure chat exists first
    const chatExists = await ensureChatExists(chatId, userId, chatTitle);
    if (!chatExists) {
      console.error("Failed to ensure chat exists for message save");
      return false;
    }

    // Now save the message
    return await saveMessage(message, chatId, attachments);
  } catch (error) {
    console.error(`Failed to save message safely:`, error);
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

// Safe stream ID save that ensures chat exists first
export async function saveStreamIdSafely(
  chatId: string,
  streamId: string,
  userId: string,
  chatTitle?: string
) {
  try {
    // Ensure chat exists first
    const chatExists = await ensureChatExists(chatId, userId, chatTitle);
    if (!chatExists) {
      console.error("Failed to ensure chat exists for stream ID save");
      return false;
    }

    // Now save the stream ID
    return await saveStreamId(chatId, streamId);
  } catch (error) {
    console.error(`Failed to save stream ID safely:`, error);
    return false;
  }
}

// Utility function to retry database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(
        `Database operation failed (attempt ${attempt}/${maxRetries}):`,
        error
      );

      if (attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

// Enhanced safe message save with retry logic
export async function saveMessageSafelyWithRetry(
  message: UIMessage,
  chatId: string,
  userId: string,
  chatTitle?: string,
  attachments?: string[]
) {
  return retryOperation(async () => {
    return await saveMessageSafely(
      message,
      chatId,
      userId,
      chatTitle,
      attachments
    );
  });
}

// Enhanced safe stream ID save with retry logic
export async function saveStreamIdSafelyWithRetry(
  chatId: string,
  streamId: string,
  userId: string,
  chatTitle?: string
) {
  return retryOperation(async () => {
    return await saveStreamIdSafely(chatId, streamId, userId, chatTitle);
  });
}

// Optimized message save - only use when you're certain chat exists
export async function saveMessageOptimized(
  message: UIMessage,
  chatId: string,
  attachments?: string[]
) {
  try {
    await db.insert(messageTable).values({
      ...message,
      chatId: chatId,
      attachments: attachments || [],
    });
    return true;
  } catch (error) {
    // If foreign key constraint fails, fallback to safe save
    if (error instanceof Error && error.message.includes("foreign key")) {
      console.warn("Chat doesn't exist, falling back to safe save");
      return false;
    }
    console.error(`Failed to save message optimized:`, error);
    return false;
  }
}

// Optimized stream ID save - only use when you're certain chat exists
export async function saveStreamIdOptimized(chatId: string, streamId: string) {
  try {
    await db.insert(streamTable).values({
      id: streamId,
      chatId: chatId,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    // If foreign key constraint fails, fallback to safe save
    if (error instanceof Error && error.message.includes("foreign key")) {
      console.warn("Chat doesn't exist, falling back to safe save");
      return false;
    }
    console.error(`Failed to save stream ID optimized:`, error);
    return false;
  }
}
