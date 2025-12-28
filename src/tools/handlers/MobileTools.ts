/**
 * Mobile Tools - Android Device Automation Handlers
 *
 * Provides tool handlers for controlling Android devices through natural language.
 * Supports both ACCURACY mode (XML-based via ADB) and WIRELESS mode (Vision-based via Neural Link).
 */

import { androidAgent } from "../../services/androidAgentService";

export interface MobileToolResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Execute a natural language goal on the connected Android device
 *
 * @param goal - Natural language description of what to do
 * @param strategy - ACCURACY (XML) or WIRELESS (Vision)
 * @returns Result of the automation
 */
export async function android_execute_goal(args: {
  goal: string;
  strategy?: "ACCURACY" | "WIRELESS";
}): Promise<MobileToolResult> {
  try {
    console.log(`[MOBILE TOOLS] Executing goal: ${args.goal}`);

    const result = await androidAgent.executeGoal(
      args.goal,
      args.strategy || "ACCURACY"
    );

    return {
      success: true,
      message: `Successfully executed: ${args.goal}`,
      data: { result },
    };
  } catch (error: any) {
    console.error("[MOBILE TOOLS] Goal execution failed:", error);
    return {
      success: false,
      error: error.message || "Failed to execute goal on Android device",
      message:
        "Make sure your Android device is connected via USB (ADB) or Neural Link.",
    };
  }
}

/**
 * Take a screenshot of the connected Android device
 *
 * @returns Screenshot as base64 string
 */
export async function android_screenshot(): Promise<MobileToolResult> {
  try {
    console.log("[MOBILE TOOLS] Taking screenshot...");

    const screenshot = await androidAgent.getScreenshot();

    if (!screenshot) {
      return {
        success: false,
        error: "Failed to capture screenshot",
        message:
          "Could not get screenshot from Android device. Check connection.",
      };
    }

    return {
      success: true,
      message: "Screenshot captured successfully",
      data: { screenshot },
    };
  } catch (error: any) {
    console.error("[MOBILE TOOLS] Screenshot failed:", error);
    return {
      success: false,
      error: error.message || "Failed to capture screenshot",
    };
  }
}

/**
 * Get the current UI hierarchy of the Android device
 *
 * @returns UI tree structure
 */
export async function android_get_ui(): Promise<MobileToolResult> {
  try {
    console.log("[MOBILE TOOLS] Getting UI tree...");

    const uiTree = await androidAgent.getUiTree();

    if (!uiTree) {
      return {
        success: false,
        error: "Failed to get UI tree",
        message: "Could not retrieve UI hierarchy. Ensure ADB is connected.",
      };
    }

    return {
      success: true,
      message: "UI tree retrieved successfully",
      data: { uiTree },
    };
  } catch (error: any) {
    console.error("[MOBILE TOOLS] UI tree retrieval failed:", error);
    return {
      success: false,
      error: error.message || "Failed to get UI tree",
    };
  }
}

/**
 * Check if a mobile device is connected and ready for automation
 *
 * @returns Connection status
 */
export async function android_check_connection(): Promise<MobileToolResult> {
  try {
    const device = await androidAgent.getConnectedMobileDevice();

    if (!device) {
      return {
        success: false,
        message: "No Android device connected",
        data: { connected: false },
      };
    }

    return {
      success: true,
      message: `Android device connected: ${device}`,
      data: { connected: true, device },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to check device connection",
      data: { connected: false },
    };
  }
}

// Export all mobile tool handlers
export const mobileToolHandlers = {
  android_execute_goal,
  android_screenshot,
  android_get_ui,
  android_check_connection,
};
