import { visionManager } from "./visionManager";
import type { VisionIntent } from "./visionManager.types";

export const uiTarsService = {
  /**
   * Send a screenshot and instruction to Vision Manager for analysis.
   * Uses intent-based routing to select the best model for the task.
   *
   * @param screenshotBase64 - Base64 encoded screenshot
   * @param instruction - Natural language instruction
   * @param intent - Optional explicit intent (auto-detected if not provided)
   */
  analyze: async (
    screenshotBase64: string,
    instruction: string,
    intent?: VisionIntent
  ) => {
    try {
      const result = await visionManager.analyze(
        screenshotBase64,
        instruction,
        intent
      );

      console.log(
        `[UI-TARS] Success via ${result.model} (${result.intent} intent)`
      );
      return result.prediction;
    } catch (e: any) {
      console.error("[UI-TARS] Analysis Failed:", e);
      throw e;
    }
  },
};
