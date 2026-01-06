/**
 * LucaAccessibility Capacitor Plugin
 * TypeScript interface for UI automation on Android
 */

export interface LucaAccessibilityPlugin {
  /**
   * Check if accessibility service is enabled
   */
  isEnabled(): Promise<{ enabled: boolean }>;

  /**
   * Open accessibility settings to request user enable the service
   */
  requestEnable(): Promise<void>;

  /**
   * Get current UI tree as JSON
   * Returns hierarchical structure of all UI elements on screen
   */
  getUITree(): Promise<{ tree: string }>;

  /**
   * Perform action on UI element
   */
  performAction(options: {
    nodeId: string;
    action: "click" | "long_click" | "type" | "scroll_up" | "scroll_down";
    text?: string; // Required for 'type' action
  }): Promise<{ success: boolean }>;

  /**
   * Perform global navigation action
   */
  performGlobalAction(options: {
    action: "back" | "home" | "recents";
  }): Promise<{ success: boolean }>;

  /**
   * Capture screenshot (Android 9+ only)
   */
  captureScreen(): Promise<{ base64: string }>;
}

// Register plugin
import { registerPlugin } from "@capacitor/core";

export const LucaAccessibility = registerPlugin<LucaAccessibilityPlugin>(
  "LucaAccessibility",
  {
    web: () => import("./web").then((m) => new m.LucaAccessibilityWeb()),
  }
);
