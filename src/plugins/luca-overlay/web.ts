import { WebPlugin } from "@capacitor/core";
import type { LucaOverlayPlugin } from "./index";

export class LucaOverlayWeb extends WebPlugin implements LucaOverlayPlugin {
  async checkPermission(): Promise<{ granted: boolean }> {
    // Not supported on web
    return { granted: false };
  }

  async requestPermission(): Promise<void> {
    throw new Error("Overlay only available on Android");
  }

  async show(): Promise<void> {
    throw new Error("Overlay only available on Android");
  }

  async hide(): Promise<void> {
    throw new Error("Overlay only available on Android");
  }

  async isVisible(): Promise<{ visible: boolean }> {
    return { visible: false };
  }

  async setState(): Promise<void> {
    throw new Error("Overlay only available on Android");
  }

  async addMessage(): Promise<void> {
    throw new Error("Overlay only available on Android");
  }
}
