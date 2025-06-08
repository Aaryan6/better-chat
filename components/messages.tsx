import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { ScrollArea } from "./ui/scroll-area";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  return (
    <ScrollArea
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative w-full"
      viewportRef={containerRef}
    >
      <div className="max-w-3xl mx-auto pt-8">
        {messages.map((m, i) => (
          <Message
            key={i}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
          />
        ))}
        <div className="h-32" ref={endRef} />
      </div>
    </ScrollArea>
  );
};
