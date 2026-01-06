import { WebPlugin } from "@capacitor/core";
import type { LucaAccessibilityPlugin } from "./index";

export class LucaAccessibilityWeb
  extends WebPlugin
  implements LucaAccessibilityPlugin
{
  async isEnabled(): Promise<{ enabled: boolean }> {
    // Not supported on web
    return { enabled: false };
  }

  async requestEnable(): Promise<void> {
    throw new Error("Accessibility Service only available on Android");
  }

  async getUITree(): Promise<{ tree: string }> {
    throw new Error("Accessibility Service only available on Android");
  }

  async performAction(): Promise<{ success: boolean }> {
    throw new Error("Accessibility Service only available on Android");
  }

  async performGlobalAction(): Promise<{ success: boolean }> {
    throw new Error("Accessibility Service only available on Android");
  }

  async captureScreen(): Promise<{ base64: string }> {
    throw new Error("Accessibility Service only available on Android");
  }
}
