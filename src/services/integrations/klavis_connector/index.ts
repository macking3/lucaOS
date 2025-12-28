import { Type } from "@google/genai";

// Klavis AI Platform Integration (PRODUCTION)
const KLAVIS_API_BASE = "https://api.klavis.ai/v1";

export const tools = [
  {
    name: "klavis_discover_tools",
    description:
      "Connect to the Klavis AI platform and list available hosted MCP tools.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "Optional category filter.",
        },
      },
    },
  },
  {
    name: "klavis_execute_tool",
    description: "Execute a tool hosted on the Klavis AI platform.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        toolName: { type: Type.STRING, description: "Tool name to execute." },
        payload: { type: Type.OBJECT, description: "Tool arguments." },
      },
      required: ["toolName", "payload"],
    },
  },
];

export async function handler(name: string, args: any): Promise<any> {
  const apiKey = process.env.KLAVIS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing KLAVIS_API_KEY environment variable. Please add it to your .env file."
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (name === "klavis_discover_tools") {
    console.log(`[KLAVIS] Connecting to Platform...`);
    try {
      const res = await fetch(`${KLAVIS_API_BASE}/tools`, { headers });
      if (!res.ok) throw new Error(`Klavis API Error: ${res.statusText}`);

      const data = await res.json();
      return {
        status: "connected",
        count: data.tools?.length || 0,
        tools: data.tools,
      };
    } catch (e: any) {
      console.error("[KLAVIS] Discovery Failed:", e);
      throw new Error(`Klavis Connection Failed: ${e.message}`);
    }
  }

  if (name === "klavis_execute_tool") {
    console.log(`[KLAVIS] Executing ${args.toolName}...`);
    try {
      const res = await fetch(`${KLAVIS_API_BASE}/execute`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          tool: args.toolName,
          arguments: args.payload,
        }),
      });

      if (!res.ok) throw new Error(`Execution Failed: ${res.statusText}`);
      return await res.json();
    } catch (e: any) {
      console.error("[KLAVIS] Execution Error:", e);
      throw new Error(`Tool Execution Failed: ${e.message}`);
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}
