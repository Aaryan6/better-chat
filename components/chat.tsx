"use client";

import { defaultModel, modelID } from "@/ai/providers";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Messages } from "./messages";
import { ProjectOverview } from "./project-overview";
import { Textarea } from "./textarea";

import { cn } from "@/lib/utils";
import { Header } from "./header";
import { mutate } from "swr";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@clerk/nextjs";
import { v4 as uuidv4 } from "uuid";
import { UIMessage } from "ai";
import { createAIMessage, createUserMessage } from "@/utils/helpers";
import {
  createChat,
  saveMessage,
  saveStreamId,
  saveMessageSafely,
  saveStreamIdSafely,
} from "@/db/queries";
import { generateTitleFromMessages } from "@/utils/chat-store";
import { usePathname } from "next/navigation";

// Function to get credits from cookies
const getCreditsFromCookies = (): number => {
  if (typeof window === "undefined") return 10;
  const cookies = document.cookie;
  const creditMatch = cookies.match(/anonymous_credits=(\d+)/);
  return creditMatch ? parseInt(creditMatch[1]) : 10;
};

const SELECTED_MODEL_KEY = "better-chat-model";

// Function to get initial model from localStorage or fallback to default
const getInitialModel = (): modelID => {
  if (typeof window === "undefined") return defaultModel;

  try {
    const saved = localStorage.getItem(SELECTED_MODEL_KEY);
    return (saved as modelID) || defaultModel;
  } catch {
    return defaultModel;
  }
};

export default function Chat({
  chatId,
  initialMessages = [],
}: {
  chatId: string;
  initialMessages?: any[];
}) {
  const [selectedModel, setSelectedModel] = useState<modelID>(getInitialModel);
  const [isMounted, setIsMounted] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isChatCreated, setIsChatCreated] = useState(false);
  const { user } = useUser();
  const pathname = usePathname();

  console.log({ initialMessages });

  const {
    messages,
    input,
    handleInputChange,
    status,
    stop,
    experimental_resume,
    data,
    setMessages,
    append,
    reload,
  } = useChat({
    id: chatId,
    initialMessages,
    maxSteps: 5,
    body: {
      selectedModel,
    },
    sendExtraMessageFields: true,
    onResponse: (response) => {
      if (!response.ok) {
        // Handle credit exhaustion
        if (response.status === 403) {
          response.json().then((data) => {
            if (data.requiresLogin) {
              toast.error(data.message, {
                position: "top-center",
                richColors: true,
                duration: 6000,
                action: {
                  label: "Sign In",
                  onClick: () => {
                    window.location.href = "/sign-in";
                  },
                },
              });
              setRemainingCredits(0);
              return;
            }
          });
        }
        return;
      }

      const headers = response.headers;
      const creditsHeader = headers.get("X-Remaining-Credits");

      // Update remaining credits if header is present
      if (creditsHeader) {
        setRemainingCredits(parseInt(creditsHeader));
      }

      if (messages.length < 3) {
        mutate("/api/history");
      }
    },
    onFinish: async (result) => {
      const aiMessage = createAIMessage({
        id: uuidv4(),
        content: result.content,
        parts: result.parts || [],
        role: result.role,
      });
      console.log({ aiMessage });
      if (user) {
        // Chat already exists at this point, save directly
        await saveMessage(aiMessage, chatId);
      }
    },
    onError: (error) => {
      console.log("Chat error:", error);
      toast.error(
        typeof error === "string"
          ? error
          : error.message || "An error occurred",
        {
          position: "top-center",
          richColors: true,
        }
      );
    },
  });

  useEffect(() => {
    setIsMounted(true);
    // Initialize credits for anonymous users
    const credits = getCreditsFromCookies();
    setRemainingCredits(credits);

    // If there are initial messages, chat already exists
    if (initialMessages.length > 0) {
      setIsChatCreated(true);
    }
  }, [initialMessages.length]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(SELECTED_MODEL_KEY, selectedModel);
      } catch (error) {
        console.warn("Failed to save selected model to localStorage:", error);
      }
    }
  }, [selectedModel, isMounted]);

  useAutoResume({
    autoResume: true,
    initialMessages: messages,
    experimental_resume,
    data,
    setMessages,
  });

  // Handle form submission with enhanced error handling
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim()) {
      toast.error("Please enter a message", {
        position: "top-center",
        richColors: true,
      });
      return;
    }

    if (isUploading) {
      toast.error("Please wait for image upload to complete", {
        position: "top-center",
        richColors: true,
      });
      return;
    }

    if (pathname === "/" && user) {
      window.history.replaceState({}, "", `/chat/${chatId}`);
    }

    try {
      const userMessage = createUserMessage({
        id: uuidv4(),
        content: input,
      });

      // --- Resumable stream logic ---
      const streamId = uuidv4();

      // Start streaming immediately without waiting for DB operations
      append(userMessage, {
        data: {
          streamId,
        },
      });

      // Handle DB operations asynchronously after streaming starts
      if (user) {
        // Use setTimeout to ensure this happens after the append call
        setTimeout(async () => {
          try {
            if (!isChatCreated && messages.length === 0) {
              // First message - need to create chat and save user message
              const title = await generateTitleFromMessages({
                userMessage: userMessage.content,
              });

              // Use safe message save that ensures chat exists
              await saveMessageSafely(userMessage, chatId, user.id, title);
              await saveStreamIdSafely(chatId, streamId, user.id, title);

              console.log({ title, chatCreated: true });
              setIsChatCreated(true);
            } else {
              // Subsequent messages - just save the user message directly
              await saveMessage(userMessage, chatId);
              // Save stream ID (chat already exists)
              await saveStreamId(chatId, streamId);
            }
          } catch (error) {
            console.error("Background DB operation failed:", error);
            // Don't show error to user as streaming has already started
          }
        }, 0);
      }

      console.log({ msg: messages.length, usermsg: userMessage });
      if (uploadedImage) {
        setUploadedImage(null);
      }
    } catch (error: any) {
      toast.error(
        `Failed to send message: ${error.message || "Unknown error"}`,
        {
          position: "top-center",
          richColors: true,
        }
      );
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
  };

  const handleUploadStateChange = (uploading: boolean) => {
    setIsUploading(uploading);
  };

  // Don't render anything on the server
  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col min-w-0 h-dvh bg-background pt-8",
        messages.length === 0 && "justify-center"
      )}
    >
      <Header />
      {messages.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <ProjectOverview />
        </div>
      ) : (
        <Messages
          messages={messages}
          isLoading={status === "streaming"}
          status={status}
          setMessages={setMessages}
          reload={reload}
        />
      )}
      <form
        onSubmit={handleFormSubmit}
        className={cn(
          "w-full max-w-xl mx-auto px-4 sm:px-0 pt-4",
          messages.length > 0 && "absolute bottom-0 inset-x-0 max-w-3xl pt-0"
        )}
      >
        <div className="space-y-3 grid gap-2">
          {!user && remainingCredits !== null && remainingCredits <= 10 && (
            <div
              className={cn(
                "mx-auto max-w-md w-full order-2",
                messages.length > 0 && "order-1"
              )}
            >
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-muted to-muted/50 border border-secondary rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-primary">
                    {remainingCredits > 0 ? (
                      `${remainingCredits} free message${
                        remainingCredits !== 1 ? "s" : ""
                      } left`
                    ) : (
                      <span className="text-primary">
                        Sign In to continue chatting
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/sign-in"
                    className="text-xs bg-background hover:bg-primary/80 hover:text-white text-primary px-3 py-1.5 rounded-md transition-colors duration-200 font-medium"
                  >
                    {"Sign In"}
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-primary hover:text-primary/80 w-6 h-6"
                    type="button"
                    onClick={() => {
                      setRemainingCredits(null);
                    }}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <Textarea
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            handleInputChange={handleInputChange}
            input={input}
            isLoading={status === "streaming"}
            status={status}
            stop={stop}
            messages={messages}
            onImageUpload={handleImageUpload}
            uploadedImage={uploadedImage}
            onRemoveImage={handleRemoveImage}
            onUploadStateChange={handleUploadStateChange}
          />
        </div>
      </form>
    </div>
  );
}
