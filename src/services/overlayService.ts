/**
 * Overlay Service - TypeScript wrapper for Android overlay widgets
 */

import { LucaOverlay } from "../plugins/luca-overlay";
import { Capacitor } from "@capacitor/core";

export type HologramState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export interface OverlayConfig {
  // Chat widget: text message sent
  onChatMessage?: (message: string) => void;
  // Chat widget: 🎤 button tapped (voice-to-text)
  onChatVoice?: () => void;
  // Hologram: tapped (voice-to-voice)
  onHologramVoice?: () => void;
  // Continuous voice results for Sentry Mode
  onVoiceResult?: (text: string, isFinal: boolean) => void;
}

class OverlayService {
  private config: OverlayConfig = {};
  private messageListener: any = null;
  private hologramVoiceListener: any = null;
  private chatVoiceListener: any = null;
  private voiceResultListener: any = null;

  /**
   * Check if overlay is available (Android only)
   */
  isAvailable(): boolean {
    return Capacitor.getPlatform() === "android";
  }

  /**
   * Check if overlay permission is granted
   */
  async hasPermission(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await LucaOverlay.checkPermission();
      return result.granted;
    } catch {
      return false;
    }
  }

  /**
   * Request overlay permission (opens settings)
   */
  async requestPermission(): Promise<void> {
    await LucaOverlay.requestPermission();
  }

  /**
   * Initialize overlay with event handlers
   */
  async initialize(config: OverlayConfig): Promise<void> {
    this.config = config;

    // Listen for text messages from chat widget
    if (config.onChatMessage) {
      this.messageListener = await LucaOverlay.addListener(
        "overlayMessage",
        (data) => config.onChatMessage?.(data.message)
      );
    }

    // Listen for hologram voice (voice-to-voice)
    if (config.onHologramVoice) {
      this.hologramVoiceListener = await LucaOverlay.addListener(
        "overlayVoice",
        () => config.onHologramVoice?.()
      );
    }

    // Listen for chat voice button (voice-to-text)
    if (config.onChatVoice) {
      this.chatVoiceListener = await LucaOverlay.addListener(
        "overlayChatVoice",
        () => config.onChatVoice?.()
      );
    }

    // Listen for continuous voice results (Sentry Mode)
    if (config.onVoiceResult) {
      this.voiceResultListener = await LucaOverlay.addListener(
        "overlayVoiceResult",
        (data: { text: string; isFinal: boolean }) =>
          config.onVoiceResult?.(data.text, data.isFinal)
      );
    }
  }

  /**
   * Show overlay (defaults to hologram)
   */
  async show(widget: "hologram" | "chat" = "hologram"): Promise<void> {
    if (!(await this.hasPermission())) {
      throw new Error("Overlay permission not granted");
    }
    await LucaOverlay.show({ widget });
  }

  /**
   * Hide overlay
   */
  async hide(widget: "hologram" | "chat" = "hologram"): Promise<void> {
    await LucaOverlay.hide({ widget });
  }

  /**
   * Toggle overlay visibility
   */
  async toggle(widget: "hologram" | "chat" = "hologram"): Promise<boolean> {
    const { visible } = await LucaOverlay.isVisible({ widget });
    if (visible) {
      await this.hide(widget);
      return false;
    } else {
      await this.show(widget);
      return true;
    }
  }

  /**
   * Set hologram animation state
   */
  async setState(state: HologramState): Promise<void> {
    await LucaOverlay.setState({ state });
  }

  /**
   * Add message to overlay chat
   */
  async addMessage(role: "user" | "assistant", content: string): Promise<void> {
    await LucaOverlay.addMessage({ role, content });
  }

  /**
   * Send response to overlay (for LLM responses)
   */
  async sendResponse(content: string): Promise<void> {
    await this.setState("SPEAKING");
    await this.addMessage("assistant", content);

    // Reset to idle after a delay
    setTimeout(() => {
      this.setState("IDLE");
    }, 2000);
  }

  /**
   * Cleanup listeners
   */
  async destroy(): Promise<void> {
    if (this.messageListener) {
      this.messageListener.remove();
      this.messageListener = null;
    }
    if (this.hologramVoiceListener) {
      this.hologramVoiceListener.remove();
      this.hologramVoiceListener = null;
    }
    if (this.chatVoiceListener) {
      this.chatVoiceListener.remove();
      this.chatVoiceListener = null;
    }
  }
}

// Export singleton
export const overlayService = new OverlayService();
