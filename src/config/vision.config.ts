/**
 * VISION CONFIGURATION
 *
 * Configure vision models for different intents:
 * - Planning: Complex multi-step reasoning
 * - Insight: Data extraction and page understanding
 * - Action: Element localization and UI interaction
 */

import { CORTEX_URL } from "./api";

export const visionConfig = {
  // Current setup: Gemini-only (extensible for future providers)
  models: {
    planning: {
      provider: "gemini" as const,
      model: "gemini-2.0-flash-thinking-exp",
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      description: "Complex reasoning and multi-step planning",
    },

    insight: {
      provider: "gemini" as const,
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      description: "Data extraction and page understanding",
    },

    action: {
      provider: "ui-tars" as const,
      model: "ui-tars",
      baseUrl: CORTEX_URL,
      fallback: {
        provider: "gemini" as const,
        model: "gemini-2.0-flash-exp",
        apiKey: process.env.GEMINI_API_KEY,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      },
      description: "Element localization and UI interaction",
    },
  },

  // Future: Add OpenAI support
  // Uncomment when ready to use:
  /*
  models: {
    planning: {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1'
    },
    insight: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      apiKey: process.env.GEMINI_API_KEY
    },
    action: {
      provider: 'ui-tars',
      model: 'ui-tars',
      baseUrl: CORTEX_URL,
      fallback: {
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        apiKey: process.env.GEMINI_API_KEY
      }
    }
  }
  */

  // Future: Add Claude support
  // Uncomment when ready to use:
  /*
  models: {
    planning: {
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com/v1'
    },
    insight: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      apiKey: process.env.GEMINI_API_KEY
    },
    action: {
      provider: 'ui-tars',
      model: 'ui-tars',
      baseUrl: CORTEX_URL,
      fallback: {
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        apiKey: process.env.GEMINI_API_KEY
      }
    }
  }
  */
};

// Example: Mixed provider setup (when you have multiple API keys)
/*
export const visionConfigMixed = {
  models: {
    planning: {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1'
    },
    insight: {
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com/v1'
    },
    action: {
      provider: 'ui-tars',
      model: 'ui-tars',
      baseUrl: CORTEX_URL,
      fallback: {
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        apiKey: process.env.GEMINI_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
      }
    }
  }
};
*/
