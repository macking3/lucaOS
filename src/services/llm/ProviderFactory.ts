import { LLMProvider } from "./LLMProvider";
import { GeminiAdapter } from "./GeminiAdapter";
import { AnthropicAdapter } from "./AnthropicAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { LucaSettings } from "../settingsService";
import { HARDCODED_API_KEY } from "../genAIClient";

export class ProviderFactory {
  static createProvider(settings: LucaSettings["brain"]): LLMProvider {
    const { model, geminiApiKey, anthropicApiKey, openaiApiKey, xaiApiKey } =
      settings;

    // Check if using demo/fallback key
    const isDemoMode =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("LUCA_USES_DEMO_KEY") === "true";

    if (model.startsWith("gemini")) {
      // If demo mode, force downgrade to gemini-2.0-flash
      // (fallback keys may not have access to Gemini 3 models)
      let effectiveModel = model;
      if (isDemoMode && !model.includes("2.0-flash")) {
        console.log(
          `[ProviderFactory] Demo mode detected - downgrading from ${model} to gemini-2.0-flash`
        );
        effectiveModel = "gemini-2.0-flash";
      }

      // Fallback to VITE_API_KEY handled in adapter or ignored?
      // Current adapter takes key. Settings service usually defaults empty key to env var if empty?
      // Actually SettingsService stores empty string. LucaService used to handle the fallback.
      // I should pass the effective key.
      // I should pass the effective key.
      // Pass key even if empty, allowing lazy load
      return new GeminiAdapter(geminiApiKey || "", effectiveModel);
    }

    if (model.startsWith("claude")) {
      return new AnthropicAdapter(anthropicApiKey || "", model);
    }

    if (model.startsWith("gpt") || model.startsWith("o1")) {
      return new OpenAIAdapter(openaiApiKey || "", model);
    }

    if (model.startsWith("grok")) {
      return new OpenAIAdapter(xaiApiKey || "", model, "https://api.x.ai/v1");
    }

    // Default to Gemini if unknown
    // In demo mode, always use gemini-2.0-flash
    const defaultModel = isDemoMode ? "gemini-2.0-flash" : "gemini-2.0-flash";
    return new GeminiAdapter(geminiApiKey || "", defaultModel);
  }
}
