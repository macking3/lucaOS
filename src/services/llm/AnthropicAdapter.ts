import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";

export class AnthropicAdapter implements LLMProvider {
  name = "Anthropic Claude";
  private client: Anthropic;
  private modelName: string;

  constructor(
    apiKey: string,
    modelName: string = "claude-3-5-sonnet-20240620"
  ) {
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Since we are in Electron/Local environment
    });
    this.modelName = modelName;
  }

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const messages: any[] = [{ role: "user", content: prompt }];

    if (images && images.length > 0) {
      // Anthropic image format
      const imageContent = images.map((img) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: img,
        },
      }));
      messages[0].content = [...imageContent, { type: "text", text: prompt }];
    }

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: messages as any,
    });

    // Handle TextBlock
    const textBlock = response.content.find((c) => c.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text : "";
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string> {
    const stream = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const text = chunk.delta.text;
        fullText += text;
        onToken(text);
      }
    }
    return fullText;
  }

  // ... constructor ...

  async chat(
    messages: ChatMessage[],
    images?: string[],
    systemInstruction?: string,
    tools?: any[]
  ): Promise<LLMResponse> {
    // History mapping
    const anthropicMessages = messages.map((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.toolCallId || "unknown",
              content: msg.content,
            },
          ],
        };
      }
      if (msg.role === "model") {
        const content: any[] = [];
        if (msg.content) content.push({ type: "text", text: msg.content });
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            content.push({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: tc.args,
            });
          });
        }
        return { role: "assistant", content };
      }

      // User
      const content: any[] = [];
      // Append images if last message
      if (isLast && images && images.length > 0) {
        const imageContent = images.map((img) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: img,
          },
        }));
        content.push(...imageContent);
      }

      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }

      return {
        role: "user",
        content,
      };
    });

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      messages: anthropicMessages as any,
      system: systemInstruction,
      tools:
        tools && tools.length > 0
          ? (tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters, // Map FunctionDeclaration to input_schema?
              // Luca uses JSON Schema (Google format). Anthropic uses similar.
              // We might need deep compatibility check or casting. Assuming compatible for now.
            })) as any)
          : undefined,
    });

    // Handle TextBlock
    const textBlock = response.content.find((c) => c.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";

    // Handle ToolUse
    const toolUseBlocks = response.content.filter((c) => c.type === "tool_use");
    let toolCalls: ToolCall[] | undefined;

    if (toolUseBlocks.length > 0) {
      toolCalls = toolUseBlocks.map((block: any) => ({
        name: block.name,
        args: block.input,
        id: block.id,
      }));
    }

    return { text, toolCalls };
  }
}
