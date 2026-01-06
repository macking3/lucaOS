/**
 * MCP Tools Index
 * Exports all available tools and the handler
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager } from "../browser.js";
import { navigationTools, handleNavigationTool } from "./navigation.js";
import { contentTools, handleContentTool } from "./content.js";
import { interactionTools, handleInteractionTool } from "./interaction.js";
import { snapshotTools, handleSnapshotTool } from "./snapshot.js";

// Combine all tools
export const tools: Tool[] = [
  ...navigationTools,
  ...contentTools,
  ...interactionTools,
  ...snapshotTools,
];

// Route tool calls to appropriate handler
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  browser: BrowserManager
): Promise<unknown> {
  // Navigation tools
  if (navigationTools.some((t) => t.name === name)) {
    return handleNavigationTool(name, args, browser);
  }

  // Content tools
  if (contentTools.some((t) => t.name === name)) {
    return handleContentTool(name, args, browser);
  }

  // Interaction tools
  if (interactionTools.some((t) => t.name === name)) {
    return handleInteractionTool(name, args, browser);
  }

  // Snapshot tools
  if (snapshotTools.some((t) => t.name === name)) {
    return handleSnapshotTool(name, args, browser);
  }

  throw new Error(`Unknown tool: ${name}`);
}
