"use client";

import { Message } from "ai";
import { Button } from "./ui/button";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Textarea } from "./ui/textarea";
import { deleteTrailingMessages } from "@/db/queries";
import { UseChatHelpers } from "@ai-sdk/react";

export type MessageEditorProps = {
  message: Message;
  setMode: Dispatch<SetStateAction<"view" | "edit">>;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>(
    typeof message.content === "string"
      ? message.content
      : message.parts?.[0]?.type === "text"
      ? message.parts[0].text
      : ""
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${
        textareaRef.current.scrollHeight + 2
      }px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  const handleSubmit = async () => {
    if (!draftContent.trim()) return;

    setIsSubmitting(true);

    try {
      await deleteTrailingMessages({
        id: message.id,
      });

      setMessages((messages: any) => {
        const index = messages.findIndex((m: any) => m.id === message.id);

        if (index !== -1) {
          const updatedMessage = {
            ...message,
            content: draftContent,
            parts: [{ type: "text" as const, text: draftContent }],
          };

          return [...messages.slice(0, index), updatedMessage];
        }

        return messages;
      });

      setMode("view");
      reload();
    } catch (error) {
      console.error("Failed to update message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        ref={textareaRef}
        className="bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full min-h-[60px]"
        value={draftContent}
        onChange={handleInput}
        placeholder="Edit your message..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === "Escape") {
            setMode("view");
          }
        }}
      />

      <div className="flex flex-row gap-2 justify-end">
        <Button
          variant="outline"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode("view");
          }}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          className="h-fit py-2 px-3"
          disabled={isSubmitting || !draftContent.trim()}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
