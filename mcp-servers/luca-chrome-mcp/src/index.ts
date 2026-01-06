#!/usr/bin/env node
/**
 * Luca Chrome MCP Server
 * AI-powered Chrome browser control via Model Context Protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager } from "./browser.js";
import { tools, handleToolCall } from "./tools/index.js";

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  profile: "",
  connect: "",
  headless: false,
};

for (const arg of args) {
  if (arg.startsWith("--profile=")) {
    config.profile = arg.split("=")[1];
  } else if (arg.startsWith("--connect=")) {
    config.connect = arg.split("=")[1];
  } else if (arg === "--headless") {
    config.headless = true;
  }
}

// Environment variable overrides
config.profile = process.env.CHROME_PROFILE_PATH || config.profile;
config.connect = process.env.CHROME_WS_ENDPOINT || config.connect;

// Initialize browser manager
const browserManager = new BrowserManager(config);

// Create MCP server
const server = new Server(
  {
    name: "luca-chrome-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(name, args || {}, browserManager);
    return {
      content: [
        {
          type: "text",
          text:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Cleanup on exit
process.on("SIGINT", async () => {
  await browserManager.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await browserManager.close();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[luca-chrome-mcp] Server started");
}

main().catch((error) => {
  console.error("[luca-chrome-mcp] Fatal error:", error);
  process.exit(1);
});
