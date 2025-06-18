"use client";
import { modelID, MODELS } from "@/ai/providers";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { PlusIcon, TrashIcon } from "lucide-react";
import Image from "next/image";

const OLLAMA_MODELS_KEY = "better-chat-ollama-models";

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

  // For Ollama models, no logo for now
  if (modelId.startsWith("ollama:")) {
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
  if (modelId.startsWith("ollama:")) {
    return modelId.replace("ollama:", "");
  }
  return modelId;
};

// Helper functions for managing Ollama models in localStorage
const getSavedOllamaModels = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(OLLAMA_MODELS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveOllamaModel = (modelName: string) => {
  if (typeof window === "undefined") return;
  try {
    const existing = getSavedOllamaModels();
    const ollamaModelId = `ollama:${modelName}`;
    if (!existing.includes(ollamaModelId)) {
      const updated = [...existing, ollamaModelId];
      localStorage.setItem(OLLAMA_MODELS_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.warn("Failed to save Ollama model:", error);
  }
};

const removeOllamaModel = (modelId: string) => {
  if (typeof window === "undefined") return;
  try {
    const existing = getSavedOllamaModels();
    const updated = existing.filter((id) => id !== modelId);
    localStorage.setItem(OLLAMA_MODELS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Failed to remove Ollama model:", error);
  }
};

interface ModelPickerProps {
  selectedModel: modelID | string;
  setSelectedModel: (model: modelID | string) => void;
}

export const ModelPicker = ({
  selectedModel,
  setSelectedModel,
}: ModelPickerProps) => {
  const [customOllamaModel, setCustomOllamaModel] = useState("");
  const [showOllamaInput, setShowOllamaInput] = useState(false);
  const [savedOllamaModels, setSavedOllamaModels] = useState<string[]>([]);
  const [showRemoveMode, setShowRemoveMode] = useState(false);

  // Load saved Ollama models on component mount
  useEffect(() => {
    setSavedOllamaModels(getSavedOllamaModels());
  }, []);

  const handleAddOllamaModel = () => {
    if (customOllamaModel.trim()) {
      const modelName = customOllamaModel.trim();
      const ollamaModelId = `ollama:${modelName}`;

      // Save to localStorage
      saveOllamaModel(modelName);

      // Update local state
      setSavedOllamaModels((prev) => {
        if (!prev.includes(ollamaModelId)) {
          return [...prev, ollamaModelId];
        }
        return prev;
      });

      // Select the new model
      setSelectedModel(ollamaModelId);
      setCustomOllamaModel("");
      setShowOllamaInput(false);
    }
  };

  const handleRemoveOllamaModel = (modelId: string) => {
    // Remove from localStorage
    removeOllamaModel(modelId);

    // Update local state
    setSavedOllamaModels((prev) => prev.filter((id) => id !== modelId));

    // If the removed model was selected, switch to default
    if (selectedModel === modelId) {
      setSelectedModel("gpt-4o-mini");
    }

    setShowRemoveMode(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddOllamaModel();
    }
  };

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
              <span className="truncate">
                {typeof selectedModel === "string" &&
                selectedModel.startsWith("ollama:")
                  ? `Ollama: ${selectedDisplayName}`
                  : selectedDisplayName}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Cloud Models</SelectLabel>
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
          <SelectGroup>
            <SelectLabel>Local Ollama Models</SelectLabel>
            {savedOllamaModels.map((modelId) => (
              <SelectItem key={modelId} value={modelId}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">O</span>
                  </div>
                  <span>
                    {typeof modelId === "string"
                      ? modelId.replace("ollama:", "")
                      : "Unknown"}
                  </span>
                </div>
              </SelectItem>
            ))}

            {/* Add Ollama Model Section */}
            {!showOllamaInput ? (
              <div
                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm"
                onClick={(e) => {
                  e.preventDefault();
                  setShowOllamaInput(true);
                }}
              >
                <PlusIcon className="w-4 h-4" />
                Add Ollama Model
              </div>
            ) : (
              <div className="p-2 space-y-2">
                <Input
                  placeholder="Enter model name (e.g., llama3.2)"
                  value={customOllamaModel}
                  onChange={(e) => setCustomOllamaModel(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-8"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddOllamaModel}
                    disabled={!customOllamaModel.trim()}
                    className="h-7 text-xs"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowOllamaInput(false);
                      setCustomOllamaModel("");
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Remove Models Section */}
            {savedOllamaModels.length > 0 && (
              <>
                {!showRemoveMode ? (
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowRemoveMode(true);
                    }}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Remove Models
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Click a model to remove it:
                    </p>
                    <div className="space-y-1">
                      {savedOllamaModels.map((modelId) => (
                        <Button
                          key={modelId}
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground justify-start"
                          onClick={() => handleRemoveOllamaModel(modelId)}
                        >
                          <TrashIcon className="w-3 h-3 mr-2" />
                          {typeof modelId === "string"
                            ? modelId.replace("ollama:", "")
                            : "Unknown"}
                        </Button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRemoveMode(false)}
                      className="w-full h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
