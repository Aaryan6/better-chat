import { model, modelID } from "@/ai/providers";
import { weatherTool, webSearch } from "@/ai/tools";
import {
  createChat,
  getChat,
  getLastMessage,
  saveMessage,
  saveStreamId,
  updateChatTitle,
} from "@/db/queries";
import { getTrailingMessageId } from "@/lib/utils";
import { generateTitleFromMessages, loadStreams } from "@/utils/chat-store";
import { auth } from "@clerk/nextjs/server";
import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
  UIMessage,
} from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { v4 as uuidv4 } from "uuid";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

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

  const { selectedModel, message, id: chatId, messages } = await req.json();

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
      message,
      selectedModel,
      chatId,
      userId,
      remainingCredits: newCredits,
      messages,
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
  return handleChatRequest({
    message,
    selectedModel,
    chatId,
    userId,
    remainingCredits: undefined,
    messages,
  });
}

async function handleChatRequest({
  chatId,
  message,
  selectedModel,
  userId,
  remainingCredits,
  messages: previousMessages,
}: {
  message: UIMessage;
  selectedModel: modelID;
  chatId: string;
  userId: string | null;
  remainingCredits?: number;
  messages: UIMessage[];
}) {
  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  const processedAttachments = [];
  if (message.experimental_attachments) {
    for (const attachment of message.experimental_attachments) {
      const richAttachment = attachment as {
        name?: string;
        contentType?: string;
        content?: Uint8Array;
      };

      if (richAttachment.content) {
        // content is received as an object with numeric keys, convert back to Uint8Array
        const uint8array = new Uint8Array(
          Object.values(richAttachment.content)
        );
        // content is ArrayBuffer, need to convert to something uploadthing accepts
        const blob = new Blob([uint8array], {
          type: richAttachment.contentType,
        });
        const file = new File([blob], richAttachment.name ?? "untitled", {
          type: richAttachment.contentType,
        });

        const uploadResult = await utapi.uploadFiles([file]);
        if (uploadResult[0].data?.url) {
          processedAttachments.push({
            name: richAttachment.name,
            contentType: richAttachment.contentType,
            url: uploadResult[0].data.url,
          });
        }
      } else {
        processedAttachments.push(attachment);
      }
    }
  }

  const messageToSave: UIMessage = {
    ...message,
    experimental_attachments: processedAttachments,
  };

  const messages = appendClientMessage({
    messages: previousMessages,
    message: messageToSave,
  });

  // Only save to database if user is authenticated
  if (userId) {
    const chat = await getChat(chatId);
    if (!chat) {
      await createChat(chatId, userId, message.content as string);
    }
    await saveMessage({
      id: uuidv4(),
      chatId,
      role: messageToSave.role,
      parts: messageToSave.parts,
      attachments: messageToSave.experimental_attachments ?? [],
    });
  }

  // --- Resumable stream logic ---
  const streamId = uuidv4();
  if (userId) {
    await saveStreamId(chatId, streamId);
  }

  const stream = createDataStream({
    execute: (dataStream) => {
      // If there's an image but we're using a local model, add a note about image limitations
      const systemPrompt = `You are a helpful assistant. Be helpful and concise. Use markdown to format your responses.
          Rules:
          - Use markdown for code blocks, wrap the code in \`\`\` and add the programming language to the code block.
          - You have reasoning capabilities and can think through problems step by step.${
            remainingCredits !== undefined
              ? `\n          - This is an anonymous user with ${remainingCredits} credits remaining. Remind them to sign up for unlimited access.`
              : ""
          }`;

      const result = streamText({
        model: model.languageModel(selectedModel),
        system: systemPrompt,
        messages: messages,
        tools: {
          webSearch,
        },
        experimental_transform: smoothStream({
          chunking: "word",
          delayInMs: 30,
        }),
        maxSteps: 2,
        onFinish: async ({ response, text }) => {
          if (userId) {
            const assistantId = getTrailingMessageId({
              messages: response.messages.filter(
                (message) => message.role === "assistant"
              ),
            });

            if (!assistantId) {
              throw new Error("No assistant message found!");
            }

            const [, assistantMessage] = appendResponseMessages({
              messages: [message],
              responseMessages: response.messages,
            });
            // Only save to database if user is authenticated
            await saveMessage({
              chatId,
              id: uuidv4(),
              parts: assistantMessage.parts,
              role: assistantMessage.role,
              attachments: assistantMessage.experimental_attachments ?? [],
            });

            if (messages.length < 3) {
              const title = await generateTitleFromMessages({
                userMessage: message.content,
                assistantMessage: text,
              });
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
  console.error("Chat API Error:", error);

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
