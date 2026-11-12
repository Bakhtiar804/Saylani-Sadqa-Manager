import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

const DEFAULT_GOOGLE_MODEL = "gemma-4-26b-a4b-it";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

function configuredProvider() {
  const requested = (process.env.LLM_PROVIDER || "openrouter").trim().toLowerCase();
  if (requested === "openrouter" && process.env.OPENROUTER_API_KEY) return "openrouter";
  if ((requested === "google" || requested === "gemini" || requested === "gemma") && (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)) return "google";
  if (requested === "groq" && process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  return requested;
}

export function getChatModel(): LanguageModel {
  const provider = configuredProvider();

  if (provider === "openrouter") {
    const openrouter = createOpenAICompatible({
      name: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      includeUsage: true,
      headers: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Saylani Insight Studio",
      },
    });
    return openrouter(process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL);
  }

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
  const provider = configuredProvider();
  return provider === "openrouter"
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : provider === "groq"
      ? Boolean(process.env.GROQ_API_KEY)
      : (provider === "google" || provider === "gemini" || provider === "gemma")
        ? Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
        : false;
}
