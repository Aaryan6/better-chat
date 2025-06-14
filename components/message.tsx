"use client";

import { Attachment, type Message as TMessage } from "ai";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { memo, useCallback, useEffect, useState, useRef } from "react";

import { deleteTrailingMessages } from "@/db/queries";
import { cn } from "@/lib/utils";
import { UseChatHelpers } from "@ai-sdk/react";
import {
  CheckCircle,
  ChevronDownIcon,
  ChevronUpIcon,
  FileIcon,
  FileTextIcon,
  Loader2,
  PencilIcon,
  RefreshCcwIcon,
  StopCircle,
  CopyIcon,
} from "lucide-react";
import { SpinnerIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageEditor } from "./message-editor";
import { Button } from "./ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";

interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
  details: Array<{ type: "text"; text: string }>;
}

interface ReasoningMessagePartProps {
  part: ReasoningPart;
  isReasoning: boolean;
}

export function ReasoningMessagePart({
  part,
  isReasoning,
}: ReasoningMessagePartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: "auto",
      opacity: 1,
      marginTop: "1rem",
      marginBottom: 0,
    },
  };

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isReasoning);
  }, [isReasoning, memoizedSetIsExpanded]);

  return (
    <div className="flex flex-col">
      {isReasoning ? (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium text-sm">Reasoning</div>
          <div className="animate-spin">
            <SpinnerIcon />
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium text-sm">Reasoned for a few seconds</div>
          <button
            className={cn(
              "cursor-pointer rounded-full dark:hover:bg-zinc-800 hover:bg-zinc-200",
              {
                "dark:bg-zinc-800 bg-zinc-200": isExpanded,
              }
            )}
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            {!isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="reasoning"
            className="text-sm dark:text-zinc-400 text-zinc-600 flex flex-col gap-4 border-l pl-3 dark:border-zinc-800"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {part.details.map((detail, detailIndex) =>
              detail.type === "text" ? (
                <Markdown key={detailIndex}>{detail.text}</Markdown>
              ) : (
                "<redacted>"
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
  setMessages,
  reload,
}: {
  message: TMessage & { attachments?: Attachment[] };
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleRetry = async () => {
    try {
      await deleteTrailingMessages({
        id: message.id,
      });

      // Get the original message content
      const originalContent =
        typeof message.content === "string"
          ? message.content
          : message.parts?.[0]?.type === "text"
          ? message.parts[0].text
          : "";

      // Update messages state same as MessageEditor but keep original content
      setMessages((messages: any) => {
        const index = messages.findIndex((m: any) => m.id === message.id);

        if (index !== -1) {
          const updatedMessage = {
            ...message,
            content: originalContent,
            parts: [{ type: "text" as const, text: originalContent }],
          };

          return [...messages.slice(0, index), updatedMessage];
        }

        return messages;
      });

      reload();
    } catch (error) {
      console.error("Failed to retry message:", error);
    }
  };

  const handleCopy = async () => {
    const textContent =
      typeof message.content === "string"
        ? message.content
        : message.parts?.find((part) => part.type === "text")?.text || "";

    try {
      await navigator.clipboard.writeText(textContent);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const handleLongPressStart = () => {
    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      // Long press completed - context menu will show
    }, 2000);
  };

  const handleLongPressEnd = () => {
    setIsLongPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const attachments =
    message.experimental_attachments ?? message.attachments ?? [];

  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto max-w-2xl",
            "group-data-[role=user]/message:w-fit relative"
          )}
        >
          <div className="flex flex-col w-full space-y-4">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <ContextMenu key={`message-${message.id}-part-${i}`}>
                      <ContextMenuTrigger asChild>
                        <motion.div
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className={cn(
                            "flex flex-col gap-2 items-start w-full pb-4 transition-all duration-200",
                            message.role === "user" && "items-end",
                            isLongPressing && "scale-[0.98] opacity-80"
                          )}
                          onTouchStart={handleLongPressStart}
                          onTouchEnd={handleLongPressEnd}
                          onTouchCancel={handleLongPressEnd}
                          onMouseDown={handleLongPressStart}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                        >
                          {attachments?.map(
                            (attachment: any, index: number) => (
                              <div key={index}>
                                <div className="flex flex-row gap-2 items-start w-full">
                                  <div className="flex flex-col gap-2 relative">
                                    {attachment.contentType?.startsWith(
                                      "image/"
                                    ) ? (
                                      <Image
                                        key={index}
                                        src={attachment.url}
                                        alt="User uploaded image"
                                        width={100}
                                        height={100}
                                        className="rounded-md"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-3 p-3 bg-background border rounded-lg max-w-sm">
                                        {attachment.contentType ===
                                        "application/pdf" ? (
                                          <FileIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                                        ) : (
                                          <FileTextIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium truncate">
                                            {attachment.name || "Uploaded file"}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {attachment.contentType ===
                                            "application/pdf"
                                              ? "PDF Document"
                                              : "Text File"}
                                          </div>
                                        </div>
                                        <a
                                          href={attachment.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline flex-shrink-0"
                                        >
                                          View
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                          <div
                            className={cn("flex flex-col gap-4 relative", {
                              "bg-secondary text-secondary-foreground px-3 py-2 rounded-tl-xl rounded-tr-xl rounded-bl-xl select-none sm:select-text":
                                message.role === "user",
                            })}
                          >
                            {mode === "edit" && message.role === "user" ? (
                              <MessageEditor
                                message={message}
                                setMode={setMode}
                                setMessages={setMessages}
                                reload={reload}
                              />
                            ) : (
                              <>
                                <Markdown>{part.text}</Markdown>
                              </>
                            )}
                          </div>
                          <div className="flex-row gap-1 px-2 opacity-0 group-hover/message:opacity-100 transition-opacity hidden sm:flex">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCopy}
                              className="w-6 h-6"
                              title="Copy message"
                            >
                              <CopyIcon className="h-3 w-3" />
                            </Button>
                            {message.role === "user" && !isLatestMessage && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleRetry}
                                  className="w-6 h-6"
                                  title="Retry response"
                                >
                                  <RefreshCcwIcon className="h-3 w-3" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-6 h-6"
                                  onClick={() => setMode("edit")}
                                  title="Edit message"
                                >
                                  <PencilIcon className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuItem onClick={handleCopy}>
                          <CopyIcon className="mr-2 h-4 w-4" />
                          Copy message
                        </ContextMenuItem>
                        {message.role === "user" && !isLatestMessage && (
                          <>
                            <ContextMenuItem onClick={() => setMode("edit")}>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Edit message
                            </ContextMenuItem>
                            <ContextMenuItem onClick={handleRetry}>
                              <RefreshCcwIcon className="mr-2 h-4 w-4" />
                              Resend message
                            </ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                case "tool-invocation":
                  const { toolName, state } = part.toolInvocation;
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-col gap-2 p-2 mb-3 text-sm bg-muted rounded-md border border-border"
                    >
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex-1">
                          <div className="font-medium flex items-baseline gap-2">
                            {state === "result"
                              ? "Used: " + toolName
                              : "Calling " + toolName}
                          </div>
                        </div>
                        <div className="w-5 h-5 flex items-center justify-center">
                          {state === "call" ? (
                            isLatestMessage && status !== "ready" ? (
                              <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
                            ) : (
                              <StopCircle className="h-4 w-4 text-red-500" />
                            )
                          ) : state === "result" ? (
                            <CheckCircle size={14} className="text-green-600" />
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  );
                case "reasoning":
                  return (
                    <ReasoningMessagePart
                      key={`message-${message.id}-${i}`}
                      // @ts-expect-error part
                      part={part}
                      isReasoning={
                        (message.parts &&
                          status === "streaming" &&
                          i === message.parts.length - 1) ??
                        false
                      }
                    />
                  );
                default:
                  return null;
              }
            })}
            {/* web search results */}
            {status !== "streaming" &&
              message.parts
                ?.filter((p) => p.type === "tool-invocation")
                ?.map((part, i) => {
                  const { state } = part.toolInvocation;
                  if (state === "result") {
                    const { result } = part.toolInvocation;
                    return (
                      <div className="pb-4" key={i}>
                        <ul className="flex flex-col gap-2">
                          <h3 className="text-sm font-medium text-foreground/80">
                            Sources
                          </h3>
                          {result?.map((item: any, index: number) => (
                            <li
                              key={index}
                              className="bg-muted w-fit p-2 py-0.5 text-sm rounded-md text-muted-foreground hover:text-foreground"
                            >
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {item.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.message.annotations !== nextProps.message.annotations)
    return false;
  if (prevProps.setMessages !== nextProps.setMessages) return false;
  if (prevProps.reload !== nextProps.reload) return false;
  // if (prevProps.message.content !== nextProps.message.content) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

  return true;
});
