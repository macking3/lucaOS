/**
 * UI Automation Service
 * High-level service for automating Android UI via Accessibility Service + Vision AI
 */

import { LucaAccessibility } from "../plugins/luca-accessibility";
import { Capacitor } from "@capacitor/core";

export interface UINode {
  id: string;
  text?: string;
  description?: string;
  className: string;
  bounds: [number, number, number, number]; // [left, top, right, bottom]
  clickable: boolean;
  editable: boolean;
  enabled: boolean;
  scrollable: boolean;
  depth: number;
  childCount: number;
}

export interface AutomationResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class UIAutomationService {
  /**
   * Check if running on Android with Accessibility Service enabled
   */
  async isAvailable(): Promise<boolean> {
    if (Capacitor.getPlatform() !== "android") {
      return false;
    }

    try {
      const result = await LucaAccessibility.isEnabled();
      return result.enabled;
    } catch {
      return false;
    }
  }

  /**
   * Request user to enable accessibility service
   */
  async requestPermission(): Promise<void> {
    await LucaAccessibility.requestEnable();
  }

  /**
   * Get current UI tree
   */
  async getUITree(): Promise<UINode[]> {
    const result = await LucaAccessibility.getUITree();
    const treeData = JSON.parse(result.tree);
    return treeData.nodes || [];
  }

  /**
   * Find element by text content
   */
  async findElementByText(text: string): Promise<UINode | null> {
    const nodes = await this.getUITree();
    const normalized = text.toLowerCase();

    return (
      nodes.find(
        (node) =>
          node.text?.toLowerCase().includes(normalized) ||
          node.description?.toLowerCase().includes(normalized)
      ) || null
    );
  }

  /**
   * Find clickable elements
   */
  async findClickableElements(): Promise<UINode[]> {
    const nodes = await this.getUITree();
    return nodes.filter((node) => node.clickable && node.enabled);
  }

  /**
   * Find editable (input) elements
   */
  async findEditableElements(): Promise<UINode[]> {
    const nodes = await this.getUITree();
    return nodes.filter((node) => node.editable);
  }

  /**
   * Click element by ID
   */
  async click(nodeId: string): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performAction({
        nodeId,
        action: "click",
      });

      return {
        success: result.success,
        message: result.success ? `Clicked element ${nodeId}` : "Click failed",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Click failed",
      };
    }
  }

  /**
   * Type text into element
   */
  async type(nodeId: string, text: string): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performAction({
        nodeId,
        action: "type",
        text,
      });

      return {
        success: result.success,
        message: result.success ? `Typed "${text}"` : "Type failed",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Type failed",
      };
    }
  }

  /**
   * Scroll element
   */
  async scroll(
    nodeId: string,
    direction: "up" | "down"
  ): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performAction({
        nodeId,
        action: direction === "up" ? "scroll_up" : "scroll_down",
      });

      return {
        success: result.success,
        message: result.success ? `Scrolled ${direction}` : "Scroll failed",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Scroll failed",
      };
    }
  }

  /**
   * Navigate back
   */
  async goBack(): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performGlobalAction({
        action: "back",
      });
      return {
        success: result.success,
        message: "Navigated back",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Navigation failed",
      };
    }
  }

  /**
   * Go to home screen
   */
  async goHome(): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performGlobalAction({
        action: "home",
      });
      return {
        success: result.success,
        message: "Navigated to home",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Navigation failed",
      };
    }
  }

  /**
   * Open recent apps
   */
  async openRecents(): Promise<AutomationResult> {
    try {
      const result = await LucaAccessibility.performGlobalAction({
        action: "recents",
      });
      return {
        success: result.success,
        message: "Opened recent apps",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to open recents",
      };
    }
  }

  /**
   * Execute multi-step UI automation task
   * This is where Vision AI integration will happen later
   */
  async executeTask(): Promise<AutomationResult> {
    // TODO: This will integrate with Gemini Vision AI
    // For now, return a placeholder
    return {
      success: false,
      error:
        "Multi-step automation not yet implemented. Use individual actions for now.",
    };
  }

  /**
   * Find and click element by description
   * Uses Vision AI to locate element from natural language + screenshot
   */
  async findAndClick(
    description: string,
    screenshot?: string
  ): Promise<AutomationResult> {
    try {
      // Step 1: Get UI tree
      const nodes = await this.getUITree();

      // Step 2: If screenshot provided, use Vision AI
      if (screenshot) {
        const { visionUIService } = await import("./visionUIService");
        const searchResult = await visionUIService.findElement(
          screenshot,
          nodes,
          description
        );

        if (searchResult.found && searchResult.nodeId) {
          console.log(
            `[UIAutomation] Vision AI found element: ${searchResult.nodeId} (confidence: ${searchResult.confidence})`
          );
          console.log(`[UIAutomation] Reasoning: ${searchResult.reasoning}`);

          // Click the element
          return await this.click(searchResult.nodeId);
        } else {
          return {
            success: false,
            error: `Vision AI could not find element matching "${description}". ${
              searchResult.reasoning || ""
            }`,
          };
        }
      }

      // Step 3: Fallback to simple text matching (no screenshot)
      const element = nodes.find(
        (node) =>
          node.clickable &&
          (node.text?.toLowerCase().includes(description.toLowerCase()) ||
            node.description?.toLowerCase().includes(description.toLowerCase()))
      );

      if (!element) {
        return {
          success: false,
          error: `Could not find clickable element matching "${description}". Try providing a screenshot for Vision AI detection.`,
        };
      }

      return await this.click(element.id);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Find and click failed",
      };
    }
  }

  /**
   * Execute complex multi-step UI automation task with Vision AI
   */
  async executeVisionTask(
    task: string,
    screenshot: string
  ): Promise<AutomationResult> {
    try {
      // Use Gemini to plan the steps
      const { getGenClient } = await import("./genAIClient");
      const ai = getGenClient();

      const nodes = await this.getUITree();
      const elementsSummary = nodes
        .filter((n) => n.clickable || n.editable)
        .map((n) => ({
          id: n.id,
          text: n.text,
          description: n.description,
          type: n.className?.split(".").pop(),
        }))
        .slice(0, 30);

      const prompt = `You are automating an Android UI task: "${task}"

Available interactive elements:
${JSON.stringify(elementsSummary, null, 2)}

Return a JSON plan:
{
  "steps": [
    {"action": "click", "target": "element description", "nodeId": "id if obvious"},
    {"action": "type", "target": "field description", "text": "text to type"},
    {"action": "scroll", "direction": "up/down"}
  ]
}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: screenshot.replace(/^data:image\/\w+;base64,/, ""),
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          temperature: 0.3,
          maxOutputTokens: 800,
        },
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          success: false,
          error: "Could not generate automation plan",
        };
      }

      const plan = JSON.parse(jsonMatch[0]);

      // Execute steps
      const results: string[] = [];
      for (const step of plan.steps) {
        let stepResult: AutomationResult;

        switch (step.action) {
          case "click":
            stepResult = await this.findAndClick(step.target, screenshot);
            break;
          case "type": {
            // Find the input field first
            const fieldResult = await this.findAndClick(
              step.target,
              screenshot
            );
            if (fieldResult.success && step.text) {
              // Type into it (assuming the click focused it)
              const editableNode = nodes.find((n) => n.editable);
              if (editableNode) {
                stepResult = await this.type(editableNode.id, step.text);
              } else {
                stepResult = {
                  success: false,
                  error: "No editable field found",
                };
              }
            } else {
              stepResult = fieldResult;
            }
            break;
          }
          case "scroll": {
            const scrollableNode = nodes.find((n) => n.scrollable);
            if (scrollableNode) {
              stepResult = await this.scroll(scrollableNode.id, step.direction);
            } else {
              stepResult = {
                success: false,
                error: "No scrollable element found",
              };
            }
            break;
          }
          default:
            stepResult = {
              success: false,
              error: `Unknown action: ${step.action}`,
            };
            break;
        }

        results.push(
          `${step.action}: ${stepResult.success ? "✓" : "✗"} ${
            stepResult.message || stepResult.error || ""
          }`
        );

        if (!stepResult.success) {
          break; // Stop on first failure
        }

        // Small delay between steps
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return {
        success: true,
        message: `Executed ${results.length} steps:\n${results.join("\n")}`,
        data: { plan, results },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Vision task execution failed",
      };
    }
  }
}

// Export singleton
export const uiAutomationService = new UIAutomationService();
