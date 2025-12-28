import { SystemHealth } from "./introspectionService";
import { voiceService } from "./voiceService";

class SelfExpressionService {
  /**
   * Generates a spoken status report based on system health.
   */
  private generateGreeting(status: SystemHealth): string {
    const parts: string[] = [];

    // 1. Specific System Checks
    if (status.vision.status === "online") {
      parts.push("Visual cortex: online.");
    } else {
      parts.push("Visual cortex: offline.");
    }

    if (status.audio.status === "online") {
      parts.push("Audio receptors: active.");
    } else {
      parts.push("Audio receptors: disabled.");
    }

    if (status.cortex.status === "online") {
      parts.push("Neural link: established.");
    } else {
      parts.push("Neural link: unreachable.");
    }

    // 2. Final Professional Greeting
    // If all systems online, use concise message
    if (
      status.vision.status === "online" &&
      status.audio.status === "online" &&
      status.cortex.status === "online"
    ) {
      // All systems confirmed - use concise message
      return "Luca System initialization complete. Welcome!! Awaiting your command.";
    } else {
      // Some systems offline - show full status
      parts.push(
        "Luca Core initialized. System status reported. Awaiting your command."
      );
      return parts.join(" ");
    }
  }

  /**
   * Vocalizes the system status.
   */
  async announceStatus(status: SystemHealth) {
    const greeting = this.generateGreeting(status);
    console.log(`[EXPRESSION] Saying: "${greeting}"`);

    // Use voice service to speak
    // Ensure we don't block the main thread too long, but speaking is async anyway
    try {
      const apiKey = import.meta.env.VITE_API_KEY || "";
      // Voice Config: Premium Studio Voice (Female/Assistant)
      const voiceConfig = {
        languageCode: "en-US",
        name: "en-US-Studio-O", // O for Female premium voice
      };

      await voiceService.speak(greeting, apiKey, voiceConfig);
    } catch (e) {
      console.warn("[EXPRESSION] Voice module failed:", e);
    }
  }
}

export const selfExpressionService = new SelfExpressionService();
