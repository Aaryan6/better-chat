"use client";

import { defaultModel, modelID } from "@/ai/providers";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChat } from "@ai-sdk/react";
import { DragEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Messages } from "./messages";
import { ProjectOverview } from "@/components/project-overview";
import { FeaturesOverview } from "@/components/features-overview";
import { Textarea } from "./textarea";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { mutate } from "swr";
import { Header } from "./header";
import { Button } from "./ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

// Function to get credits from cookies
const getCreditsFromCookies = (): number => {
  if (typeof window === "undefined") return 10;
  const cookies = document.cookie;
  const creditMatch = cookies.match(/anonymous_credits=(\d+)/);
  return creditMatch ? parseInt(creditMatch[1]) : 10;
};

const SELECTED_MODEL_KEY = "better-chat-model";
const OLLAMA_MODELS_KEY = "better-chat-ollama-models";
const LONG_TEXT_THRESHOLD = 500; // Characters

// Function to get initial model from localStorage or fallback to default
const getInitialModel = (): modelID | string => {
  if (typeof window === "undefined") return defaultModel;

  try {
    const saved = localStorage.getItem(SELECTED_MODEL_KEY);
    // Check if the saved model is valid (either a predefined model or an Ollama model)
    if (saved) {
      // If it's an Ollama model, check if it exists in saved Ollama models
      if (saved.startsWith("ollama:")) {
        const savedOllamaModels = localStorage.getItem(OLLAMA_MODELS_KEY);
        if (savedOllamaModels) {
          const ollamaModels = JSON.parse(savedOllamaModels);
          if (ollamaModels.includes(saved)) {
            return saved;
          }
        }
        // If Ollama model not found in saved models, return default
        return defaultModel;
      }
      // For non-Ollama models, return as is
      return saved;
    }
    return defaultModel;
  } catch {
    return defaultModel;
  }
};

export default function Chat({
  chatId,
  initialMessages = [],
  isReadOnly = false,
}: {
  chatId: string;
  initialMessages?: any[];
  isReadOnly?: boolean;
}) {
  const [selectedModel, setSelectedModel] = useState<modelID | string>(
    getInitialModel
  );
  const [isMounted, setIsMounted] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const { user, isLoaded } = useUser();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const isMobile = useIsMobile();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
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
    sendExtraMessageFields: true,
    experimental_prepareRequestBody: (body) => ({
      id: chatId,
      message: body.messages.at(-1),
      selectedModel,
      messages: messages,
    }),
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
      const responseId = headers.get("X-Chat-Id");
      const creditsHeader = headers.get("X-Remaining-Credits");

      // Update remaining credits if header is present
      if (creditsHeader) {
        setRemainingCredits(parseInt(creditsHeader));
      }

      // Update URL with chatId from response if needed
      if (messages.length === 0 && responseId) {
        window.history.replaceState({}, "", `/chat/${responseId}`);
      }
      if (messages.length < 3) {
        mutate("/api/history");
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

  // Use effect to set mounted state and initialize credits
  useEffect(() => {
    setIsMounted(true);
    // Only initialize credits when user data is loaded
    if (isLoaded) {
      if (!user) {
        // Anonymous user - get credits from cookies
        const credits = getCreditsFromCookies();
        setRemainingCredits(credits);
      } else {
        // Logged-in user - don't set remaining credits initially
        setRemainingCredits(null);
      }
    }
  }, [user, isLoaded]);

  // Handle mobile keyboard detection
  useEffect(() => {
    if (!isMounted) return;

    const handleResize = () => {
      // Detect mobile keyboard by checking if viewport height decreased significantly
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      const heightDifference = windowHeight - viewportHeight;

      // Consider keyboard open if height difference is more than 150px (typical threshold)
      const keyboardOpen = heightDifference > 150;
      setIsKeyboardOpen(keyboardOpen);
    };

    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDifference = windowHeight - viewportHeight;

        const keyboardOpen = heightDifference > 150;
        setIsKeyboardOpen(keyboardOpen);
      }
    };

    // Listen for viewport changes (more reliable for mobile keyboards)
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        handleVisualViewportChange
      );
    } else {
      // Fallback for browsers without visualViewport support
      window.addEventListener("resize", handleResize);
    }

    // Initial check
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleVisualViewportChange
        );
      } else {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, [isMounted]);

  // Save selected model to localStorage whenever it changes
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

    if (!user && remainingCredits === 0) {
      toast.error("You have no credits left, please sign in to continue", {
        position: "top-center",
        richColors: true,
      });
      return;
    }

    if (!input.trim() && files.length === 0) {
      toast.error("Please enter a message or add a file", {
        position: "top-center",
        richColors: true,
      });
      return;
    }

    try {
      const dataTransfer = new DataTransfer();
      files.forEach((file) => dataTransfer.items.add(file));
      const fileList = dataTransfer.files;

      handleSubmit(e, {
        experimental_attachments: fileList,
      });

      // Clear the uploaded files after sending
      if (files.length > 0) {
        setFiles([]);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles) {
      setFiles((prev) => [...prev, ...Array.from(droppedFiles)]);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    const text = event.clipboardData?.getData("text/plain");

    if (items) {
      const pastedFiles = Array.from(items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (pastedFiles.length > 0) {
        setFiles((prev) => [...prev, ...pastedFiles]);
        return;
      }
    }

    // Handle long text as file
    if (text && text.length > LONG_TEXT_THRESHOLD) {
      // Create a descriptive filename with preview of content
      const preview = text
        .slice(0, 30)
        .replace(/[^\w\s-]/g, "")
        .trim();
      const timestamp = new Date()
        .toISOString()
        .slice(11, 19)
        .replace(/:/g, "-");
      const filename = preview
        ? `${preview}-${timestamp}.txt`
        : `pasted-text-${timestamp}.txt`;

      const textFile = new File([text], filename, {
        type: "text/plain",
      });
      setFiles((prev) => [...prev, textFile]);

      // Prevent the text from being pasted into the input
      event.preventDefault();
    }
  };

  // Handle input focus to prevent page scroll on mobile
  const handleInputFocus = () => {
    if (isKeyboardOpen && messages.length > 0) {
      // Small delay to ensure keyboard is fully open
      setTimeout(() => {
        // Scroll the form into view smoothly without affecting the messages
        const formElement = document.querySelector("form");
        if (formElement) {
          formElement.scrollIntoView({
            behavior: "smooth",
            block: "end",
            inline: "nearest",
          });
        }
      }, 300);
    }
  };

  // Don't render anything on the server
  if (!isMounted) {
    return null;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col min-w-0 bg-background relative",
        messages.length === 0 && "justify-center",
        isKeyboardOpen ? "h-[100dvh]" : "h-dvh"
      )}
      style={{
        height:
          isKeyboardOpen && window.visualViewport
            ? `${window.visualViewport.height}px`
            : undefined,
      }}
    >
      <Header />
      {messages.length === 0 ? (
        <div className="max-w-xl mx-auto w-full p-4 sm:px-0">
          <ProjectOverview />
        </div>
      ) : (
        <div
          className="flex-1 overflow-hidden"
          style={{
            // On mobile with keyboard open, adjust height to account for reduced viewport
            height:
              isMobile && isKeyboardOpen && window.visualViewport
                ? `${window.visualViewport.height - 60}px` // 60px for header
                : undefined,
          }}
        >
          <Messages
            messages={messages}
            isLoading={status === "streaming"}
            status={status}
            setMessages={setMessages}
            reload={reload}
          />
        </div>
      )}
      {!isReadOnly && (
        <form
          onSubmit={handleFormSubmit}
          className={cn(
            "w-full max-w-4xl mx-auto sm:px-0 flex-shrink-0 relative",
            // Desktop: normal flow
            isMobile &&
              messages.length > 0 &&
              "max-w-3xl w-full px-0 sticky bottom-0 backdrop-blur-sm",
            // Mobile: absolute positioning when there are messages
            !isMobile &&
              messages.length > 0 &&
              "absolute bottom-0 left-0 right-0 w-full max-w-3xl mx-auto z-10"
          )}
        >
          <div
            className={cn(
              "space-y-3 grid gap-2 max-w-xl mx-auto",
              // Center the form content on mobile
              isMobile && messages.length > 0 && "max-w-3xl mx-auto"
            )}
          >
            {isLoaded &&
              !user &&
              remainingCredits !== null &&
              remainingCredits <= 10 && (
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
              files={files}
              onFileChange={handleFileChange}
              onRemoveFile={handleRemoveFile}
              onPaste={handlePaste}
              onFocus={handleInputFocus}
            />
          </div>
          {/* {messages.length === 0 && (
            <div className="max-w-4xl mx-auto w-full p-4 sm:px-0  top-0 left-0 right-0">
              <FeaturesOverview />
            </div>
          )} */}
        </form>
      )}
    </div>
  );
}
