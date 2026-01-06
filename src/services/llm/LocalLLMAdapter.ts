import { LLMProvider, ChatMessage, LLMResponse } from "./LLMProvider";
import { cortexUrl } from "../../config/api";

// Define locally to avoid dependency issues if not exported
interface ToolFunction {
  name: string;
  description?: string;
  parameters?: any;
}

export class LocalLLMAdapter implements LLMProvider {
  public name: string;

  constructor(modelName: string = "local-gemma-2b") {
    this.name = modelName;
  }

  // Basic generation (non-chat)
  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const response = await this.chat(
      [{ role: "user", content: prompt }],
      images
    );
    return response.text || "";
  }

  // Stream not implemented yet for local
  async streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string> {
    const text = await this.generateContent(prompt);
    onToken(text);
    return text;
  }

  async chat(
    history: ChatMessage[],
    imageUrls?: string[],
    systemInstruction?: string,
    tools?: ToolFunction[]
  ): Promise<LLMResponse> {
    try {
      // 1. Construct Messages
      const messages: any[] = [];

      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }

      // 2. Add History
      history.forEach((msg) => {
        messages.push({
          role: msg.role === "model" ? "assistant" : msg.role,
          content: msg.content,
        });
      });

      // 3. Handle Images (NOT SUPPORTED BY Gemma 2 2B TEXT MODEL)
      if (imageUrls && imageUrls.length > 0) {
        // We inject a system note that images are present but unseen
        messages.push({
          role: "system",
          content:
            "[SYSTEM NOTE] User has attached an image, but your current Offline Brain (Gemma 2 2B) is text-only. Politey inform them you cannot see images in offline mode, but can answer text questions.",
        });
      }

      // 4. Map Tools to JSON Schema (if supported by backend)
      // For now, we pass raw tool definitions and hope the backend prompt engineering works
      const backendTools = tools
        ? tools.map((t) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

      // 5. Call Cortex
      const response = await fetch(cortexUrl("/chat/completions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages,
          tools: backendTools,
          temperature: 0.7,
          max_tokens: 512,
        }),
      });

      if (!response.ok) {
        throw new Error(`Local Brain Error: ${response.statusText}`);
      }

      const result = await response.json();

      // 6. Parsing Response (OpenAI Format)
      const choice = result.choices[0];
      const content = choice.message.content || "";

      // Check for JSON Tool Call (Simple regex heuristic for now)
      // The backend prompt specifically asks for: { "tool": "name", "arguments": {} }
      const toolCalls: any[] = [];

      try {
        // Look for JSON block if mixed with text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const potentialJson = jsonMatch ? jsonMatch[0] : content;

        if (
          potentialJson.includes('"tool"') &&
          potentialJson.includes('"arguments"')
        ) {
          const parsed = JSON.parse(potentialJson);
          if (parsed.tool && parsed.arguments) {
            toolCalls.push({
              id: "call_" + Date.now(),
              name: parsed.tool,
              args: parsed.arguments,
            });
          }
        }
      } catch (e) {
        // Not a JSON tool call, just text
      }

      return {
        text: toolCalls.length > 0 ? "" : content, // If tool call, suppress text to avoid confusion unless we implement reasoning display
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (e: any) {
      console.error("[Local Adapter] Chat Failed:", e);
      return {
        text: "I'm having trouble thinking locally. Please check if my Python backend is running.",
      };
    }
  }
}
