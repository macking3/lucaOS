export type VisionIntent = "planning" | "insight" | "action";

export interface ModelConfig {
  provider: "gemini" | "openai" | "claude" | "ui-tars" | "qwen";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  fallback?: ModelConfig;
  description?: string;
}

export interface VisionResult {
  prediction: string | object;
  model: string;
  intent: VisionIntent;
  metadata?: {
    tokensUsed?: number;
    latency?: number;
  };
}
