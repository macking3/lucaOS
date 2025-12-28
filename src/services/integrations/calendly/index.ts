import { Type } from "@google/genai";

// Calendly API Integration
// Ingested from: https://github.com/Klavis-AI/klavis/tree/main/mcp_servers/calendly
const CALENDLY_API_BASE = "https://api.calendly.com";

export const tools = [
  {
    name: "calendly_get_user_info",
    description: "Get current user's Calendly profile information.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "calendly_list_events",
    description: "List scheduled events for the current user.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          enum: ["active", "canceled"],
          description: "Filter by status.",
        },
        count: {
          type: Type.NUMBER,
          description: "Number of events (max 100).",
        },
      },
    },
  },
  {
    name: "calendly_list_event_types",
    description: "List available event types.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        active: { type: Type.BOOLEAN, description: "Filter by active status." },
      },
    },
  },
];

export async function handler(name: string, args: any): Promise<any> {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) throw new Error("Missing CALENDLY_API_KEY. Please add to .env");

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Helper to get current user (needed for listing events usually)
  async function getCurrentUser() {
    const res = await fetch(`${CALENDLY_API_BASE}/users/me`, { headers });
    if (!res.ok)
      throw new Error(`Calendly User Info Failed: ${res.statusText}`);
    return await res.json();
  }

  if (name === "calendly_get_user_info") {
    return await getCurrentUser();
  }

  if (name === "calendly_list_events") {
    const user = await getCurrentUser();
    const userUri = user.resource.uri;

    const url = new URL(`${CALENDLY_API_BASE}/scheduled_events`);
    url.searchParams.append("user", userUri);
    if (args.status) url.searchParams.append("status", args.status);
    if (args.count) url.searchParams.append("count", String(args.count));

    const res = await fetch(url.toString(), { headers });
    if (!res.ok)
      throw new Error(`Calendly List Events Failed: ${res.statusText}`);
    return await res.json();
  }

  if (name === "calendly_list_event_types") {
    const user = await getCurrentUser();
    const userUri = user.resource.uri;

    const url = new URL(`${CALENDLY_API_BASE}/event_types`);
    url.searchParams.append("user", userUri);
    if (args.active !== undefined)
      url.searchParams.append("active", String(args.active));

    const res = await fetch(url.toString(), { headers });
    if (!res.ok)
      throw new Error(`Calendly Event Types Failed: ${res.statusText}`);
    return await res.json();
  }

  throw new Error(`Unknown tool: ${name}`);
}
