import { model, modelID } from "@/ai/providers";
import { weatherTool } from "@/ai/tools";
import { getLastMessage } from "@/db/queries";
import { loadStreams } from "@/utils/chat-store";
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
  let userId: string | null = null;

  // Try to get userId, but don't fail if authentication is unavailable (offline)
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.log("Authentication failed, proceeding as anonymous user:", error);
    // userId remains null, which triggers anonymous user flow
  }

  const { messages, selectedModel, data, id: chatId } = await req.json();
  console.log({ messages, selectedModel, chatId, data });
  const streamId = data?.streamId;
  console.log({ streamId });

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
    const response = await handleChatRequest({
      messages,
      selectedModel,
      chatId,
      data,
      streamId,
    });

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
  return handleChatRequest({ messages, selectedModel, chatId, data, streamId });
}

async function handleChatRequest({
  messages,
  selectedModel,
  chatId,
  streamId,
  data,
}: {
  messages: any[];
  selectedModel: modelID;
  chatId: string;
  streamId: string;
  data?: any;
}) {
  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  // Prepare messages for the AI model
  let processedMessages = messages;

  // If there's an image in the data, modify the last user message
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

  const stream = createDataStream({
    execute: (dataStream) => {
      const modelToUse = selectedModel;

      // If there's an image but we're using a local model, add a note about image limitations
      const systemPrompt = `You are a helpful assistant. Be helpful and concise. Use markdown to format your responses.
          Rules:
          - Use markdown for code blocks, wrap the code in \`\`\` and add the programming language to the code block.`;

      const result = streamText({
        model: model.languageModel(modelToUse),
        system: systemPrompt,
        messages: processedMessages,
        // tools: {
        //   getWeather: weatherTool,
        // },
        experimental_transform: smoothStream({
          chunking: "word",
          delayInMs: 30,
        }),
        onFinish: async ({ text }) => {},
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
    return "Unknown error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    // Check for common Ollama connection errors
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("fetch failed") ||
      error.message.includes("localhost:11434")
    ) {
      return "Failed to connect to local AI model. Please ensure Ollama is running:\n\n```bash\nollama serve\n```\n\nThen verify your model is available:\n```bash\nollama list\n```";
    }

    // Check for model not found errors
    if (
      error.message.includes("model") &&
      error.message.includes("not found")
    ) {
      return "Local AI model not found. Please ensure deepseek-r1:7b is installed:\n\n```bash\nollama pull deepseek-r1:7b\n```";
    }

    return `Error: ${error.message}`;
  }

  return JSON.stringify(error);
}
