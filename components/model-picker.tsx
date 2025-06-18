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

const OLLAMA_MODELS_KEY = "better-chat-ollama-models";

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

  return (
    <div className="flex flex-col gap-2">
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger
          iconDirection="up"
          className="h-8 hover:bg-accent hover:text-accent-foreground"
        >
          <SelectValue placeholder="Select a model" className="">
            {selectedModel.startsWith("ollama:")
              ? `Ollama: ${selectedModel.replace("ollama:", "")}`
              : selectedModel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Cloud Models</SelectLabel>
            {MODELS.map((modelId) => (
              <SelectItem key={modelId} value={modelId}>
                {modelId}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Local Ollama Models</SelectLabel>
            {savedOllamaModels.map((modelId) => (
              <SelectItem key={modelId} value={modelId}>
                {modelId.replace("ollama:", "")}
              </SelectItem>
            ))}
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
            {savedOllamaModels.length > 0 && (
              <div
                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  setShowRemoveMode(!showRemoveMode);
                }}
              >
                <TrashIcon className="w-4 h-4" />
                {showRemoveMode ? "Cancel Remove" : "Remove Models"}
              </div>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>

      {showOllamaInput && (
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Enter Ollama model name (e.g., llama3.2)"
            value={customOllamaModel}
            onChange={(e) => setCustomOllamaModel(e.target.value)}
            onKeyPress={handleKeyPress}
            className="h-8"
          />
          <Button
            size="sm"
            onClick={handleAddOllamaModel}
            disabled={!customOllamaModel.trim()}
            className="h-8"
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
            className="h-8"
          >
            Cancel
          </Button>
        </div>
      )}

      {showRemoveMode && savedOllamaModels.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Click a model to remove it:
          </p>
          <div className="flex flex-wrap gap-2">
            {savedOllamaModels.map((modelId) => (
              <Button
                key={modelId}
                size="sm"
                variant="outline"
                className="h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveOllamaModel(modelId)}
              >
                <TrashIcon className="w-3 h-3 mr-1" />
                {modelId.replace("ollama:", "")}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
