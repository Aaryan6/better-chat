import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chat } from "@/db/schema";
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
