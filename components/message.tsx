"use client";

import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useState } from "react";
import equal from "fast-deep-equal";
import Image from "next/image";

import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  PocketKnife,
  SparklesIcon,
  StopCircle,
  PencilIcon,
  RefreshCcwIcon,
  FileIcon,
  FileTextIcon,
} from "lucide-react";
import { SpinnerIcon } from "./icons";
import { Button } from "./ui/button";
import { MessageEditor } from "./message-editor";
import { UseChatHelpers } from "@ai-sdk/react";
import {
  deleteTrailingMessages,
  deleteResponsesAfterMessage,
} from "@/app/(chat)/actions";

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
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

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
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-col gap-2 items-end w-full pb-4"
                    >
                      {message.role === "user" &&
                        message.experimental_attachments &&
                        message.experimental_attachments.map(
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
                          "bg-secondary text-secondary-foreground px-3 py-2 rounded-tl-xl rounded-tr-xl rounded-bl-xl":
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
                      {message.role === "user" && !isLatestMessage && (
                        <div className="flex flex-row gap-1 px-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
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
                        </div>
                      )}
                    </motion.div>
                  );
                case "tool-invocation":
                  const { toolName, state } = part.toolInvocation;

                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex items-center justify-center w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full">
                          <PocketKnife className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium flex items-baseline gap-2">
                            {state === "call" ? "Calling" : "Called"}{" "}
                            <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                              {toolName}
                            </span>
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
