import type { AssistantProvider } from "./types";
import { DeterministicAssistantProvider } from "./deterministicProvider";
import { GeminiAssistantProvider } from "./geminiProvider";

/**
 * CareSync AI Assistant Provider Factory.
 * Resolves the active provider based on environment variables:
 * - AI_PROVIDER=gemini (uses GeminiAssistantProvider if GEMINI_API_KEY is present)
 * - AI_PROVIDER=deterministic (default: uses DeterministicAssistantProvider)
 */
export class AssistantProviderFactory {
  static getProvider(): AssistantProvider {
    const providerSetting = (process.env.AI_PROVIDER || "deterministic").trim().toLowerCase();
    const hasGeminiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;

    if (providerSetting === "gemini") {
      if (hasGeminiKey) {
        return new GeminiAssistantProvider();
      }
      // If configured for gemini but key is missing, return Gemini provider which gracefully handles fallback
      return new GeminiAssistantProvider();
    }

    return new DeterministicAssistantProvider();
  }
}
