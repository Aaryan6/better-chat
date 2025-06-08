"use client";

import { defaultModel, modelID } from "@/ai/providers";
import { useChat } from "@ai-sdk/react";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Messages } from "./messages";
import { ProjectOverview } from "./project-overview";
import { Textarea } from "./textarea";

import { useRouter } from 'next/navigation';
import { Header } from "./header";
import { cn } from "@/lib/utils";

export default function Chat({ chatId, initialMessages }: { chatId?: string, initialMessages?: any[] }) {
  const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
  const router = useRouter();

  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, status, stop, experimental_resume, data, setMessages } =
    useChat({
      id: chatId,
      initialMessages,
      maxSteps: 5,
      body: {
        selectedModel,
      },
      sendExtraMessageFields: true,
      onResponse: (response) => {
        // Check for new chat creation via X-Chat-Id header
        const chatIdHeader = response.headers.get('X-Chat-Id');
        if (chatIdHeader && chatIdHeader !== chatId) {
          setPendingRedirect(chatIdHeader);
        }
      },
      onError: (error) => {
        toast.error(
          error.message.length > 0
            ? error.message
            : "An error occured, please try again later.",
          { position: "top-center", richColors: true },
        );
      },
    });

  // Redirect only after assistant response is present
  useEffect(() => {
    if (pendingRedirect && messages.some(m => m.role === 'assistant')) {
      router.replace(`/chat/${pendingRedirect}`);
      setPendingRedirect(null);
    }
  }, [pendingRedirect, messages, router]);

  useAutoResume({
    autoResume: true,
    initialMessages: messages,
    experimental_resume,
    data,
    setMessages,
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className={cn("flex flex-col min-w-0 h-dvh bg-background pt-8", messages.length === 0 && "justify-center")}>
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
        className={cn("w-full max-w-xl mx-auto px-4 sm:px-0 pt-4", messages.length > 0 && "absolute bottom-0 inset-x-0 max-w-3xl pt-0")}
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
