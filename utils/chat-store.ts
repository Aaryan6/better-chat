// Utility for managing chat stream IDs (resumable streams)
import { db } from '@/lib/db';
import { stream as streamTable } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function appendStreamId({ chatId, streamId }: { chatId: string; streamId: string }) {
  try {
    await db.insert(streamTable).values({
      id: streamId, // The streamId itself is the 'id' in the stream table
      chatId: chatId,
      // createdAt will be set by default by the database
    });
    console.log(`Stream ID ${streamId} appended to chat ${chatId} in DB.`);
  } catch (error) {
    console.error(`Error appending stream ID ${streamId} for chat ${chatId} to DB:`, error);
    // Depending on requirements, you might want to throw the error or handle it
  }
}

export async function loadStreams(chatId: string): Promise<string[]> {
  try {
    const streamRecords = await db
      .select({
        id: streamTable.id,
      })
      .from(streamTable)
      .where(eq(streamTable.chatId, chatId))
      .orderBy(asc(streamTable.createdAt)); // Ensure streams are loaded in order
    
    const streamIds = streamRecords.map(record => record.id);
    console.log(`Loaded ${streamIds.length} stream IDs for chat ${chatId} from DB:`, streamIds);
    return streamIds;
  } catch (error) {
    console.error(`Error loading stream IDs for chat ${chatId} from DB:`, error);
    return []; // Return empty array on error to prevent breaking, or re-throw
  }
}

// The previous in-memory store and Redis examples are now replaced by Drizzle ORM with Neon DB.
