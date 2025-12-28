import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";
import { getGenClient, setGenClient } from "../genAIClient";
import { GoogleGenAI } from "@google/genai";

export class GeminiAdapter implements LLMProvider {
  name = "Google Gemini";
  private client?: GoogleGenAI;
  private modelName: string = "gemini-2.0-flash"; // Match Backend Config

  constructor(apiKey: string, modelName: string = "gemini-2.0-flash") {
    this.modelName = modelName;
    // If a key is passed, we use it to initialize a fresh client.
    // Otherwise we fall back to the singleton via getGenClient() but we must type it.

    if (apiKey) {
      console.log(
        `[GeminiAdapter] Initializing with specific key (Length: ${apiKey.length})`
      );
      this.client = new GoogleGenAI({ apiKey });
      setGenClient(this.client);
    } else {
      // Lazy Init: Do NOT set `this.client` here.
      // Let chat() call getGenClient() at runtime when settings are ready.
      console.log(
        "[GeminiAdapter] No key provided. Deferring to runtime getGenClient()."
      );
    }
  }

  updateConfig(apiKey: string, modelName: string) {
    this.modelName = modelName;
    if (apiKey) {
      try {
        const client = new GoogleGenAI({ apiKey });
        setGenClient(client);
        this.client = client;
      } catch (e) {
        console.error("Failed to update GenAI config", e);
      }
    }
  }

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const client = this.client || getGenClient(); // Fallback if undefined

    // Construct parts
    const parts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
      parts.push(
        ...images.map((img) => ({
          inlineData: {
            data: img,
            mimeType: "image/jpeg",
          },
        }))
      );
    }

    const result = await client.models.generateContent({
      model: this.modelName,
      contents: [{ role: "user", parts }],
    });

    return result.text || "";
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string> {
    const client = this.client || getGenClient();
    const result = await client.models.generateContentStream({
      model: this.modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let fullText = "";
    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onToken(text);
      }
    }
    return fullText;
  }

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[]
  ): Promise<LLMResponse> {
    const client = this.client || getGenClient();

    // Map history to Google GenAI format (V1 Beta)
    const contents = messages.map((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        return {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: msg.name || "unknown",
                response: { result: msg.content },
              },
            },
          ],
        };
      }

      if (msg.role === "model") {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.args,
              },
            });
          });
        }
        // Safeguard: Ensure parts is never empty (causes API error)
        if (parts.length === 0) {
          console.warn(
            "[GeminiAdapter] Model message had empty parts, adding empty text"
          );
          parts.push({ text: "" });
        }
        return { role: "model", parts };
      }

      // Role: USER
      const parts: any[] = [{ text: msg.content || "" }];

      // Append images to LAST user message
      if (isLast && images && images.length > 0) {
        parts.push(
          ...images.map((img) => ({
            inlineData: {
              data: img,
              mimeType: "image/jpeg",
            },
          }))
        );
      }

      return {
        role: "user",
        parts,
      };
    });

    const config: any = {
      model: this.modelName,
      contents: contents,
      generationConfig: {
        temperature: 0.7,
      },
    };

    if (systemInstruction) {
      config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (tools && tools.length > 0) {
      config.tools = [{ functionDeclarations: tools }];
    }

    // Stateless call - clearer and often more robust
    const result = await client.models.generateContent(config);
    const text = result.text || "";

    // Handle function calls
    const calls = result.functionCalls;

    let toolCalls: ToolCall[] | undefined;
    if (calls && calls.length > 0) {
      toolCalls = calls.map((c: any) => ({
        name: c.name,
        args: c.args,
      }));
    }

    return { text, toolCalls };
  }
}
