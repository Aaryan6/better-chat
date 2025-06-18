import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chat, message, vote, stream } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  // Clerk Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Query all chats for the user
  const chats = await db
    .select({
      id: chat.id,
      title: chat.title,
      sharePath: chat.sharePath,
      createdAt: chat.createdAt,
    })
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.createdAt));
  return NextResponse.json(chats);
}

export async function DELETE(req: NextRequest) {
  // Clerk Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { chatId } = await req.json();

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Verify the chat exists and belongs to the user
    const existingChat = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.id, chatId) && eq(chat.userId, userId))
      .limit(1);

    if (existingChat.length === 0) {
      return NextResponse.json(
        { error: "Chat not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete related records in the correct order (without transaction since neon-http doesn't support it)
    // We need to be careful about the order and handle errors properly

    try {
      // 1. Delete votes (references both chat and message)
      await db.delete(vote).where(eq(vote.chatId, chatId));

      // 2. Delete streams (references chat)
      await db.delete(stream).where(eq(stream.chatId, chatId));

      // 3. Delete messages (references chat)
      await db.delete(message).where(eq(message.chatId, chatId));

      // 4. Finally delete the chat
      await db.delete(chat).where(eq(chat.id, chatId));
    } catch (deleteError) {
      console.error("Error during deletion sequence:", deleteError);
      throw new Error("Failed to delete chat and related data");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
