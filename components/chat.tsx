"use client";

import { defaultModel, modelID } from "@/ai/providers";
import { useChat } from "@ai-sdk/react";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useState } from "react";
import { toast } from "sonner";
import { Messages } from "./messages";
import { ProjectOverview } from "./project-overview";
import { Textarea } from "./textarea";

import { useRouter } from 'next/navigation';

export default function Chat({ chatId, initialMessages }: { chatId?: string, initialMessages?: any[] }) {
  const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
  const router = useRouter();

  const { messages, input, handleInputChange, handleSubmit, status, stop, experimental_resume, data, setMessages } =
    useChat({
      id: chatId,
      initialMessages,
      maxSteps: 5,
      body: {
        selectedModel,
      },
      onResponse: (response) => {
        // Check for new chat creation via X-Chat-Id header
        const chatIdHeader = response.headers.get('X-Chat-Id');
        if (chatIdHeader && chatIdHeader !== chatId) {
          router.push(`/chat/${chatIdHeader}`);
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

  useAutoResume({
    autoResume: true,
    initialMessages: messages,
    experimental_resume,
    data,
    setMessages,
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="h-dvh flex flex-col justify-center w-full stretch">
      {messages.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <ProjectOverview />
        </div>
      ) : (
        <Messages messages={messages} isLoading={isLoading} status={status} />
      )}
      <form
        onSubmit={handleSubmit}
        className="pb-8 w-full max-w-xl mx-auto px-4 sm:px-0"
      >
        <Textarea
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          handleInputChange={handleInputChange}
          input={input}
          isLoading={isLoading}
          status={status}
          stop={stop}
        />
      </form>
    </div>
  );
}
