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
  const { user } = useUser();

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
    body: {
      selectedModel,
      chatId,
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
      console.log("error", error);
    },
  });

  // Use effect to set mounted state and initialize credits
  useEffect(() => {
    setIsMounted(true);
    // Initialize credits for anonymous users
    const credits = getCreditsFromCookies();
    setRemainingCredits(credits);
  }, []);

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

    try {
      const submitData = uploadedImage
        ? { imageUrl: uploadedImage }
        : undefined;
      console.log("uploadedImage", submitData);
      handleSubmit(e, { data: submitData });
      // Clear the uploaded image after sending
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

  const isLoading =
    status === "streaming" || status === "submitted" || isUploading;

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
          isLoading={isLoading}
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
            isLoading={isLoading}
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
