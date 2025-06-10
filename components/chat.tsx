"use client";

import { defaultModel, modelID } from "@/ai/providers";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Messages } from "./messages";
import { ProjectOverview } from "./project-overview";
import { Textarea } from "./textarea";

import { cn } from "@/lib/utils";
import { Header } from "./header";
import { mutate } from "swr";

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
        toast.error("Failed to get response from server", {
          position: "top-center",
          richColors: true,
        });
        return;
      }

      const headers = response.headers;
      const responseId = headers.get("X-Chat-Id");

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
      const errorMessage =
        error.message.length > 0
          ? error.message
          : "An error occurred, please try again later.";

      toast.error(errorMessage, {
        position: "top-center",
        richColors: true,
      });
    },
  });

  // Use effect to set mounted state
  useEffect(() => {
    setIsMounted(true);
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

    try {
      handleSubmit(e);
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

  const isLoading = status === "streaming" || status === "submitted";

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
        <Messages messages={messages} isLoading={isLoading} status={status} />
      )}
      <form
        onSubmit={handleFormSubmit}
        className={cn(
          "w-full max-w-xl mx-auto px-4 sm:px-0 pt-4",
          messages.length > 0 && "absolute bottom-0 inset-x-0 max-w-3xl pt-0"
        )}
      >
        <Textarea
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          handleInputChange={handleInputChange}
          input={input}
          isLoading={isLoading}
          status={status}
          stop={stop}
          messages={messages}
        />
      </form>
    </div>
  );
}
