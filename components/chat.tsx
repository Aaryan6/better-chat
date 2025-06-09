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

export default function Chat({
  chatId,
  initialMessages,
}: {
  chatId?: string;
  initialMessages?: any[];
}) {
  const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);

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
      chatId
    },
    sendExtraMessageFields: true,
    onResponse: (response) => {
      const headers = response.headers;
      const chatId = headers.get('X-Chat-Id');

      if (messages.length > 0 && response.ok && chatId) {
        window.history.replaceState({}, '', `/chat/${chatId}`);
      }
    },
    onError: (error) => {
      toast.error(
        error.message.length > 0
          ? error.message
          : "An error occured, please try again later.",
        { position: "top-center", richColors: true }
      );
    },
  });

  // Redirect only after assistant response is present
  // useEffect(() => {
  //   window.history.replaceState({}, '', `/chat/${chatId}`);
  // }, [chatId, messages.length]);

  useAutoResume({
    autoResume: true,
    initialMessages: messages,
    experimental_resume,
    data,
    setMessages,
  });

  const isLoading = status === "streaming" || status === "submitted";

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
        onSubmit={handleSubmit}
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
