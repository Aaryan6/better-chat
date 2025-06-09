// Utility for managing chat stream IDs (resumable streams)
import { db } from "@/lib/db";
import { stream as streamTable } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { saveStreamId } from "@/db/queries";
import { generateText } from "ai";
import { model } from "@/ai/providers";

// Maintain appendStreamId for backward compatibility
export async function appendStreamId({
  chatId,
  streamId,
}: {
  chatId: string;
  streamId: string;
}) {
  return saveStreamId(chatId, streamId);
}

export async function loadStreams(chatId: string): Promise<string[]> {
  try {
    const streamRecords = await db
      .select({
        id: streamTable.id,
      })
      .from(streamTable)
      .where(eq(streamTable.chatId, chatId))
      .orderBy(asc(streamTable.createdAt))
      .execute();

    return streamRecords.map(({ id }) => id);
  } catch (error) {
    console.error(
      `Error loading stream IDs for chat ${chatId} from DB:`,
      error
    );
    return []; // Return empty array on error to prevent breaking, or re-throw
  }
}

export async function generateTitleFromMessages({
  userMessage,
  assistantMessage,
}: {
  userMessage: string;
  assistantMessage: string;
}) {
  const { text } = await generateText({
    model: model.languageModel("llama-3.1-8b-instant"),
    prompt: `Generate a title short title under 10 words for the following chat:\n
    user: ${userMessage}\n
    assistant: ${assistantMessage}
    
    ---
    
    Rules:
    - no quotation marks
    - no markdown
    - no html
    - no special characters
    - no emojis
    - no new lines
    `,
    maxTokens: 100,
  });
  return text;
}
