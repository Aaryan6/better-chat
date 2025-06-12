"use client";
import { modelID, MODELS } from "@/ai/providers";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface ModelPickerProps {
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
}

export const ModelPicker = ({
  selectedModel,
  setSelectedModel,
}: ModelPickerProps) => {
  return (
    <div className="flex flex-col gap-2">
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger
          iconDirection="up"
          className="h-8 hover:bg-accent hover:text-accent-foreground"
        >
          <SelectValue placeholder="Select a model" className="" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {MODELS.map((modelId) => (
              <SelectItem key={modelId} value={modelId}>
                {modelId}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
