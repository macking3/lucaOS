/**
 * Interaction Tools
 * Click, type, select, keyboard actions
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager } from "../browser.js";

export const interactionTools: Tool[] = [
  {
    name: "click",
    description:
      "Click on an element identified by CSS selector or coordinates",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the element to click",
        },
        x: {
          type: "number",
          description: "X coordinate to click (if not using selector)",
        },
        y: {
          type: "number",
          description: "Y coordinate to click (if not using selector)",
        },
        button: {
          type: "string",
          enum: ["left", "right", "middle"],
          description: "Mouse button to use (default: left)",
        },
        doubleClick: {
          type: "boolean",
          description: "Perform double click (default: false)",
        },
      },
    },
  },
  {
    name: "type",
    description: "Type text into an input field or the focused element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector for the input element (optional if element is focused)",
        },
        text: {
          type: "string",
          description: "Text to type",
        },
        clear: {
          type: "boolean",
          description: "Clear the field before typing (default: false)",
        },
        delay: {
          type: "number",
          description: "Delay between keystrokes in ms (default: 0)",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "select",
    description: "Select an option from a dropdown/select element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the select element",
        },
        value: {
          type: "string",
          description: "Option value to select",
        },
        label: {
          type: "string",
          description: "Option label/text to select (alternative to value)",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "keyboard",
    description: "Send keyboard shortcuts or special keys",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Key to press (e.g., 'Enter', 'Tab', 'Escape', 'Control+a')",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "hover",
    description: "Hover over an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the element to hover",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "scroll",
    description: "Scroll the page or an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector for element to scroll (optional, scrolls page if not provided)",
        },
        direction: {
          type: "string",
          enum: ["up", "down", "left", "right"],
          description: "Direction to scroll",
        },
        amount: {
          type: "number",
          description: "Pixels to scroll (default: 300)",
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "wait",
    description: "Wait for an element or a specified time",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to wait for",
        },
        timeout: {
          type: "number",
          description: "Maximum time to wait in ms (default: 30000)",
        },
        state: {
          type: "string",
          enum: ["visible", "hidden", "attached", "detached"],
          description: "State to wait for (default: visible)",
        },
      },
    },
  },
  {
    name: "focus",
    description: "Focus on an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for the element to focus",
        },
      },
      required: ["selector"],
    },
  },
];

export async function handleInteractionTool(
  name: string,
  args: Record<string, unknown>,
  browser: BrowserManager
): Promise<unknown> {
  const page = await browser.getActivePage();

  switch (name) {
    case "click": {
      const button = (args.button as "left" | "right" | "middle") || "left";
      const clickCount = args.doubleClick ? 2 : 1;

      if (args.selector) {
        await page.click(args.selector as string, { button, clickCount });
      } else if (typeof args.x === "number" && typeof args.y === "number") {
        await page.mouse.click(args.x, args.y, { button, clickCount });
      } else {
        return {
          success: false,
          error: "Either selector or x,y coordinates required",
        };
      }
      return { success: true };
    }

    case "type": {
      const text = args.text as string;
      const delay = (args.delay as number) || 0;

      if (args.selector) {
        if (args.clear) {
          await page.fill(args.selector as string, "");
        }
        await page.type(args.selector as string, text, { delay });
      } else {
        await page.keyboard.type(text, { delay });
      }
      return { success: true };
    }

    case "select": {
      const selector = args.selector as string;

      if (args.value) {
        await page.selectOption(selector, { value: args.value as string });
      } else if (args.label) {
        await page.selectOption(selector, { label: args.label as string });
      } else {
        return { success: false, error: "Either value or label required" };
      }
      return { success: true };
    }

    case "keyboard": {
      const key = args.key as string;
      await page.keyboard.press(key);
      return { success: true };
    }

    case "hover": {
      await page.hover(args.selector as string);
      return { success: true };
    }

    case "scroll": {
      const amount = (args.amount as number) || 300;
      const direction = args.direction as string;

      let deltaX = 0;
      let deltaY = 0;

      switch (direction) {
        case "down":
          deltaY = amount;
          break;
        case "up":
          deltaY = -amount;
          break;
        case "right":
          deltaX = amount;
          break;
        case "left":
          deltaX = -amount;
          break;
      }

      if (args.selector) {
        await page.$eval(
          args.selector as string,
          (el, { dx, dy }) => el.scrollBy(dx, dy),
          { dx: deltaX, dy: deltaY }
        );
      } else {
        await page.mouse.wheel(deltaX, deltaY);
      }
      return { success: true };
    }

    case "wait": {
      const timeout = (args.timeout as number) || 30000;
      const state =
        (args.state as "visible" | "hidden" | "attached" | "detached") ||
        "visible";

      if (args.selector) {
        await page.waitForSelector(args.selector as string, { timeout, state });
      } else {
        await page.waitForTimeout(timeout);
      }
      return { success: true };
    }

    case "focus": {
      await page.focus(args.selector as string);
      return { success: true };
    }

    default:
      throw new Error(`Unknown interaction tool: ${name}`);
  }
}
