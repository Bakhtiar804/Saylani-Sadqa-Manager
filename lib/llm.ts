import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

const DEFAULT_GOOGLE_MODEL = "gemma-4-26b-a4b-it";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export function getChatModel(): LanguageModel {
  const provider = (process.env.LLM_PROVIDER || "google").trim().toLowerCase();

  if (provider === "groq") {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured.");
    return groq(process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL);
  }

  if (provider === "google" || provider === "gemini" || provider === "gemma") {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    return googleProvider(process.env.GOOGLE_MODEL || process.env.GEMINI_MODEL || DEFAULT_GOOGLE_MODEL);
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

export function isChatModelConfigured() {
  const provider = (process.env.LLM_PROVIDER || "google").trim().toLowerCase();
  return provider === "groq"
    ? Boolean(process.env.GROQ_API_KEY)
    : (provider === "google" || provider === "gemini" || provider === "gemma")
      ? Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      : false;
}
