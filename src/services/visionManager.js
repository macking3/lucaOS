/**
 * VISION MANAGER - Intent-based routing for vision models
 *
 * Inspired by Midscene.js architecture:
 * - Planning Intent: Complex multi-step reasoning (GPT-5, Claude, Gemini Thinking)
 * - Insight Intent: Data extraction, page understanding (Qwen3-VL, Gemini Flash)
 * - Action Intent: Element localization, UI interaction (UI-TARS, Gemini Flash)
 */

import { CORTEX_URL } from "../config/api.js";

export class VisionManager {
  constructor(config) {
    this.config = config || this.getDefaultConfig();
  }

  /**
   * Default configuration (Gemini-only for now, extensible for future)
   */
  getDefaultConfig() {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Validate environment
    this.validateEnvironment(geminiApiKey);

    return {
      planning: {
        provider: "gemini",
        model: "gemini-2.0-flash-thinking-exp",
        apiKey: geminiApiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        description: "Complex reasoning and multi-step planning",
      },
      insight: {
        provider: "gemini",
        model: "gemini-2.0-flash-exp",
        apiKey: geminiApiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        description: "Data extraction and page understanding",
      },
      action: {
        provider: "ui-tars",
        model: "ui-tars",
        baseUrl: CORTEX_URL,
        fallback: {
          provider: "gemini",
          model: "gemini-2.0-flash-exp",
          apiKey: geminiApiKey,
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        },
        description: "Element localization and UI interaction",
      },
    };
  }

  /**
   * Detect intent from instruction
   */
  detectIntent(instruction) {
    const lowerInstruction = instruction.toLowerCase();

    // Planning intent patterns
    const planningPatterns = [
      "fill out",
      "complete the form",
      "multi-step",
      "validate",
      "ensure",
      "make sure",
      "check all",
      "verify all",
      "navigate through",
      "go through",
      "process",
    ];

    // Insight intent patterns
    const insightPatterns = [
      "extract",
      "get all",
      "list all",
      "find all",
      "what are",
      "how many",
      "count",
      "summarize",
      "data from",
      "information about",
    ];

    // Check for planning intent
    if (planningPatterns.some((pattern) => lowerInstruction.includes(pattern))) {
      return "planning";
    }

    // Check for insight intent
    if (insightPatterns.some((pattern) => lowerInstruction.includes(pattern))) {
      return "insight";
    }

    // Default to action intent (simple clicks, localization)
    return "action";
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment(geminiApiKey) {
    const warnings = [];

    if (!geminiApiKey) {
      warnings.push(
        "GEMINI_API_KEY is not set. Vision analysis will fail if UI-TARS is unavailable."
      );
    }

    if (warnings.length > 0) {
      console.warn("[VISION_MANAGER] Configuration warnings:");
      warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
      console.warn(
        "[VISION_MANAGER] Set GEMINI_API_KEY in your environment to enable Gemini Vision fallback."
      );
    }
  }

  /**
   * Execute vision request with intent-based routing
   */
  async analyze(screenshot, instruction, explicitIntent) {
    const intent = explicitIntent || this.detectIntent(instruction);
    const modelConfig = this.config[intent];

    console.log(
      `[VISION_MANAGER] Intent: ${intent}, Model: ${modelConfig?.model}`
    );

    try {
      return await this.executeWithModel(
        modelConfig,
        screenshot,
        instruction,
        intent
      );
    } catch (error) {
      console.error(`[VISION_MANAGER] ${intent} model failed:`, error);

      // Try fallback if available
      if (modelConfig?.fallback) {
        console.log(
          `[VISION_MANAGER] Trying fallback: ${modelConfig.fallback.model}`
        );
        return await this.executeWithModel(
          modelConfig.fallback,
          screenshot,
          instruction,
          intent
        );
      }

      throw error;
    }
  }

  /**
   * Execute with specific model
   */
  async executeWithModel(config, screenshot, instruction, intent) {
    switch (config.provider) {
      case "ui-tars":
        return await this.executeUITARS(config, screenshot, instruction);

      case "gemini":
        return await this.executeGemini(
          config,
          screenshot,
          instruction,
          intent
        );

      case "openai":
        return await this.executeOpenAI(
          config,
          screenshot,
          instruction,
          intent
        );

      case "claude":
        return await this.executeClaude(
          config,
          screenshot,
          instruction,
          intent
        );

      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * Execute with UI-TARS
   */
  async executeUITARS(config, screenshot, instruction) {
    const response = await fetch(`${config.baseUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenshot, instruction }),
    });

    if (!response.ok) {
      throw new Error(`UI-TARS error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      prediction: data.prediction,
      model: "ui-tars",
      intent: "action",
    };
  }

  /**
   * Execute with Gemini
   */
  async executeGemini(config, screenshot, instruction, intent) {
    const prompt = this.buildPromptForIntent(instruction, intent);

    const response = await fetch(
      `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: screenshot.replace(/^data:image\/\w+;base64,/, ""),
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      prediction: text,
      model: config.model,
      intent,
    };
  }

  /**
   * Execute with OpenAI (future support)
   */
  async executeOpenAI(config, screenshot, instruction, intent) {
    const prompt = this.buildPromptForIntent(instruction, intent);

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${screenshot}` },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    return {
      prediction: data.choices[0].message.content,
      model: config.model,
      intent,
    };
  }

  /**
   * Execute with Claude (future support)
   */
  async executeClaude(config, screenshot, instruction, intent) {
    const prompt = this.buildPromptForIntent(instruction, intent);

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: screenshot,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    return {
      prediction: data.content[0].text,
      model: config.model,
      intent,
    };
  }

  /**
   * Build prompt optimized for intent
   */
  buildPromptForIntent(instruction, intent) {
    switch (intent) {
      case "planning":
        return `You are a UI automation planner. Analyze this screenshot and plan the steps to: ${instruction}

Think through:
1. What elements need to be interacted with?
2. What is the correct sequence of actions?
3. What validations are needed?
4. What edge cases should be handled?

Provide a detailed step-by-step plan.`;

      case "insight":
        return `You are a data extraction specialist. Analyze this screenshot and: ${instruction}

Extract the requested information in a structured format.
If asked for a list, return JSON array.
If asked for specific data, return JSON object.
Be precise and complete.`;

      case "action":
        return `You are a UI element locator. Analyze this screenshot and: ${instruction}

Provide the exact coordinates or action needed.
Format: {"action": "click/type/scroll", "coordinates": {"x": 0, "y": 0}, "text": "optional"}`;

      default:
        return instruction;
    }
  }

  /**
   * Update configuration (for adding new models)
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const visionManager = new VisionManager();
