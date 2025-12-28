import { memoryService } from "./memoryService";
import { allTools } from "./lucaService";

export interface SystemHealth {
  timestamp: number;
  vision: {
    status: "online" | "offline" | "permission_denied";
    details?: string;
  };
  audio: {
    status: "online" | "offline" | "permission_denied";
    details?: string;
  };
  cortex: {
    status: "online" | "offline" | "connecting";
    url?: string;
    backend?: string;
  };
  tools: {
    count: number;
    hash: string; // Simple hash to detect changes
  };
}

export const introspectionService = {
  /**
   * Run a full system diagnostic scan
   */
  async scan(): Promise<SystemHealth> {
    console.log("[INTROSPECTION] Initiating System Self-Scan...");
    const timestamp = Date.now();

    const [vision, audio, cortex, tools] = await Promise.all([
      this.checkVision(),
      this.checkAudio(),
      this.checkCortex(),
      this.checkTools(),
    ]);

    const status: SystemHealth = {
      timestamp,
      vision,
      audio,
      cortex,
      tools,
    };

    console.log("[INTROSPECTION] Scan Complete:", status);
    return status;
  },

  /**
   * Check Vision System (Camera Access)
   */
  async checkVision(): Promise<SystemHealth["vision"]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      if (cameras.length > 0) {
        // We have cameras, but do we have permission?
        // Trying to get a stream is the only sure way to check permission without prompting if already granted
        // For a passive check, we just rely on enumeration
        return {
          status: "online",
          details: `${cameras.length} cameras detected.`,
        };
      }
      return { status: "offline", details: "No video input devices found." };
    } catch (e: any) {
      return { status: "permission_denied", details: e.message };
    }
  },

  /**
   * Check Audio System (Mic Access)
   */
  async checkAudio(): Promise<SystemHealth["audio"]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      if (mics.length > 0) {
        return {
          status: "online",
          details: `${mics.length} microphones detected.`,
        };
      }
      return { status: "offline", details: "No audio input devices found." };
    } catch (e: any) {
      return { status: "permission_denied", details: e.message };
    }
  },

  /**
   * Check Cortex Backend (Python Server)
   */
  async checkCortex(): Promise<SystemHealth["cortex"]> {
    const url = await memoryService.getCortexUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

      const res = await fetch(`${url}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          status: "online",
          url,
          backend: data.backend || "Unknown",
        };
      }
      return { status: "offline", url };
    } catch (e) {
      return { status: "offline", url };
    }
  },

  /**
   * Check Available Tools (Cognitive Capabilities)
   */
  async checkTools(): Promise<SystemHealth["tools"]> {
    const count = allTools.length;
    // Simple hash based on tool names
    const names = allTools
      .map((t) => t.name)
      .sort()
      .join("|");
    const hash = this.simpleHash(names);

    return {
      count,
      hash,
    };
  },

  /**
   * Simple string hash for change detection
   */
  simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  },
};
