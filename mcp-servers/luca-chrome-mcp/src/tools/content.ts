/**
 * Content Tools
 * Screenshots, HTML extraction, JavaScript execution
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager } from "../browser.js";

export const contentTools: Tool[] = [
  {
    name: "screenshot",
    description: "Take a screenshot of the current page or a specific element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector for element to screenshot (optional, full page if not provided)",
        },
        fullPage: {
          type: "boolean",
          description: "Capture full scrollable page (default: false)",
        },
      },
    },
  },
  {
    name: "get_html",
    description: "Get the HTML content of the page or a specific element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector for element (optional, full page if not provided)",
        },
        outer: {
          type: "boolean",
          description: "Include outer HTML (default: true)",
        },
      },
    },
  },
  {
    name: "get_text",
    description: "Get the visible text content of the page or element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector for element (optional, full page if not provided)",
        },
      },
    },
  },
  {
    name: "execute_js",
    description: "Execute JavaScript code on the page and return the result",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "JavaScript code to execute. Use 'return' to return a value.",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "get_url",
    description: "Get the current page URL and title",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_console",
    description: "Get recent console messages from the page",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of messages to return (default: 50)",
        },
      },
    },
  },
];

// Store console messages per page
const consoleMessages: Map<
  string,
  Array<{ type: string; text: string; time: number }>
> = new Map();

export async function handleContentTool(
  name: string,
  args: Record<string, unknown>,
  browser: BrowserManager
): Promise<unknown> {
  const page = await browser.getActivePage();

  // Setup console listener if not already
  const pageId = page.url();
  if (!consoleMessages.has(pageId)) {
    consoleMessages.set(pageId, []);
    page.on("console", (msg) => {
      const messages = consoleMessages.get(pageId) || [];
      messages.push({
        type: msg.type(),
        text: msg.text(),
        time: Date.now(),
      });
      // Keep only last 100 messages
      if (messages.length > 100) {
        messages.shift();
      }
    });
  }

  switch (name) {
    case "screenshot": {
      const options: any = {};

      if (args.fullPage) {
        options.fullPage = true;
      }

      let buffer: Buffer;
      if (args.selector) {
        const element = await page.$(args.selector as string);
        if (!element) {
          return {
            success: false,
            error: `Element not found: ${args.selector}`,
          };
        }
        buffer = await element.screenshot();
      } else {
        buffer = await page.screenshot(options);
      }

      return {
        success: true,
        image: buffer.toString("base64"),
        mimeType: "image/png",
      };
    }

    case "get_html": {
      const outer = args.outer !== false;

      if (args.selector) {
        const element = await page.$(args.selector as string);
        if (!element) {
          return {
            success: false,
            error: `Element not found: ${args.selector}`,
          };
        }
        const html = outer
          ? await element.evaluate((el) => el.outerHTML)
          : await element.evaluate((el) => el.innerHTML);
        return { success: true, html };
      }

      const html = await page.content();
      return { success: true, html };
    }

    case "get_text": {
      if (args.selector) {
        const element = await page.$(args.selector as string);
        if (!element) {
          return {
            success: false,
            error: `Element not found: ${args.selector}`,
          };
        }
        const text = await element.innerText();
        return { success: true, text };
      }

      const text = await page.evaluate(() => document.body.innerText);
      return { success: true, text };
    }

    case "execute_js": {
      const code = args.code as string;
      try {
        const result = await page.evaluate((code) => {
          return eval(code);
        }, code);
        return { success: true, result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    case "get_url": {
      return {
        url: page.url(),
        title: await page.title(),
      };
    }

    case "get_console": {
      const limit = (args.limit as number) || 50;
      const messages = consoleMessages.get(pageId) || [];
      return {
        messages: messages.slice(-limit),
      };
    }

    default:
      throw new Error(`Unknown content tool: ${name}`);
  }
}
