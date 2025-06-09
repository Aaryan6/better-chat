import { model, modelID } from "@/ai/providers";
import { weatherTool } from "@/ai/tools";
import { chat as chatTable, message as messageTable } from "@/db/schema";
import { db } from "@/lib/db";
import { appendStreamId, loadStreams } from '@/utils/chat-store';
import { auth } from "@clerk/nextjs/server";
import { createDataStream, smoothStream, streamText, UIMessage } from "ai";
import { desc, eq } from 'drizzle-orm';
import { after } from 'next/server';
import { createResumableStreamContext } from 'resumable-stream';
import { v4 as uuidv4 } from 'uuid';

// Helper function to validate UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(str);
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const streamContext = createResumableStreamContext({
  waitUntil: after,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId') || searchParams.get('id'); // Accept 'id' as fallback

  if (!chatId) {
    // Updated error message for clarity
    return new Response('chatId or id query parameter is required', { status: 400 });
  }

  const streamIds = await loadStreams(chatId);

  console.log({streamIds})

  if (!streamIds.length) {
    return new Response('No streams found', { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response('No recent stream found', { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  if (stream) {
    return new Response(stream, { status: 200 });
  }

  // If the stream is closed, fallback to sending the last assistant message if any
  // For this, fetch messages from DB and stream the last assistant message
  // Drizzle ORM: fetch the most recent assistant message for this chat
  const messages = await db
    .select()
    .from(messageTable)
    .where(eq(messageTable.chatId, chatId))
    .orderBy(desc(messageTable.createdAt))
    .limit(1);
  const mostRecentMessage = messages[0];

  if (!mostRecentMessage || mostRecentMessage.role !== 'assistant') {
    return new Response(emptyDataStream, { status: 200 });
  }

  const streamWithMessage = createDataStream({
    execute: buffer => {
      buffer.writeData({
        type: 'append-message',
        message: JSON.stringify(mostRecentMessage),
      });
    },
  });

  return new Response(streamWithMessage, { status: 200 });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {messages, selectedModel, chatId} = await req.json();

  console.log({chatId})

  const lastUserMessage = messages.filter((m: UIMessage) => m.role === 'user').pop();

  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  let chatRecordId = chatId;
  let newChatCreated = false;

  // Ensure lastUserMessage.content is a string for database saving
  const lastUserMessageContentString = typeof lastUserMessage.content === 'string' 
    ? lastUserMessage.content 
    : JSON.stringify(lastUserMessage.content); // Fallback for non-string content

  // Save user message
  if (lastUserMessageContentString) {
    if (!chatId) {
      const newChatId = uuidv4(); // Generate UUID for new chat
      const newChat = await db
        .insert(chatTable)
        .values({
          id: newChatId,
          userId: userId,
          title: lastUserMessageContentString.substring(0, 100),
          createdAt: new Date(),
        })
        .returning({ id: chatTable.id }); 

      if (newChat.length > 0 && newChat[0].id) {
        chatRecordId = newChat[0].id;
        newChatCreated = true;
      } else {
        console.error("Failed to create chat or retrieve ID from DB response:", newChat);
        return new Response("Failed to create chat", { status: 500 });
      }
    }

    await db.insert(messageTable).values({
      id: uuidv4(), // Generate UUID for new message
      chatId: chatRecordId!, // chatRecordId is now guaranteed to be set
      role: lastUserMessage.role as 'user' | 'assistant', // Explicitly type role
      parts: [{ type: 'text', text: lastUserMessageContentString }],
      attachments: [], // Assuming no attachments for now
      createdAt: new Date(),
    });
  }

  // --- Resumable stream logic ---
  const streamId = uuidv4();
  await appendStreamId({ chatId: chatRecordId!, streamId });

  const stream = createDataStream({
    execute: dataStream => {
      const result = streamText({
        model: model.languageModel(selectedModel),
        system: "You are a helpful assistant.",
        messages: messages,
        tools: {
          getWeather: weatherTool,
        },
        experimental_transform: smoothStream({chunking: 'word'}),
        onFinish: async ({ text }) => {
          if (chatRecordId && text) {
            await db.insert(messageTable).values({
              id: uuidv4(),
              chatId: chatRecordId,
              role: 'assistant',
              parts: [{ type: 'text', text: text }],
              attachments: [],
              createdAt: new Date(),
            });
          }
        },
      });
      result.mergeIntoDataStream(dataStream);
    },
  });

  const resumable = await streamContext.resumableStream(streamId, () => stream);

  // send new chat id to client
  const headers = new Headers();
  headers.set('X-Chat-Id', chatRecordId!);

  console.log({chatRecordId})


  return new Response(resumable, {
    status: 200,
    headers,
  });
}

