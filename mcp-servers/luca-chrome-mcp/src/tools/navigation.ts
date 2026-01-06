/**
 * Navigation Tools
 * URL navigation, tab management, browser history navigation
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager } from "../browser.js";

export const navigationTools: Tool[] = [
  {
    name: "navigate",
    description: "Navigate to a URL in the browser",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to",
        },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle"],
          description: "When to consider navigation complete (default: load)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_tabs",
    description: "Get list of all open browser tabs with their URLs and titles",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "switch_tab",
    description: "Switch to a different browser tab by index or URL pattern",
    inputSchema: {
      type: "object",
      properties: {
        tab: {
          type: ["number", "string"],
          description: "Tab index (0-based) or URL pattern to match",
        },
      },
      required: ["tab"],
    },
  },
  {
    name: "new_tab",
    description: "Open a new browser tab, optionally navigating to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Optional URL to navigate to in the new tab",
        },
      },
    },
  },
  {
    name: "close_tab",
    description: "Close a browser tab by index or URL pattern",
    inputSchema: {
      type: "object",
      properties: {
        tab: {
          type: ["number", "string"],
          description: "Tab index (0-based) or URL pattern to match",
        },
      },
      required: ["tab"],
    },
  },
  {
    name: "go_back",
    description: "Navigate back in browser history",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "go_forward",
    description: "Navigate forward in browser history",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "reload",
    description: "Reload the current page",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handleNavigationTool(
  name: string,
  args: Record<string, unknown>,
  browser: BrowserManager
): Promise<unknown> {
  const page = await browser.getActivePage();

  switch (name) {
    case "navigate": {
      const url = args.url as string;
      const waitUntil =
        (args.waitUntil as "load" | "domcontentloaded" | "networkidle") ||
        "load";
      await page.goto(url, { waitUntil });
      return {
        success: true,
        url: page.url(),
        title: await page.title(),
      };
    }

    case "get_tabs": {
      const pages = await browser.getAllPages();
      const tabs = await Promise.all(
        pages.map(async (p, index) => ({
          index,
          url: p.url(),
          title: await p.title(),
          active: p === page,
        }))
      );
      return { tabs };
    }

    case "switch_tab": {
      const result = await browser.switchToPage(args.tab as number | string);
      if (result) {
        return {
          success: true,
          url: result.url(),
          title: await result.title(),
        };
      }
      return { success: false, error: "Tab not found" };
    }

    case "new_tab": {
      const newPage = await browser.newPage();
      if (args.url) {
        await newPage.goto(args.url as string);
      }
      return {
        success: true,
        url: newPage.url(),
        title: await newPage.title(),
      };
    }

    case "close_tab": {
      const closed = await browser.closePage(args.tab as number | string);
      return { success: closed };
    }

    case "go_back": {
      await page.goBack();
      return {
        success: true,
        url: page.url(),
        title: await page.title(),
      };
    }

    case "go_forward": {
      await page.goForward();
      return {
        success: true,
        url: page.url(),
        title: await page.title(),
      };
    }

    case "reload": {
      await page.reload();
      return {
        success: true,
        url: page.url(),
        title: await page.title(),
      };
    }

    default:
      throw new Error(`Unknown navigation tool: ${name}`);
  }
}
