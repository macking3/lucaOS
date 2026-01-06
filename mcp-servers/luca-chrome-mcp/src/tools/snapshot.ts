/**
 * Snapshot Tools
 * AI-optimized DOM snapshots using accessibility tree
 * Inspired by Playwright MCP's approach
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager } from "../browser.js";
import { Page } from "playwright";

export const snapshotTools: Tool[] = [
  {
    name: "snapshot",
    description:
      "Get an AI-optimized snapshot of the page using accessibility tree. Returns structured elements with refs for interaction.",
    inputSchema: {
      type: "object",
      properties: {
        interactiveOnly: {
          type: "boolean",
          description:
            "Only return interactive elements (buttons, links, inputs). Default: false",
        },
        maxDepth: {
          type: "number",
          description: "Maximum depth to traverse (default: 10)",
        },
      },
    },
  },
  {
    name: "get_elements",
    description:
      "Get interactive elements on the page with their references for clicking/typing",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["all", "buttons", "links", "inputs", "selects", "textareas"],
          description: "Type of elements to get (default: all)",
        },
        visible: {
          type: "boolean",
          description: "Only visible elements (default: true)",
        },
      },
    },
  },
  {
    name: "find_element",
    description: "Find elements matching a text pattern or description",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text content to search for",
        },
        role: {
          type: "string",
          description: "ARIA role to filter by (button, link, textbox, etc.)",
        },
      },
      required: ["text"],
    },
  },
];

interface SnapshotNode {
  ref: string;
  role: string;
  name: string;
  value?: string;
  description?: string;
  children?: SnapshotNode[];
  interactive?: boolean;
  selector?: string;
}

let refCounter = 0;
const refToSelector: Map<string, string> = new Map();

/**
 * Build accessibility tree snapshot
 * Uses page evaluation to build a custom accessibility-like tree
 */
async function buildSnapshot(
  page: Page,
  interactiveOnly: boolean,
  maxDepth: number
): Promise<SnapshotNode[]> {
  refCounter = 0;
  refToSelector.clear();

  // Build our own accessibility-like tree using DOM traversal
  const snapshot = await page.evaluate(
    (options) => {
      function getRole(el: Element): string {
        const explicitRole = el.getAttribute("role");
        if (explicitRole) return explicitRole;

        const tagName = el.tagName.toLowerCase();
        const roleMap: Record<string, string> = {
          a: "link",
          button: "button",
          input:
            el.getAttribute("type") === "checkbox"
              ? "checkbox"
              : el.getAttribute("type") === "radio"
              ? "radio"
              : "textbox",
          select: "combobox",
          textarea: "textbox",
          img: "img",
          h1: "heading",
          h2: "heading",
          h3: "heading",
          nav: "navigation",
          main: "main",
          article: "article",
          section: "region",
          form: "form",
          ul: "list",
          ol: "list",
          li: "listitem",
        };
        return roleMap[tagName] || "generic";
      }

      function getName(el: Element): string {
        return (
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          (el as HTMLInputElement).placeholder ||
          el.textContent?.trim().slice(0, 100) ||
          ""
        );
      }

      function isInteractive(el: Element): boolean {
        const tag = el.tagName.toLowerCase();
        const role = getRole(el);
        const interactiveTags = ["a", "button", "input", "select", "textarea"];
        const interactiveRoles = [
          "button",
          "link",
          "textbox",
          "checkbox",
          "radio",
          "combobox",
        ];
        return (
          interactiveTags.includes(tag) ||
          interactiveRoles.includes(role) ||
          el.hasAttribute("onclick")
        );
      }

      function traverse(el: Element, depth: number, maxDepth: number): any {
        if (depth > maxDepth) return null;

        const role = getRole(el);
        const name = getName(el);
        const interactive = isInteractive(el);

        // Skip non-interesting nodes in interactive-only mode
        if (
          options.interactiveOnly &&
          !interactive &&
          el.children.length === 0
        ) {
          return null;
        }

        const node: any = { role, name, interactive };

        if ((el as HTMLInputElement).value) {
          node.value = (el as HTMLInputElement).value;
        }

        const children: any[] = [];
        for (const child of Array.from(el.children)) {
          const childNode = traverse(child, depth + 1, maxDepth);
          if (childNode) children.push(childNode);
        }
        if (children.length > 0) {
          node.children = children;
        }

        return node;
      }

      return traverse(document.body, 0, options.maxDepth);
    },
    { interactiveOnly, maxDepth }
  );

  if (!snapshot) {
    return [];
  }

  return processNode(snapshot, 0, maxDepth);
}

function processNode(
  node: any,
  depth: number,
  maxDepth: number
): SnapshotNode[] {
  if (depth > maxDepth) return [];

  const result: SnapshotNode[] = [];

  // Generate ref
  const ref = `e${refCounter++}`;

  // Check if interactive
  const interactiveRoles = [
    "button",
    "link",
    "textbox",
    "checkbox",
    "radio",
    "combobox",
    "listbox",
    "menuitem",
    "tab",
    "switch",
    "searchbox",
    "spinbutton",
    "slider",
  ];
  const isInteractive = interactiveRoles.includes(node.role);

  // Build selector hint based on name
  const selector = buildSelectorHint(node);
  if (selector) {
    refToSelector.set(ref, selector);
  }

  const snapshotNode: SnapshotNode = {
    ref,
    role: node.role,
    name: node.name || "",
    interactive: isInteractive,
  };

  if (node.value) {
    snapshotNode.value = node.value;
  }

  if (node.description) {
    snapshotNode.description = node.description;
  }

  if (selector) {
    snapshotNode.selector = selector;
  }

  // Process children
  if (node.children && node.children.length > 0) {
    const childNodes: SnapshotNode[] = [];
    for (const child of node.children) {
      childNodes.push(...processNode(child, depth + 1, maxDepth));
    }
    if (childNodes.length > 0) {
      snapshotNode.children = childNodes;
    }
  }

  result.push(snapshotNode);
  return result;
}

function buildSelectorHint(node: any): string | null {
  // Try to build a useful selector hint
  if (node.name) {
    switch (node.role) {
      case "button":
        return `button:has-text("${node.name.slice(0, 30)}")`;
      case "link":
        return `a:has-text("${node.name.slice(0, 30)}")`;
      case "textbox":
        return `[placeholder*="${node.name.slice(
          0,
          20
        )}"], input[aria-label*="${node.name.slice(0, 20)}"]`;
      default:
        return `[aria-label*="${node.name.slice(0, 20)}"]`;
    }
  }
  return null;
}

/**
 * Get interactive elements with simplified output
 */
async function getInteractiveElements(
  page: Page,
  type: string,
  visibleOnly: boolean
): Promise<
  Array<{ ref: string; role: string; text: string; selector: string }>
> {
  const selectors: Record<string, string> = {
    all: "button, a, input, select, textarea, [role='button'], [role='link'], [onclick]",
    buttons:
      "button, [role='button'], input[type='submit'], input[type='button']",
    links: "a[href], [role='link']",
    inputs:
      "input:not([type='hidden']):not([type='submit']):not([type='button'])",
    selects: "select",
    textareas: "textarea",
  };

  const selector = selectors[type] || selectors.all;
  const elements = await page.$$(selector);

  const results: Array<{
    ref: string;
    role: string;
    text: string;
    selector: string;
  }> = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    // Skip invisible elements if requested
    if (visibleOnly) {
      const isVisible = await element.isVisible();
      if (!isVisible) continue;
    }

    const ref = `e${i}`;
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    const text = await element.evaluate((el) => {
      return (
        el.textContent?.trim().slice(0, 50) ||
        (el as HTMLInputElement).placeholder ||
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        ""
      );
    });

    // Build a unique selector
    const uniqueSelector = await element.evaluate((el) => {
      if (el.id) return `#${el.id}`;
      if (el.className) {
        const classes = Array.from(el.classList).slice(0, 2).join(".");
        if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
      }
      return "";
    });

    results.push({
      ref,
      role: tagName,
      text,
      selector: uniqueSelector || `${tagName}:nth-of-type(${i + 1})`,
    });
  }

  return results;
}

/**
 * Find elements by text
 */
async function findElementsByText(
  page: Page,
  text: string,
  role?: string
): Promise<
  Array<{ ref: string; role: string; text: string; selector: string }>
> {
  let selector = `*:has-text("${text}")`;

  if (role) {
    const roleMap: Record<string, string> = {
      button: "button, [role='button']",
      link: "a, [role='link']",
      textbox: "input, textarea, [role='textbox']",
    };
    selector = roleMap[role] || `[role='${role}']`;
  }

  const elements = await page.$$(selector);
  const results: Array<{
    ref: string;
    role: string;
    text: string;
    selector: string;
  }> = [];

  for (let i = 0; i < Math.min(elements.length, 10); i++) {
    const element = elements[i];
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    const elementText = await element.evaluate(
      (el) => el.textContent?.trim().slice(0, 50) || ""
    );

    // Skip if text doesn't actually contain search term
    if (!elementText.toLowerCase().includes(text.toLowerCase())) continue;

    results.push({
      ref: `e${i}`,
      role: tagName,
      text: elementText,
      selector: `text="${text}"`,
    });
  }

  return results;
}

export async function handleSnapshotTool(
  name: string,
  args: Record<string, unknown>,
  browser: BrowserManager
): Promise<unknown> {
  const page = await browser.getActivePage();

  switch (name) {
    case "snapshot": {
      const interactiveOnly = (args.interactiveOnly as boolean) || false;
      const maxDepth = (args.maxDepth as number) || 10;

      const nodes = await buildSnapshot(page, interactiveOnly, maxDepth);

      return {
        url: page.url(),
        title: await page.title(),
        nodes,
        _hint:
          "Use the 'ref' or 'selector' values with click/type tools to interact with elements",
      };
    }

    case "get_elements": {
      const type = (args.type as string) || "all";
      const visible = args.visible !== false;

      const elements = await getInteractiveElements(page, type, visible);

      return {
        url: page.url(),
        elements,
        count: elements.length,
        _hint: "Use the 'selector' value with click/type tools",
      };
    }

    case "find_element": {
      const text = args.text as string;
      const role = args.role as string | undefined;

      const elements = await findElementsByText(page, text, role);

      return {
        query: text,
        elements,
        count: elements.length,
      };
    }

    default:
      throw new Error(`Unknown snapshot tool: ${name}`);
  }
}
