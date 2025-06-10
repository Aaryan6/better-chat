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
  const { messages, selectedModel, chatId, data } = await req.json();

  // Handle anonymous users with credit system
  if (!userId) {
    const cookies = req.headers.get("cookie") || "";
    const creditMatch = cookies.match(/anonymous_credits=(\d+)/);
    const currentCredits = creditMatch ? parseInt(creditMatch[1]) : 10;

    if (currentCredits <= 0) {
      return new Response(
        JSON.stringify({
          error: "Credits exhausted",
          message:
            "You've used all your free credits. Please sign in to continue chatting.",
          requiresLogin: true,
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Deduct one credit for anonymous users
    const newCredits = currentCredits - 1;
    const response = await handleChatRequest(
      messages,
      selectedModel,
      chatId,
      null,
      newCredits,
      data
    );

    // Set the updated credits in cookie
    response.headers.set(
      "Set-Cookie",
      `anonymous_credits=${newCredits}; Path=/; Max-Age=${
        7 * 24 * 60 * 60
      }; SameSite=Lax`
    );
    response.headers.set("X-Remaining-Credits", newCredits.toString());

    return response;
  }

  // Handle authenticated users (no credit limit)
  return handleChatRequest(
    messages,
    selectedModel,
    chatId,
    userId,
    undefined,
    data
  );
}

async function handleChatRequest(
  messages: any[],
  selectedModel: modelID,
  chatId: string,
  userId: string | null,
  remainingCredits?: number,
  data?: any
) {
  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  // Prepare messages for the AI model
  let processedMessages = messages;

  // If there's an image in the data, modify the last user message
  console.log({ data });
  if (data?.imageUrl) {
    const lastUserMessage = messages
      .filter((m: UIMessage) => m.role === "user")
      .pop();

    if (lastUserMessage) {
      // Create a new messages array with the modified last message
      processedMessages = [
        ...messages.slice(0, -1),
        {
          role: "user",
          content: [
            { type: "text", text: lastUserMessage.content },
            { type: "image", image: data.imageUrl },
          ],
        },
      ];
    }
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

  // Only save to database if user is authenticated
  if (userId) {
    const chat = await getChat(chatId);
    if (!chat) {
      await createChat(chatId, userId, lastUserMessageContentString);
    }
    await saveMessage(chatId, "user", lastUserMessageContentString);
  }

  // --- Resumable stream logic ---
  const streamId = uuidv4();
  if (userId) {
    await saveStreamId(chatId, streamId);
  }

  const stream = createDataStream({
    execute: (dataStream) => {
      console.log(
        "Processed messages sent to AI:",
        JSON.stringify(processedMessages, null, 2)
      );
      console.log("Selected model:", selectedModel);
      console.log("Has image:", !!data?.imageUrl);

      // Ensure we're using a vision-capable model when image is present
      const modelToUse = data?.imageUrl
        ? "gemini-2.5-pro-preview-05-06" // Use Gemini for vision tasks
        : selectedModel;

      console.log("Final model used:", modelToUse);

      const result = streamText({
        model: model.languageModel(modelToUse),
        system: `You are a helpful assistant. Be helpful and concise. Use markdown to format your responses.
          Rules:
          - Use markdown for code blocks, wrap the code in \`\`\` and add the programming language to the code block.
          - When analyzing images, be descriptive and helpful. Explain what you see in detail.
          - You have vision capabilities and can analyze images provided by users.${
            remainingCredits !== undefined
              ? `\n          - This is an anonymous user with ${remainingCredits} credits remaining. Remind them to sign up for unlimited access.`
              : ""
          }`,
        messages: processedMessages,
        // tools: {
        //   getWeather: weatherTool,
        // },
        experimental_transform: smoothStream({
          chunking: "word",
          delayInMs: 30,
        }),
        onFinish: async ({ text }) => {
          // Only save to database if user is authenticated
          if (userId) {
            await saveMessage(chatId, "assistant", text);

            const title = await generateTitleFromMessages({
              userMessage: lastUserMessageContentString,
              assistantMessage: text,
            });
            if (messages.length < 3) {
              await updateChatTitle(chatId, title);
            }
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
