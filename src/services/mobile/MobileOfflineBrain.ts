/**
 * Mobile Offline Brain Service
 * Wraps MediaPipe LLM Inference for on-device AI on Android/iOS.
 *
 * Model: Gemma 2B (Quantized TFLite/GGUF)
 * Size: ~1.3GB download
 *
 * Usage:
 *   const brain = MobileOfflineBrain.getInstance();
 *   await brain.initialize(); // Downloads model if needed
 *   const response = await brain.generate("Hello!");
 */

import { LLMProvider, ChatMessage, LLMResponse } from "../llm/LLMProvider";

// MediaPipe LLM Inference types (will be dynamically imported)
interface LlmInference {
  generateResponse(prompt: string): Promise<string>;
  generateResponseAsync(
    prompt: string,
    callback: (partial: string, done: boolean) => void
  ): Promise<void>;
}

// Model configuration
const MODEL_CONFIG = {
  // Gemma 2B IT converted for MediaPipe (from verified Hugging Face source)
  // Source: https://huggingface.co/xianbao/mediapipe-gemma-2b-it
  modelUrl:
    "https://huggingface.co/xianbao/mediapipe-gemma-2b-it/resolve/main/gemma-2b-it-gpu-int4.bin",
  modelName: "gemma-2b-it-int4",
  modelSize: 1_400_000_000, // ~1.4GB
  cacheKey: "luca_mobile_brain_gemma2b",
};

// Download progress callback type
type ProgressCallback = (downloaded: number, total: number) => void;

class MobileOfflineBrainService implements LLMProvider {
  public name = "Mobile Gemma 2B";
  private static instance: MobileOfflineBrainService;
  private llmInference: LlmInference | null = null;
  private isInitialized = false;
  private isDownloading = false;

  private constructor() {}

  static getInstance(): MobileOfflineBrainService {
    if (!MobileOfflineBrainService.instance) {
      MobileOfflineBrainService.instance = new MobileOfflineBrainService();
    }
    return MobileOfflineBrainService.instance;
  }

  /**
   * Check if model is already downloaded
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      // Check IndexedDB / Cache API for stored model
      if (typeof caches !== "undefined") {
        const cache = await caches.open(MODEL_CONFIG.cacheKey);
        const response = await cache.match(MODEL_CONFIG.modelUrl);
        return response !== undefined;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get current model size (for UI display)
   */
  getModelSize(): { bytes: number; formatted: string } {
    const bytes = MODEL_CONFIG.modelSize;
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(1);
    return { bytes, formatted: `${gb} GB` };
  }

  /**
   * Download the model with progress reporting
   */
  async downloadModel(onProgress?: ProgressCallback): Promise<boolean> {
    if (this.isDownloading) {
      console.warn("[MobileOfflineBrain] Download already in progress");
      return false;
    }

    this.isDownloading = true;

    try {
      console.log("[MobileOfflineBrain] Starting model download...");

      const response = await fetch(MODEL_CONFIG.modelUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const contentLength = parseInt(
        response.headers.get("content-length") || "0"
      );
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Cannot read response body");
      }

      const chunks: Uint8Array[] = [];
      let downloaded = 0;

      let reading = true;
      while (reading) {
        const { done, value } = await reader.read();
        if (done) {
          reading = false;
          break;
        }

        chunks.push(value);
        downloaded += value.length;

        if (onProgress) {
          onProgress(downloaded, contentLength || MODEL_CONFIG.modelSize);
        }
      }

      // Combine chunks and store in Cache API
      const blob = new Blob(chunks);
      const cache = await caches.open(MODEL_CONFIG.cacheKey);
      await cache.put(MODEL_CONFIG.modelUrl, new Response(blob));

      console.log(
        "[MobileOfflineBrain] Model downloaded and cached successfully"
      );
      return true;
    } catch (error) {
      console.error("[MobileOfflineBrain] Download failed:", error);
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Delete the cached model to free storage
   */
  async deleteModel(): Promise<boolean> {
    try {
      if (typeof caches !== "undefined") {
        await caches.delete(MODEL_CONFIG.cacheKey);
        this.llmInference = null;
        this.isInitialized = false;
        console.log("[MobileOfflineBrain] Model cache cleared");
        return true;
      }
      return false;
    } catch (error) {
      console.error("[MobileOfflineBrain] Failed to delete model:", error);
      return false;
    }
  }

  /**
   * Initialize the LLM inference engine
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized && this.llmInference) {
      return true;
    }

    try {
      // Check if model is available
      const available = await this.isModelAvailable();
      if (!available) {
        console.warn(
          "[MobileOfflineBrain] Model not downloaded. Call downloadModel() first."
        );
        return false;
      }

      // Dynamically import MediaPipe (only when needed)
      // Note: This requires @mediapipe/tasks-genai to be installed
      // For now we'll create a mock that can be replaced with real MediaPipe
      console.log("[MobileOfflineBrain] Loading MediaPipe LLM Inference...");

      // Attempt to load from cache
      const cache = await caches.open(MODEL_CONFIG.cacheKey);
      const cachedResponse = await cache.match(MODEL_CONFIG.modelUrl);

      if (!cachedResponse) {
        throw new Error("Model not found in cache");
      }

      // TODO: Replace with actual MediaPipe LLM initialization
      // const { FilesetResolver, LlmInference } = await import("@mediapipe/tasks-genai");
      // const filesetResolver = await FilesetResolver.forGenAiTasks("...");
      // this.llmInference = await LlmInference.createFromModelPath(filesetResolver, modelPath);

      // Placeholder: Create mock inference for development
      this.llmInference = {
        generateResponse: async (prompt: string) => {
          // This will be replaced with actual MediaPipe call
          console.log(
            "[MobileOfflineBrain] (Mock) Generating response for:",
            prompt.substring(0, 50)
          );
          return `[Offline Brain] I received your message: "${prompt.substring(
            0,
            100
          )}..." - Full MediaPipe integration pending.`;
        },
        generateResponseAsync: async (
          prompt: string,
          callback: (partial: string, done: boolean) => void
        ) => {
          const response = await this.llmInference!.generateResponse(prompt);
          callback(response, true);
        },
      };

      this.isInitialized = true;
      console.log("[MobileOfflineBrain] Initialized successfully");
      return true;
    } catch (error) {
      console.error("[MobileOfflineBrain] Initialization failed:", error);
      return false;
    }
  }

  /**
   * Check if brain is ready for inference
   */
  isReady(): boolean {
    return this.isInitialized && this.llmInference !== null;
  }

  // --- LLMProvider Interface Implementation ---

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    if (!this.isReady()) {
      throw new Error(
        "Mobile Offline Brain not initialized. Call initialize() first."
      );
    }

    // Note: Current Gemma 2B is text-only. Images not supported.
    if (images && images.length > 0) {
      console.warn("[MobileOfflineBrain] Images not supported in offline mode");
    }

    return this.llmInference!.generateResponse(prompt);
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string> {
    if (!this.isReady()) {
      throw new Error("Mobile Offline Brain not initialized");
    }

    let fullText = "";
    await this.llmInference!.generateResponseAsync(prompt, (partial, _done) => {
      fullText = partial;
      onToken(partial);
    });

    return fullText;
  }

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[]
  ): Promise<LLMResponse> {
    if (!this.isReady()) {
      return {
        text: "Mobile Offline Brain is not ready. Please download the model in Settings.",
      };
    }

    // Build prompt from messages (Gemma chat template)
    let prompt = "";

    if (systemInstruction) {
      prompt += `<start_of_turn>system\n${systemInstruction}<end_of_turn>\n`;
    }

    for (const msg of messages) {
      if (msg.role === "user") {
        prompt += `<start_of_turn>user\n${msg.content}<end_of_turn>\n`;
      } else if (msg.role === "model") {
        prompt += `<start_of_turn>model\n${msg.content}<end_of_turn>\n`;
      }
    }

    // Append tool instructions if provided
    if (tools && tools.length > 0) {
      const toolNames = tools.map((t: any) => t.name).join(", ");
      prompt += `\n<start_of_turn>system\nAvailable tools: ${toolNames}. To use a tool, respond with JSON: {"tool": "name", "arguments": {}}<end_of_turn>\n`;
    }

    prompt += `<start_of_turn>model\n`;

    try {
      const response = await this.llmInference!.generateResponse(prompt);

      // Try to parse tool calls from response
      const toolCalls: any[] = [];
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0].includes('"tool"')) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.tool && parsed.arguments) {
            toolCalls.push({
              id: "mobile_" + Date.now(),
              name: parsed.tool,
              args: parsed.arguments,
            });
          }
        }
      } catch {
        // Not a tool call, just text
      }

      return {
        text: toolCalls.length > 0 ? "" : response,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error: any) {
      console.error("[MobileOfflineBrain] Chat error:", error);
      return {
        text: `Offline Brain Error: ${error.message}`,
      };
    }
  }
}

// Export singleton instance
export const mobileOfflineBrain = MobileOfflineBrainService.getInstance();
export { MobileOfflineBrainService };
