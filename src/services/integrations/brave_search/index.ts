import { Type } from "@google/genai";

// Brave Search API Integration
// Ingested from: https://github.com/Klavis-AI/klavis/tree/main/mcp_servers/brave_search
const BRAVE_API_BASE = "https://api.search.brave.com/res/v1";

export const tools = [
  {
    name: "brave_web_search",
    description:
      "Perform a web search using Brave Search API. Returns text results.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The search query." },
        count: {
          type: Type.NUMBER,
          description: "Number of results (1-20). Default 10.",
        },
        safesearch: {
          type: Type.STRING,
          enum: ["off", "moderate", "strict"],
          description: "Safe search setting.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "brave_image_search",
    description: "Perform an image search using Brave Search API.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The search query." },
        count: { type: Type.NUMBER, description: "Number of results." },
      },
      required: ["query"],
    },
  },
];

export async function handler(name: string, args: any): Promise<any> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("Missing BRAVE_API_KEY. Please add to .env");

  const headers = {
    Accept: "application/json",
    "X-Subscription-Token": apiKey,
  };

  if (name === "brave_web_search" || name === "brave_image_search") {
    const endpoint =
      name === "brave_web_search" ? "web/search" : "images/search";
    const url = new URL(`${BRAVE_API_BASE}/${endpoint}`);
    url.searchParams.append("q", args.query);
    if (args.count) url.searchParams.append("count", String(args.count));
    if (args.safesearch) url.searchParams.append("safesearch", args.safesearch);

    console.log(`[BRAVE] Searching: ${args.query} (${endpoint})`);

    try {
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`Brave API Error: ${res.statusText}`);
      const data = await res.json();

      // Clean up web content for easier reading
      if (name === "brave_web_search" && data.web?.results) {
        return data.web.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          description: r.description,
        }));
      }
      return data;
    } catch (e: any) {
      console.error("[BRAVE] Failed:", e);
      throw new Error(`Brave Search Failed: ${e.message}`);
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}
