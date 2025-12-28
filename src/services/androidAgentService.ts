import { AndroidXmlParser } from "../utils/androidXmlParser";
import { getGenClient } from "./genAIClient";
import { apiUrl } from "../config/api";

// Dynamic import for NeuralLinkManager to avoid circular dependencies/init issues
let neuralLinkManager: any = null;
try {
  import("./neuralLink/manager").then((module) => {
    neuralLinkManager = module.neuralLinkManager;
    console.log("[AndroidAgent] Neural Link Manager loaded.");
  });
} catch (e) {
  console.warn("[AndroidAgent] Neural Link Manager not available.");
}

// Use local server API instead of direct child_process
const SERVER_URL = apiUrl("/api/android");

interface AgentStep {
  action: "TAP" | "TYPE" | "HOME" | "BACK" | "SCROLL" | "DONE" | "FAIL";
  targetId?: number;
  text?: string;
  reasoning: string;
  // Vision Mode Extras
  x?: number;
  y?: number;
}

export class AndroidAgentService {
  private isRunning = false;
  private maxSteps = 10;

  /**
   * Executes a high-level goal on the connected Android device.
   * @param goal Natural language goal
   * @param strategy 'ACCURACY' (XML) or 'WIRELESS' (Vision/Screenshot)
   */
  async executeGoal(
    goal: string,
    strategy: "ACCURACY" | "WIRELESS" = "ACCURACY"
  ): Promise<string> {
    if (this.isRunning) {
      throw new Error("Agent is already running a task.");
    }
    this.isRunning = true;
    let stepCount = 0;
    const history: string[] = [];

    try {
      while (stepCount < this.maxSteps) {
        let step: AgentStep;
        let uiTree: any[] | null = null;
        let screenshotBase64: string | null = null;

        // 1. OBSERVE
        if (strategy === "ACCURACY") {
          uiTree = await this.getUiTree();
          if (!uiTree) {
            console.warn(
              "[AndroidAgent] XML Dump failed. Falling back to Vision."
            );
            strategy = "WIRELESS";
          }
        }

        if (strategy === "WIRELESS") {
          screenshotBase64 = await this.getScreenshot();
          if (!screenshotBase64) {
            return "Failed to acquire vision. Ensure device is connected via Neural Link (QR) or USB (ADB).";
          }
        }

        // 2. THINK
        if (strategy === "ACCURACY" && uiTree) {
          step = await this.decideNextStepXml(goal, uiTree, history);
        } else if (strategy === "WIRELESS" && screenshotBase64) {
          step = await this.decideNextStepVision(
            goal,
            screenshotBase64,
            history
          );
        } else {
          return "Observation failed for all strategies.";
        }

        history.push(
          `Step ${stepCount + 1}: ${step.action} - ${step.reasoning}`
        );

        // 3. ACT
        if (step.action === "DONE") {
          return `Goal Reached: ${step.reasoning}`;
        }
        if (step.action === "FAIL") {
          return `Aborted: ${step.reasoning}`;
        }

        // Execute physical action
        await this.performAction(step, uiTree, strategy);

        // Wait for UI to settle
        await new Promise((resolve) => setTimeout(resolve, 3000));
        stepCount++;
      }
      return "Max steps reached without explicit completion.";
    } catch (error: any) {
      console.error("Android Agent Error:", error);
      return `Error: ${error.message}`;
    } finally {
      this.isRunning = false;
    }
  }

  private getConnectedMobileDevice() {
    if (!neuralLinkManager) return null;
    // Find the first device that is 'android'
    for (const [id, device] of neuralLinkManager.devices) {
      if (device.type === "android" || device.type === "mobile") {
        return device;
      }
    }
    return null;
  }

  private async getUiTree() {
    try {
      const res = await fetch(`${SERVER_URL}/ui-tree`);
      const data = await res.json();
      if (data.error) return null;

      const catRes = await fetch(`${SERVER_URL}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "cat /sdcard/ui.xml" }),
      });
      const catData = await catRes.json();

      if (catData.result) {
        return await AndroidXmlParser.parse(catData.result);
      }
      return null;
    } catch (e) {
      console.error("ADB UI Dump failed:", e);
      return null;
    }
  }

  private async getScreenshot(): Promise<string | null> {
    try {
      // Priority 1: Neural Link (Wireless)
      const mobileDevice = this.getConnectedMobileDevice();
      if (mobileDevice && neuralLinkManager) {
        console.log(
          `[AndroidAgent] Requesting screenshot via Neural Link (${mobileDevice.deviceId})...`
        );
        const response = await neuralLinkManager.delegateTool(
          mobileDevice.deviceId,
          "controlMobileDevice",
          { action: "SCREENSHOT" }
        );

        if (response.success && response.result) {
          // Expecting result to be the base64 string or an object with it
          // Adjust based on actual mobile implementation. Assuming direct base64 string or { base64: string }
          return typeof response.result === "string"
            ? response.result
            : response.result.base64;
        }
        console.warn(
          "[AndroidAgent] Neural Link screenshot failed:",
          response.error
        );
      }

      // Priority 2: ADB Fallback (if USB connected)
      console.log("[AndroidAgent] Falling back to ADB Screenshot...");
      const cmd = "screencap -p | base64";
      const res = await fetch(`${SERVER_URL}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if (data.result) {
        return data.result.replace(/\n/g, "").trim();
      }
      return null;
    } catch (e) {
      console.error("Screenshot failed:", e);
      return null;
    }
  }

  private async decideNextStepXml(
    goal: string,
    uiElements: any[],
    history: string[]
  ): Promise<AgentStep> {
    const genAI = getGenClient();
    const elementList = uiElements
      .map(
        (e) =>
          `ID: ${e.id} | Type: ${e.type.split(".").pop()} | Text: "${
            e.text || ""
          }" | Desc: "${e.contentDesc || ""}"`
      )
      .join("\n");

    const prompt = `
        You are an Android Automation Agent (XML Mode).
        GOAL: "${goal}"

        CURRENT SCREEN STATE:
        ${elementList}

        HISTORY:
        ${history.join("\n")}

        INSTRUCTIONS:
        Return JSON with:
        - "action": "TAP", "TYPE", "HOME", "BACK", "SCROLL", "DONE", "FAIL"
        - "targetId": ID for TAP
        - "text": for TYPE
        - "reasoning": explanation
        `;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(result.text || "{}") as AgentStep;
    } catch (e) {
      console.error("XML Decision failed:", e);
      return { action: "FAIL", reasoning: "Brain failure" };
    }
  }

  private async decideNextStepVision(
    goal: string,
    screenshotBase64: string,
    history: string[]
  ): Promise<AgentStep> {
    const genAI = getGenClient();

    const prompt = `
        You are an Android Automation Agent (Vision Mode).
        GOAL: "${goal}"
        
        HISTORY:
        ${history.join("\n")}

        INSTRUCTIONS:
        1. Analyze the screenshot. find the element that matches the GOAL.
        2. Estimate its CENTER (X, Y) coordinates (use image dimensions).
        3. Return JSON:
        - "action": "TAP", "TYPE", "HOME", "BACK", "SCROLL", "DONE", "FAIL"
        - "x": number (Tap X)
        - "y": number (Tap Y)
        - "text": string (for TYPE)
        - "reasoning": string
        
        If unsure, choose FAIL.
        `;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: screenshotBase64 } },
          ],
        },
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(result.text || "{}") as AgentStep;
    } catch (e) {
      console.error("Vision Decision failed:", e);
      return { action: "FAIL", reasoning: "Visual Brain failure" };
    }
  }

  private async performAction(
    step: AgentStep,
    uiElements: any[] | null,
    strategy: string
  ) {
    // --- HELPER: ADB EXECUTION ---
    const adbCommand = async (cmd: string) => {
      await fetch(`${SERVER_URL}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
    };

    // --- HELPER: NEURAL LINK EXECUTION ---
    const neuralCommand = async (action: string, args: any) => {
      const device = this.getConnectedMobileDevice();
      if (device && neuralLinkManager) {
        console.log(`[AndroidAgent] Sending Neural Command: ${action}`, args);
        await neuralLinkManager.delegateTool(
          device.deviceId,
          "controlMobileDevice",
          {
            action,
            ...args,
          }
        );
      } else {
        console.warn(
          "[AndroidAgent] No Neural Link device found for action. Falling back to ADB."
        );
        // Fallback to ADB if possible
        if (action === "TAP" && args.x && args.y)
          adbCommand(`input tap ${args.x} ${args.y}`);
        if (action === "TEXT" && args.text)
          adbCommand(`input text "${args.text.replace(/\s/g, "%s")}"`); // simple implementation
        if (action === "KEY" && args.keyCode)
          adbCommand(`input keyevent ${args.keyCode}`);
        if (action === "SWIPE") adbCommand("input swipe 500 1500 500 500 300");
      }
    };

    // --- EXECUTE ---
    switch (step.action) {
      case "TAP": {
        let x = step.x;
        let y = step.y;
        if (uiElements && step.targetId !== undefined) {
          const target = uiElements.find((e) => e.id === step.targetId);
          if (target) {
            x = target.center.x;
            y = target.center.y;
          }
        }
        if (x !== undefined && y !== undefined) {
          if (strategy === "WIRELESS") {
            await neuralCommand("TAP", { x, y });
          } else {
            await adbCommand(`input tap ${x} ${y}`);
          }
        }
        break;
      }

      case "TYPE":
        if (step.text) {
          if (strategy === "WIRELESS") {
            await neuralCommand("TEXT", { text: step.text });
          } else {
            const escaped = step.text.replace(/\s/g, "%s");
            await adbCommand(`input text "${escaped}"`);
          }
        }
        break;

      case "HOME":
        if (strategy === "WIRELESS") await neuralCommand("KEY", { keyCode: 3 });
        else await adbCommand("input keyevent KEYCODE_HOME");
        break;

      case "BACK":
        if (strategy === "WIRELESS") await neuralCommand("KEY", { keyCode: 4 });
        else await adbCommand("input keyevent KEYCODE_BACK");
        break;

      case "SCROLL":
        if (strategy === "WIRELESS")
          await neuralCommand("SWIPE", {
            x: 500,
            y: 1500,
            x2: 500,
            y2: 500,
          });
        // Approximate up-swipe
        else await adbCommand("input swipe 500 1500 500 500 300");
        break;
    }
  }
}

export const androidAgent = new AndroidAgentService();
