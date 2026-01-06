/**
 * Model Manager Service
 * Unified management of all local AI models (Desktop).
 *
 * Models:
 * - Gemma 2B (Chat Brain)
 * - SmolVLM-500M (Astra Scan)
 * - UI-TARS 2B (Agentic Click)
 * - Piper Amy (TTS)
 */

import { cortexUrl } from "../config/api";

export interface LocalModel {
  id: string;
  name: string;
  description: string;
  size: number; // bytes
  sizeFormatted: string;
  category: "brain" | "vision" | "tts" | "agent";
  status: "not_downloaded" | "downloading" | "ready" | "error";
  downloadProgress?: number; // 0-100
  platforms: ("desktop" | "mobile")[]; // Which platforms support this model
}

// Model definitions
const MODEL_DEFINITIONS: Omit<LocalModel, "status" | "downloadProgress">[] = [
  {
    id: "gemma-2b",
    name: "Gemma 2B",
    description:
      "Google's local chat brain for offline conversations and tool calling.",
    size: 2_200_000_000,
    sizeFormatted: "2.1 GB",
    category: "brain",
    platforms: ["desktop", "mobile"],
  },
  {
    id: "smolvlm-500m",
    name: "SmolVLM 500M",
    description:
      "Ultra-fast vision model for Astra Scan and quick image analysis.",
    size: 500_000_000,
    sizeFormatted: "500 MB",
    category: "vision",
    platforms: ["desktop"], // Desktop only - requires screen capture
  },
  {
    id: "ui-tars-2b",
    name: "UI-TARS 2B",
    description:
      "Vision-language model for intelligent UI clicking and automation.",
    size: 2_000_000_000,
    sizeFormatted: "2.0 GB",
    category: "agent",
    platforms: ["desktop"], // Desktop only - requires mouse control
  },
  {
    id: "piper-amy",
    name: "Piper Amy",
    description: "Neural TTS voice for offline speech synthesis.",
    size: 60_000_000,
    sizeFormatted: "60 MB",
    category: "tts",
    platforms: ["desktop", "mobile"],
  },
];

class ModelManagerService {
  private models: Map<string, LocalModel> = new Map();
  private listeners: Set<(models: LocalModel[]) => void> = new Set();

  constructor() {
    // Initialize models with unknown status
    MODEL_DEFINITIONS.forEach((def) => {
      this.models.set(def.id, { ...def, status: "not_downloaded" });
    });
  }

  /**
   * Get all models with their current status
   */
  async getModels(): Promise<LocalModel[]> {
    await this.refreshStatus();
    return Array.from(this.models.values());
  }

  /**
   * Get models filtered by platform (desktop or mobile)
   */
  async getModelsForPlatform(
    platform: "desktop" | "mobile"
  ): Promise<LocalModel[]> {
    await this.refreshStatus();
    return Array.from(this.models.values()).filter((model) =>
      model.platforms.includes(platform)
    );
  }

  /**
   * Detect current platform
   */
  static getCurrentPlatform(): "desktop" | "mobile" {
    // Check for Capacitor (mobile)
    if (
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.()
    ) {
      return "mobile";
    }
    // Check for mobile user agent as fallback
    if (
      typeof navigator !== "undefined" &&
      /Mobi|Android/i.test(navigator.userAgent)
    ) {
      return "mobile";
    }
    return "desktop";
  }

  /**
   * Check which models are downloaded by querying Cortex
   */
  async refreshStatus(): Promise<void> {
    try {
      const response = await fetch(cortexUrl("/models/status"));
      if (!response.ok) {
        console.warn("[ModelManager] Failed to fetch model status");
        return;
      }

      const data = await response.json();

      // Update each model's status
      for (const [modelId, status] of Object.entries(data.models || {})) {
        const model = this.models.get(modelId);
        if (model) {
          model.status = (status as any).downloaded
            ? "ready"
            : "not_downloaded";
        }
      }

      this.notifyListeners();
    } catch (error) {
      console.error("[ModelManager] Status check failed:", error);
    }
  }

  /**
   * Download a model
   */
  async downloadModel(
    modelId: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const model = this.models.get(modelId);
    if (!model) {
      console.error(`[ModelManager] Unknown model: ${modelId}`);
      return false;
    }

    model.status = "downloading";
    model.downloadProgress = 0;
    this.notifyListeners();

    try {
      // Use EventSource for progress updates
      const eventSource = new EventSource(
        cortexUrl(`/models/download/${modelId}`)
      );

      return await new Promise<boolean>((resolve) => {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.progress !== undefined) {
            model.downloadProgress = data.progress;
            onProgress?.(data.progress);
            this.notifyListeners();
          }

          if (data.status === "complete") {
            model.status = "ready";
            model.downloadProgress = 100;
            this.notifyListeners();
            eventSource.close();
            resolve(true);
          }

          if (data.status === "error") {
            model.status = "error";
            this.notifyListeners();
            eventSource.close();
            resolve(false);
          }
        };

        eventSource.onerror = () => {
          // Fallback: Check if download completed via status endpoint
          setTimeout(async () => {
            await this.refreshStatus();
            eventSource.close();
            resolve(model.status === "ready");
          }, 2000);
        };
      });
    } catch (error) {
      console.error(`[ModelManager] Download failed for ${modelId}:`, error);
      model.status = "error";
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Delete a model to free storage
   */
  async deleteModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    if (!model) {
      return false;
    }

    try {
      const response = await fetch(cortexUrl(`/models/delete/${modelId}`), {
        method: "DELETE",
      });

      if (response.ok) {
        model.status = "not_downloaded";
        model.downloadProgress = undefined;
        this.notifyListeners();
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[ModelManager] Delete failed for ${modelId}:`, error);
      return false;
    }
  }

  /**
   * Get total storage used by downloaded models
   */
  getTotalStorageUsed(): { bytes: number; formatted: string } {
    let total = 0;
    this.models.forEach((model) => {
      if (model.status === "ready") {
        total += model.size;
      }
    });

    const gb = (total / (1024 * 1024 * 1024)).toFixed(1);
    return { bytes: total, formatted: `${gb} GB` };
  }

  /**
   * Subscribe to model updates
   */
  subscribe(callback: (models: LocalModel[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const models = Array.from(this.models.values());
    this.listeners.forEach((cb) => cb(models));
  }
}

// Export singleton and class
export const modelManager = new ModelManagerService();
export { ModelManagerService };
