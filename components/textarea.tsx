import { modelID } from "@/ai/providers";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { ModelPicker } from "./model-picker";
import { Button } from "./ui/button";
import { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { useState, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
  messages: UIMessage[];
  onImageUpload?: (imageUrl: string) => void;
  uploadedImage?: string | null;
  onRemoveImage?: () => void;
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
  onImageUpload,
  uploadedImage,
  onRemoveImage,
  onUploadStateChange,
}: InputProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any) => {
      if (res && res[0] && onImageUpload) {
        onImageUpload(res[0].url);
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

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setIsUploading(true);
    onUploadStateChange?.(true);
    await startUpload([file]);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "relative w-full order-1 bg-muted/50 backdrop-blur-sm border-2 border-border backdrop-blur-sm rounded-2xl",
        messages.length > 0 && "order-2 rounded-b-none"
      )}
    >
      {uploadedImage && (
        <div className="mb-2 relative inline-block">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <Image
              src={uploadedImage}
              alt="Uploaded image"
              fill
              className="object-cover"
            />
            <Button
              type="button"
              onClick={onRemoveImage}
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
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
          uploadedImage
            ? "Ask something about this image..."
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
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-row items-center gap-2 p-2">
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
            className="absolute right-2 bottom-2 rounded-full p-2 bg-black hover:bg-zinc-800 disabled:bg-zinc-300 disabled:dark:bg-zinc-700 dark:disabled:opacity-80 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUp className="h-4 w-4 text-white" />
          </Button>
        )}
      </div>
    </div>
  );
};
