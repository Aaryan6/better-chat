import { model, modelID } from "@/ai/providers";
import { weatherTool } from "@/ai/tools";
import {
  createChat,
  getChat,
  getLastMessage,
  saveMessage,
  saveStreamId,
  updateChatTitle,
} from "@/db/queries";
import { generateTitleFromMessages, loadStreams } from "@/utils/chat-store";
import { auth } from "@clerk/nextjs/server";
import { createDataStream, smoothStream, streamText, UIMessage } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { v4 as uuidv4 } from "uuid";

// Helper function to validate UUID
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(str);
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const streamContext = createResumableStreamContext({
  waitUntil: after,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId") || searchParams.get("id"); // Accept 'id' as fallback

  if (!chatId) {
    // Updated error message for clarity
    return new Response("chatId or id query parameter is required", {
      status: 400,
    });
  }

  const streamIds = await loadStreams(chatId);

  console.log({ streamIds });

  if (!streamIds.length) {
    return new Response("No streams found", { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response("No recent stream found", { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream
  );

  if (stream) {
    return new Response(stream, { status: 200 });
  }

  // If the stream is closed, fallback to sending the last assistant message if any
  const mostRecentMessage = await getLastMessage(chatId);

  if (!mostRecentMessage || mostRecentMessage.role !== "assistant") {
    return new Response(emptyDataStream, { status: 200 });
  }

  const streamWithMessage = createDataStream({
    execute: (buffer) => {
      buffer.writeData({
        type: "append-message",
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

  const { messages, selectedModel, chatId } = await req.json();

  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  const lastUserMessage = messages
    .filter((m: UIMessage) => m.role === "user")
    .pop();

  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  // Ensure lastUserMessage.content is a string for database saving
  const lastUserMessageContentString =
    typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : JSON.stringify(lastUserMessage.content); // Fallback for non-string content

  const chat = await getChat(chatId);
  if (!chat) {
    await createChat(chatId, userId, lastUserMessageContentString);
  }

  await saveMessage(chatId, "user", lastUserMessageContentString);

  // --- Resumable stream logic ---
  const streamId = uuidv4();
  await saveStreamId(chatId, streamId);

  const stream = createDataStream({
    execute: (dataStream) => {
      const result = streamText({
        model: model.languageModel(selectedModel),
        system: `You are a helpful assistant. Be helpful and concise. Use markdown to format your responses.
          Rules:
          - Use markdown for code blocks, wrap the code in \`\`\` and add the programming language to the code block.`,
        messages: messages,
        // tools: {
        //   getWeather: weatherTool,
        // },
        experimental_transform: smoothStream({
          chunking: "word",
          delayInMs: 30,
        }),
        onFinish: async ({ text }) => {
          // Try to save the assistant message first
          await saveMessage(chatId, "assistant", text);

          const title = await generateTitleFromMessages({
            userMessage: lastUserMessageContentString,
            assistantMessage: text,
          });
          if (messages.length < 3) {
            await updateChatTitle(chatId, title);
          }
        },
      });
      result.mergeIntoDataStream(dataStream, { sendReasoning: true });
    },
    onError: errorHandler,
  });

  const resumable = await streamContext.resumableStream(streamId, () => stream);

  // send chat id to client
  const headers = new Headers();
  headers.set("X-Chat-Id", chatId);

  return new Response(resumable, {
    status: 200,
    headers,
  });
}

function errorHandler(error: unknown) {
  if (error == null) {
    return "unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}
