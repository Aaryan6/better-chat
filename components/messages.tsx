import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect } from "react";
import { SpinnerIcon } from "./icons";
import { TextShimmer } from "./motion-primitives/text-shimmer";

import { UseChatHelpers } from "@ai-sdk/react";

export const Messages = ({
  messages,
  isLoading,
  status,
  setMessages,
  reload,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
}) => {
  const [containerRef, endRef, scrollToBottom] = useScrollToBottom();

  // Scroll to bottom when a new message is added (not during streaming)
  useEffect(() => {
    if (status === "submitted" || status === "ready") {
      scrollToBottom();
    }
  }, [messages.length, status, scrollToBottom]);

  return (
    <ScrollArea
      className="chat-scroll-area flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative w-full"
      viewportRef={containerRef}
      data-streaming={status === "streaming" ? "true" : "false"}
    >
      <div className="max-w-3xl mx-auto pt-8">
        {messages.map((m, i) => (
          <Message
            key={i}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
            setMessages={setMessages}
            reload={reload}
          />
        ))}
        {status === "submitted" && (
          <div className="flex flex-col gap-2 pl-2">
            <div className="flex flex-row gap-2 items-center">
              <TextShimmer duration={0.8}>Thinking...</TextShimmer>
            </div>
          </div>
        )}
        <div className="h-32" ref={endRef} />
      </div>
    </ScrollArea>
  );
};
