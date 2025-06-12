import { modelID } from "@/ai/providers";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp, Paperclip, X, FileText, File } from "lucide-react";
import { ModelPicker } from "./model-picker";
import { Button } from "./ui/button";
import { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { useState, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";

interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size?: number;
}

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
  messages: UIMessage[];
  onFileUpload?: (files: UploadedFile[]) => void;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (index: number) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
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
  onFileUpload,
  uploadedFiles = [],
  onRemoveFile,
  onUploadStateChange,
}: InputProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload: startImageUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any) => {
      if (res && res[0] && onFileUpload) {
        const newFile: UploadedFile = {
          url: res[0].url,
          name: res[0].name || `image-${Date.now()}.png`,
          type: "image",
        };
        onFileUpload([...uploadedFiles, newFile]);
        toast.success("Image uploaded successfully!");
      }
      setIsUploading(false);
      onUploadStateChange?.(false);
    },
    onUploadError: (error: any) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
      setIsUploading(false);
      onUploadStateChange?.(false);
    },
  });

  const { startUpload: startDocumentUpload } = useUploadThing(
    "documentUploader",
    {
      onClientUploadComplete: (res: any) => {
        if (res && res[0] && onFileUpload) {
          const newFile: UploadedFile = {
            url: res[0].url,
            name: res[0].name || `document-${Date.now()}`,
            type: res[0].name?.endsWith(".pdf") ? "pdf" : "text",
            size: res[0].size,
          };
          onFileUpload([...uploadedFiles, newFile]);
          toast.success("Document uploaded successfully!");
        }
        setIsUploading(false);
        onUploadStateChange?.(false);
      },
      onUploadError: (error: any) => {
        console.error("Upload error:", error);
        toast.error("Failed to upload document");
        setIsUploading(false);
        onUploadStateChange?.(false);
      },
    }
  );

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    onUploadStateChange?.(true);

    try {
      if (file.type.startsWith("image/")) {
        await startImageUpload([file]);
      } else if (
        file.type === "application/pdf" ||
        file.type.startsWith("text/")
      ) {
        await startDocumentUpload([file]);
      } else {
        // Check file extension as fallback
        const fileName = file.name.toLowerCase();
        if (
          fileName.endsWith(".txt") ||
          fileName.endsWith(".md") ||
          fileName.endsWith(".csv")
        ) {
          await startDocumentUpload([file]);
        } else {
          toast.error("Please select an image, text, or PDF file");
          setIsUploading(false);
          onUploadStateChange?.(false);
        }
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to upload file");
      setIsUploading(false);
      onUploadStateChange?.(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <File className="w-6 h-6 text-red-500" />;
      case "text":
        return <FileText className="w-6 h-6 text-blue-500" />;
      default:
        return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(1)}MB`;
    return `${kb.toFixed(1)}KB`;
  };

  return (
    <div
      className={cn(
        "relative w-full order-1 bg-muted/50 backdrop-blur-sm border-2 border-border backdrop-blur-sm rounded-2xl",
        messages.length > 0 && "order-2 rounded-b-none"
      )}
    >
      {uploadedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="relative">
              {file.type === "image" ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <Image
                    src={file.url}
                    alt={file.name}
                    fill
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    onClick={() => onRemoveFile?.(index)}
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-background border rounded-lg max-w-xs">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {file.name}
                    </div>
                    {file.size && (
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => onRemoveFile?.(index)}
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
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
          uploadedFiles.length > 0
            ? "Ask something about these files..."
            : "Say something..."
        }
        // @ts-expect-error err
        onChange={handleInputChange}
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
        accept="image/*,text/*,.txt,.md,.csv,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        className={cn(
          "absolute flex items-center gap-2",
          messages.length > 0 ? "bottom-3 right-3" : "bottom-2 right-2"
        )}
      >
        <Button
          type="button"
          onClick={triggerFileSelect}
          disabled={isUploading || isLoading}
          size="icon"
          variant="ghost"
          className="rounded-full p-2"
        >
          <Paperclip className={cn("h-4 w-4", isUploading && "animate-spin")} />
        </Button>
        <ModelPicker
          setSelectedModel={setSelectedModel}
          selectedModel={selectedModel}
        />

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
            disabled={isLoading || !input.trim() || isUploading}
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
