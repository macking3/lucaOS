import OpenAI from "openai";
import { LLMProvider, LLMResponse, ToolCall, ChatMessage } from "./LLMProvider";

export class OpenAIAdapter implements LLMProvider {
  name = "OpenAI GPT";
  private client: OpenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gpt-4o", baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL, // Supports xAI or other compatible endpoints
      dangerouslyAllowBrowser: true,
    });
    this.modelName = modelName;
  }

  async generateContent(prompt: string, images?: string[]): Promise<string> {
    const messages: any[] = [{ role: "user", content: prompt }];

    if (images && images.length > 0) {
      const contentArray: any[] = [{ type: "text", text: prompt }];
      images.forEach((img) => {
        contentArray.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${img}`,
          },
        });
      });
      messages[0].content = contentArray;
    }

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: messages as any,
    });

    return response.choices[0].message.content || "";
  }

  async streamContent(
    prompt: string,
    onToken: (text: string) => void
  ): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        onToken(content);
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
    const openAIMessages = messages.map((msg, index) => {
      const isLast = index === messages.length - 1;

      if (msg.role === "tool") {
        return {
          role: "tool",
          tool_call_id: msg.toolCallId,
          content: msg.content,
        };
      }
      if (msg.role === "model") {
        const m: any = { role: "assistant" };
        if (msg.content) m.content = msg.content;
        if (msg.toolCalls) {
          m.tool_calls = msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          }));
        }
        return m;
      }

      // User
      const contentArray: any[] = [];
      if (msg.content) contentArray.push({ type: "text", text: msg.content });

      if (isLast && images && images.length > 0) {
        images.forEach((img) => {
          contentArray.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${img}`,
            },
          });
        });
      }

      return {
        role: msg.role,
        content: contentArray,
      };
    });

    if (systemInstruction) {
      openAIMessages.unshift({ role: "system", content: systemInstruction });
    }

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: openAIMessages as any,
      tool_choice: tools && tools.length > 0 ? "auto" : undefined,
      tools:
        tools && tools.length > 0
          ? (tools.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })) as any)
          : undefined,
    });

    const choice = response.choices[0];
    const text = choice.message.content || "";
    const toolC = choice.message.tool_calls;

    let toolCalls: ToolCall[] | undefined;
    if (toolC && toolC.length > 0) {
      toolCalls = toolC.map((tc: any) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
        id: tc.id,
      }));
    }

    return { text, toolCalls };
  }
}
