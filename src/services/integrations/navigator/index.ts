import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import fs from "fs";
import path from "path";

import { authService } from "../../auth/authService.ts";

// --- TOOLS DEFINITION ---
export const tools: FunctionDeclaration[] = [
  {
    name: "visual_scrape_github",
    description:
      "Visually scrape a GitHub repository to extract source code structure and content. Bypasses API rate limits by reading the screen like a human.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        repoUrl: {
          type: Type.STRING,
          description:
            "The full GitHub URL (e.g. https://github.com/owner/repo).",
        },
        maxDepth: {
          type: Type.NUMBER,
          description: "Maximum folder depth to traverse. Default 3.",
        },
      },
      required: ["repoUrl"],
    },
  },
  {
    name: "navigator_login",
    description:
      "Launch a VISIBLE browser window to let the user log in to a service (e.g. WhatsApp, TikTok). Saves the session (cookies) for future autonomous use.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "The login URL (e.g. https://web.whatsapp.com).",
        },
        serviceName: {
          type: Type.STRING,
          description:
            "The name to save this session as (e.g. 'whatsapp', 'tiktok').",
        },
      },
      required: ["url", "serviceName"],
    },
  },
];

// --- HANDLER ---
let browserInstance: Browser | null = null;

async function getBrowser(headless: boolean = true) {
  if (browserInstance) {
    // If we need headful but have headless (or vice versa), we might need to restart.
    // For now, simplicity: if it's open, use it. But Login NEEDS headful.
    // If current is headless and we need headful, close and relaunch.
    // Checking if we can inspect process... simpler to just close if mode mismatch,
    // but 'isConnected' doesn't tell us mode.
    // Let's force close if we request headful (Login) to ensure visibility.
    if (!headless) {
      await browserInstance.close();
      browserInstance = null;
    }
  }

  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless });
  }
  return browserInstance;
}

export async function handler(name: string, args: any): Promise<any> {
  if (name === "visual_scrape_github") {
    const { repoUrl, maxDepth = 3 } = args;
    console.log(`[NAVIGATOR] Visual Scrape Initiated: ${repoUrl}`);

    // Try to load auth if available (e.g. for private repos if user logged in to github)
    const storedSession = await authService.getSession("github");

    // Launch browser (Headless)
    const browser = await getBrowser(true);

    // Context with Auth
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      storageState: storedSession || undefined,
    });

    const page = await context.newPage();

    // Result Storage
    let collectedFiles: { path: string; content: string }[] = [];
    const visitedUrls = new Set<string>();

    try {
      await page.goto(repoUrl, { timeout: 30000 });

      // 1. Get List of Files (BFS or simple crawl)
      // For simplicity in V1: We will grab the file tree if possible, or scrape the visible file list
      // GitHub has a "Go to file" button which opens a search/tree view.
      // Let's rely on the file list table on the main page and click directories.

      // RECURSIVE CRAWLER FUNCTION
      async function crawl(currentUrl: string, currentDepth: number) {
        if (currentDepth > maxDepth) return;
        if (visitedUrls.has(currentUrl)) return;
        visitedUrls.add(currentUrl);

        console.log(
          `[NAVIGATOR] Crawling: ${currentUrl} (Depth ${currentDepth})`
        );
        await page.goto(currentUrl);

        // Get all file row links
        // GitHub selectors are tricky, but generally: .react-directory-row
        // We want links that look like file paths.
        const links = await page.evaluate(() => {
          const rows = Array.from(
            document.querySelectorAll('a[href*="/blob/"], a[href*="/tree/"]')
          );
          return rows.map((a) => ({
            href: (a as HTMLAnchorElement).href,
            text: (a as HTMLAnchorElement).innerText,
            type: (a as HTMLAnchorElement).href.includes("/blob/")
              ? "file"
              : "dir",
          }));
        });

        // Deduplicate
        const uniqueLinks = Array.from(
          new Set(links.map((l) => JSON.stringify(l)))
        ).map((s) => JSON.parse(s));

        for (const link of uniqueLinks) {
          // Heuristic: Skip noisy files
          if (link.type === "file") {
            const ext = link.text.split(".").pop() || "";
            if (!["ts", "js", "json", "md", "py", "go", "rs"].includes(ext))
              continue;
            if (link.text.includes("test") || link.text.includes("lock"))
              continue;

            // Scrape File Content
            console.log(`[NAVIGATOR] Scraping File: ${link.text}`);
            const filePage = await context.newPage();
            await filePage.goto(link.href);

            // Click "Raw" button or get text content
            // Raw button usually has text "Raw"
            try {
              const rawUrl = await filePage.evaluate(() => {
                const btn = Array.from(document.querySelectorAll("a")).find(
                  (a) => a.innerText === "Raw"
                );
                return btn ? (btn as HTMLAnchorElement).href : null;
              });

              if (rawUrl) {
                await filePage.goto(rawUrl);
                const content = await filePage.evaluate(
                  () => document.body.innerText
                );
                collectedFiles.push({ path: link.text, content });
              }
            } catch (e) {
              console.error(`[NAVIGATOR] Failed to scrape ${link.text}`);
            }
            await filePage.close();
          } else if (link.type === "dir") {
            // Recurse
            // Ensure we stay within the repo
            if (link.href.startsWith(repoUrl)) {
              await crawl(link.href, currentDepth + 1);
            }
          }
        }
      }

      await crawl(repoUrl, 0);

      // Format Output for The Alchemist
      let output = "";
      for (const file of collectedFiles) {
        output += `--- FILE: ${file.path} ---\n${file.content}\n\n`;
      }

      console.log(
        `[NAVIGATOR] Scrape Complete. Found ${collectedFiles.length} files.`
      );
      return {
        success: true,
        fileCount: collectedFiles.length,
        result: output,
      };
    } catch (e: any) {
      console.error(`[NAVIGATOR] Error: ${e.message}`);
      return { success: false, error: e.message };
    } finally {
      await context.close();
      // Keep browser open for perf? Or close? Let's close context but keep browser.
    }
  }

  if (name === "navigator_login") {
    const { url, serviceName } = args;
    console.log(
      `[NAVIGATOR] Initiating Login Sequence for: ${serviceName} at ${url}`
    );

    // 1. Launch VISIBLE Browser
    const browser = await getBrowser(false); // Headful
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url);

      // 2. Wait for User Action
      console.log(
        `[NAVIGATOR] Login Window Open. Waiting for ${serviceName} session...`
      );
      // We wait for a "Signal" or just a timeout?
      // Let's give them 60 seconds to scan QR or login.
      // Better: Wait until they close the window? Or a specific cookie presence?
      // Simple V1: Wait 45 seconds.

      // Notify user via console logic (Agent will tell them)
      await page.waitForTimeout(45000);

      // 3. Capture State
      const state = await context.storageState();
      await authService.saveSession(serviceName, state);

      return {
        success: true,
        message: `Session for ${serviceName} saved successfully. You can now close the window.`,
      };
    } catch (e: any) {
      console.error(`[NAVIGATOR] Login Failed: ${e.message}`);
      return { success: false, error: e.message };
    } finally {
      await context.close();
      await browser.close(); // Close full browser after login to reset state
      browserInstance = null;
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}
