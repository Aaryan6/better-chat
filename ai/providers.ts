import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
    "X-Title": "Better Chat",
  },
});

import { createOllama } from "ollama-ai-provider";

const ollama = createOllama({
  // optional settings, e.g.
  baseURL: "http://localhost:11434/api",
});

const languageModels = {
  // Local Ollama model for offline usage
  "deepseek-r1:7b": wrapLanguageModel({
    model: ollama("deepseek-r1:7b"),
    middleware: extractReasoningMiddleware({
      tagName: "think",
    }),
  }),
  "gemma3:1b": ollama("gemma3:1b"),
  "gpt-4o-mini": openRouter("openai/gpt-4o-mini"),
  "gemini-2.5-pro-preview-05-06": openRouter(
    "google/gemini-2.5-pro-preview-05-06"
  ),
  "gemini-2.0-flash-001": wrapLanguageModel({
    model: openRouter("google/gemini-2.0-flash-001"),
    middleware: extractReasoningMiddleware({
      tagName: "think",
    }),
  }),
  "deepseek-chat-v3-0324": wrapLanguageModel({
    model: openRouter("deepseek/deepseek-chat-v3-0324:free"),
    middleware: extractReasoningMiddleware({
      tagName: "think",
    }),
  }),
  "gpt-4.1-mini": openRouter("openai/gpt-4.1-mini"),
  "grok-3-mini-beta": wrapLanguageModel({
    model: openRouter("x-ai/grok-3-mini-beta"),
    middleware: extractReasoningMiddleware({
      tagName: "think",
    }),
  }),
  "llama-4-scout": openRouter("meta-llama/llama-4-scout"),
  "gemini-2.5-pro-exp-03-25": openRouter("google/gemini-2.5-pro-exp-03-25"),
};

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const titleModel = "gpt-4o-mini";

export const MODELS = Object.keys(languageModels);

// Updated default model to use local Ollama for offline usage
export const defaultModel: modelID = "gpt-4o-mini";

// Helper function to check if a model is an Ollama model (works offline)
export function isOllamaModel(modelId: modelID): boolean {
  return modelId === "deepseek-r1:7b" || modelId === "gemma3:1b";
}
