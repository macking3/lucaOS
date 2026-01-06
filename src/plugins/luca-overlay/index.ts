/**
 * LucaOverlay Capacitor Plugin
 * TypeScript interface for controlling floating overlay widgets on Android
 */

export type WidgetType = "hologram" | "chat";

export interface LucaOverlayPlugin {
  /**
   * Check if overlay permission (SYSTEM_ALERT_WINDOW) is granted
   */
  checkPermission(): Promise<{ granted: boolean }>;

  /**
   * Request overlay permission - opens system settings
   */
  requestPermission(): Promise<void>;

  /**
   * Show a specific widget
   */
  show(options: { widget: WidgetType }): Promise<void>;

  /**
   * Hide a specific widget
   */
  hide(options: { widget: WidgetType }): Promise<void>;

  /**
   * Check if a widget is currently visible
   */
  isVisible(options: { widget: WidgetType }): Promise<{ visible: boolean }>;

  /**
   * Set hologram animation state (voice widget only)
   */
  setState(options: {
    state: "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
  }): Promise<void>;

  /**
   * Set audio level for hologram (voice widget only)
   */
  setAudioLevel(options: { level: number }): Promise<void>;

  /**
   * Add message to chat widget
   */
  addMessage(options: {
    role: "user" | "assistant";
    content: string;
  }): Promise<void>;

  /**
   * Set theme for overlay widgets (matches desktop personas)
   * Persona: RUTHLESS (Blue), ENGINEER (Terracotta), ASSISTANT (Grey), HACKER (Green), DICTATION (Purple)
   */
  setTheme(options: {
    persona: "RUTHLESS" | "ENGINEER" | "ASSISTANT" | "HACKER" | "DICTATION";
  }): Promise<void>;

  /**
   * Listen for messages sent from chat widget
   */
  addListener(
    eventName: "overlayMessage",
    listenerFunc: (data: { message: string }) => void
  ): Promise<{ remove: () => void }>;

  /**
   * Listen for hologram voice (voice-to-voice)
   */
  addListener(
    eventName: "overlayVoice",
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;

  /**
   * Listen for chat voice button (voice-to-text)
   */
  addListener(
    eventName: "overlayChatVoice",
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;

  /**
   * Listen for continuous voice results (Sentry Mode)
   */
  addListener(
    eventName: "overlayVoiceResult",
    listenerFunc: (data: { text: string; isFinal: boolean }) => void
  ): Promise<{ remove: () => void }>;
}

// Register plugin
import { registerPlugin } from "@capacitor/core";

export const LucaOverlay = registerPlugin<LucaOverlayPlugin>("LucaOverlay", {
  web: () => import("./web").then((m) => new m.LucaOverlayWeb()),
});
