import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSharePath, removeSharePath } from "@/db/queries";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await req.json();
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const sharePath = await createSharePath(chatId, userId);
    const shareUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/share/${sharePath}`;

    return NextResponse.json({ shareUrl, sharePath });
  } catch (error: any) {
    console.error("Share API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await req.json();
    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    await removeSharePath(chatId, userId);

    return NextResponse.json({
      success: true,
      message: "Share access removed",
    });
  } catch (error: any) {
    console.error("Remove share API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove share access" },
      { status: 500 }
    );
  }
}
