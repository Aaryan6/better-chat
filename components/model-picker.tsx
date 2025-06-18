"use client";
import { modelID, MODELS } from "@/ai/providers";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import Image from "next/image";

// Model logo mapping
const MODEL_LOGOS: Record<string, string> = {
  "gpt-4o-mini": "/logos/openai.jpeg",
  "gpt-4.1-mini": "/logos/openai.jpeg",
  "gemini-2.5-pro-preview-05-06": "/logos/gemini.jpeg",
  "gemini-2.0-flash-001": "/logos/gemini.jpeg",
  "gemini-2.5-pro-exp-03-25": "/logos/gemini.jpeg",
  "deepseek-chat-v3-0324": "/logos/deepseek.jpeg",
  "llama-4-scout": "/logos/meta.png",
  "grok-3-mini-beta": "/logos/grok.svg",
  claude: "/logos/claude.jpeg",
};

// Function to get logo for a model
const getModelLogo = (modelId: string | undefined | null): string | null => {
  if (!modelId || typeof modelId !== "string") {
    return null;
  }

  // Check for exact match first
  if (MODEL_LOGOS[modelId]) {
    return MODEL_LOGOS[modelId];
  }

  // Check for partial matches
  for (const [key, logo] of Object.entries(MODEL_LOGOS)) {
    if (modelId.includes(key) || key.includes(modelId)) {
      return logo;
    }
  }

  // Check for provider matches
  if (modelId.includes("gpt") || modelId.includes("openai")) {
    return MODEL_LOGOS["gpt-4o-mini"];
  }
  if (modelId.includes("gemini") || modelId.includes("google")) {
    return MODEL_LOGOS["gemini-2.0-flash-001"];
  }
  if (modelId.includes("deepseek")) {
    return MODEL_LOGOS["deepseek-chat-v3-0324"];
  }
  if (modelId.includes("llama") || modelId.includes("meta")) {
    return MODEL_LOGOS["llama-4-scout"];
  }
  if (modelId.includes("claude")) {
    return MODEL_LOGOS["claude"];
  }

  return null;
};

// Function to get display name for a model
const getModelDisplayName = (modelId: string | undefined | null): string => {
  if (!modelId || typeof modelId !== "string") {
    return "Unknown Model";
  }
  return modelId;
};

interface ModelPickerProps {
  selectedModel: modelID | string;
  setSelectedModel: (model: modelID | string) => void;
}

export const ModelPicker = ({
  selectedModel,
  setSelectedModel,
}: ModelPickerProps) => {
  const selectedLogo = getModelLogo(selectedModel);
  const selectedDisplayName = getModelDisplayName(selectedModel);

  return (
    <div className="flex flex-col gap-2">
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger
          iconDirection="up"
          className="h-8 hover:bg-accent hover:text-accent-foreground"
        >
          <SelectValue placeholder="Select a model" className="">
            <div className="flex items-center gap-2">
              {selectedLogo && (
                <Image
                  src={selectedLogo}
                  alt={`${selectedDisplayName} logo`}
                  width={16}
                  height={16}
                  className="rounded-sm object-cover"
                />
              )}
              <span className="truncate">{selectedDisplayName}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {MODELS.map((modelId) => {
              const logo = getModelLogo(modelId);
              return (
                <SelectItem key={modelId} value={modelId}>
                  <div className="flex items-center gap-2">
                    {logo && (
                      <Image
                        src={logo}
                        alt={`${modelId} logo`}
                        width={18}
                        height={18}
                        className="rounded-sm object-cover bg-white"
                      />
                    )}
                    <span>{modelId}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
