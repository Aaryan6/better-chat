import { modelID } from "@/ai/providers";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp, Paperclip, X, FileText, File } from "lucide-react";
import { ModelPicker } from "./model-picker";
import { Button } from "./ui/button";
import { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import Image from "next/image";
import TextPreview from "./text-preview";
import { motion } from "framer-motion";

interface InputProps {
  input: string;
  handleInputChange: (
    event:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLInputElement>
  ) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
  messages: UIMessage[];
  files: File[];
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onPaste: (event: React.ClipboardEvent) => void;
}

export const Textarea = ({
  input,
  handleInputChange,
  isLoading,
  status,
  stop,
  selectedModel,
  setSelectedModel,
  messages,
  files,
  onFileChange,
  onRemoveFile,
  onPaste,
}: InputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "relative w-full order-1 bg-muted/50 border-2 border-border backdrop-blur-sm rounded-2xl",
        messages.length > 0 && "order-2 rounded-b-none"
      )}
    >
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}`} className="relative">
              {file.type.startsWith("image/") ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    fill
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    size="icon"
                    variant="secondary"
                    className="absolute top-0 right-0 w-6 h-6 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <motion.div
                  key={`${file.name}-${file.lastModified}`}
                  className="relative text-[8px] leading-1 w-28 h-16 overflow-hidden text-zinc-500 border p-2 rounded-lg bg-background dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{
                    y: -10,
                    scale: 1.1,
                    opacity: 0,
                    transition: { duration: 0.2 },
                  }}
                >
                  <TextPreview file={file} />
                  <Button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    size="icon"
                    variant="secondary"
                    className="absolute top-0 right-0 w-6 h-6 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      <ShadcnTextarea
        className={cn(
          "resize-none shadow-none bg-transparent border-none w-full rounded-2xl focus-visible:ring-0 focus-visible:border-border max-h-52 overflow-y-auto p-4",
          messages.length > 0 && "rounded-b-none"
        )}
        value={input}
        autoFocus
        placeholder={
          files.length > 0
            ? "Ask something about these files..."
            : "Say something..."
        }
        onChange={handleInputChange}
        onPaste={onPaste}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              // @ts-expect-error err
              const form = e.target.closest("form");
              if (form) form.requestSubmit();
            }
          }
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,text/*,.txt,.md,.csv,.pdf"
        onChange={onFileChange}
        className="hidden"
      />

      <div
        className={cn(
          "flex w-full justify-between items-center gap-2 p-2",
          messages.length > 0 ? "bottom-3 right-3" : "bottom-2 right-2"
        )}
      >
        <div className="flex flex-row items-center gap-2">
          <Button
            type="button"
            onClick={triggerFileSelect}
            disabled={isLoading}
            size="icon"
            variant="ghost"
            className="rounded-full p-2"
          >
            <Paperclip className={cn("h-4 w-4")} />
          </Button>
          <ModelPicker
            setSelectedModel={setSelectedModel}
            selectedModel={selectedModel}
          />
        </div>
        {status === "streaming" || status === "submitted" ? (
          <Button
            type="button"
            onClick={stop}
            size={"icon"}
            className="cursor-pointer rounded-full p-2 bg-black hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
          >
            <div className="animate-spin h-4 w-4">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size={"icon"}
            className="rounded-full p-2 bg-black hover:bg-zinc-800 disabled:bg-zinc-300 disabled:dark:bg-zinc-700 dark:disabled:opacity-80 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUp className="h-4 w-4 text-white" />
          </Button>
        )}
      </div>
    </div>
  );
};
