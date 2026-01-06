/**
 * Vision UI Service
 * Uses Gemini Vision AI to find UI elements from screenshots + UI tree
 */

import { getGenClient } from "./genAIClient";
import type { UINode } from "./uiAutomationService";

export interface ElementSearchResult {
  found: boolean;
  nodeId?: string;
  confidence: number;
  reasoning?: string;
  error?: string;
}

class VisionUIService {
  /**
   * Find UI element using Vision AI + UI tree
   * Combines screenshot (for visual context) and UI tree (for precise targeting)
   */
  async findElement(
    screenshot: string, // base64 image
    uiTree: UINode[],
    description: string
  ): Promise<ElementSearchResult> {
    try {
      const ai = getGenClient();

      // Prepare UI tree summary (simplified for token efficiency)
      const elementsSummary = uiTree
        .filter((node) => node.clickable || node.editable)
        .map((node, index) => ({
          index,
          id: node.id,
          text: node.text || "",
          description: node.description || "",
          className: node.className?.split(".").pop() || "", // Just class name, not full package
          bounds: node.bounds,
          clickable: node.clickable,
          editable: node.editable,
        }))
        .slice(0, 50); // Limit to top 50 interactive elements to save tokens

      const prompt = `You are analyzing an Android app screenshot to find a UI element.

TASK: Find the element that matches this description: "${description}"

UI TREE DATA (Interactive elements only):
${JSON.stringify(elementsSummary, null, 2)}

INSTRUCTIONS:
1. Analyze the screenshot to visually identify the element
2. Match it to the most accurate entry in the UI tree using bounds, text, and visual position
3. Return ONLY a JSON object in this exact format:

{
  "found": true/false,
  "nodeId": "the id field from UI tree",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of your matching logic"
}

CRITICAL: Return ONLY the JSON object, no other text.`;

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
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      });

      const responseText = result.text || "";

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          found: false,
          confidence: 0,
          error: "Invalid response from Vision AI",
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        found: parsed.found || false,
        nodeId: parsed.nodeId,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning,
      };
    } catch (error: any) {
      console.error("[VisionUI] Error finding element:", error);
      return {
        found: false,
        confidence: 0,
        error: error.message || "Vision AI failed",
      };
    }
  }

  /**
   * Find multiple elements matching a description
   */
  async findElements(
    screenshot: string,
    uiTree: UINode[],
    description: string,
    limit: number = 3
  ): Promise<ElementSearchResult[]> {
    try {
      const ai = getGenClient();

      const elementsSummary = uiTree
        .filter((node) => node.clickable || node.editable)
        .map((node, index) => ({
          index,
          id: node.id,
          text: node.text || "",
          description: node.description || "",
          className: node.className?.split(".").pop() || "",
          bounds: node.bounds,
        }))
        .slice(0, 50);

      const prompt = `Find up to ${limit} UI elements matching: "${description}"

UI TREE:
${JSON.stringify(elementsSummary, null, 2)}

Return JSON array of matches:
[
  {"nodeId": "...", "confidence": 0.9, "reasoning": "..."},
  ...
]`;

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
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any) => ({
        found: true,
        nodeId: item.nodeId,
        confidence: item.confidence || 0,
        reasoning: item.reasoning,
      }));
    } catch (error: any) {
      console.error("[VisionUI] Error finding elements:", error);
      return [];
    }
  }

  /**
   * Verify element is visible and ready for interaction
   */
  async verifyElement(
    screenshot: string,
    nodeId: string,
    expectedDescription: string
  ): Promise<boolean> {
    try {
      const ai = getGenClient();

      const prompt = `Is there a "${expectedDescription}" visible in this screenshot? Answer only: YES or NO`;

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
          temperature: 0,
          maxOutputTokens: 10,
        },
      });

      const response = (result.text || "").trim().toUpperCase();
      return response.includes("YES");
    } catch (error) {
      console.error("[VisionUI] Error verifying element:", error);
      return false;
    }
  }
}

export const visionUIService = new VisionUIService();
