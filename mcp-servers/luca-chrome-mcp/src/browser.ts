/**
 * Browser Manager
 * Handles Playwright browser lifecycle and page management
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import path from "path";
import os from "os";
import fs from "fs";

export interface BrowserConfig {
  profile: string;
  connect: string;
  headless: boolean;
}

export class BrowserManager {
  private config: BrowserConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map();
  private activePage: Page | null = null;

  constructor(config: BrowserConfig) {
    this.config = config;
  }

  /**
   * Get or create the browser instance
   */
  async getBrowser(): Promise<BrowserContext> {
    if (this.context) return this.context;

    // Option 1: Connect to existing Chrome via CDP
    if (this.config.connect) {
      console.error(`[Browser] Connecting to ${this.config.connect}`);
      this.browser = await chromium.connectOverCDP(this.config.connect);
      const contexts = this.browser.contexts();
      this.context = contexts[0] || (await this.browser.newContext());
      return this.context;
    }

    // Option 2: Launch with user profile
    const userDataDir =
      this.config.profile ||
      this.detectLucaProfile() ||
      this.getDefaultProfilePath();

    console.error(
      `[Browser] Launching with profile: ${userDataDir || "clean"}`
    );

    if (userDataDir && fs.existsSync(userDataDir)) {
      // Persistent context with user profile
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless: this.config.headless,
        channel: "chrome", // Use real Chrome if available
        args: [
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-blink-features=AutomationControlled", // Stealth
        ],
        viewport: { width: 1280, height: 720 },
      });
    } else {
      // Clean browser
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          "--disable-blink-features=AutomationControlled", // Stealth
        ],
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
    }

    return this.context;
  }

  /**
   * Get the active page or create one
   */
  async getActivePage(): Promise<Page> {
    const context = await this.getBrowser();

    if (this.activePage && !this.activePage.isClosed()) {
      return this.activePage;
    }

    const pages = context.pages();
    if (pages.length > 0) {
      this.activePage = pages[0];
    } else {
      this.activePage = await context.newPage();
    }

    return this.activePage;
  }

  /**
   * Get all pages
   */
  async getAllPages(): Promise<Page[]> {
    const context = await this.getBrowser();
    return context.pages();
  }

  /**
   * Create a new page
   */
  async newPage(): Promise<Page> {
    const context = await this.getBrowser();
    const page = await context.newPage();
    this.activePage = page;
    return page;
  }

  /**
   * Switch to a page by index or URL pattern
   */
  async switchToPage(identifier: number | string): Promise<Page | null> {
    const pages = await this.getAllPages();

    if (typeof identifier === "number") {
      if (identifier >= 0 && identifier < pages.length) {
        this.activePage = pages[identifier];
        await this.activePage.bringToFront();
        return this.activePage;
      }
    } else {
      // Find by URL pattern
      const page = pages.find((p) => p.url().includes(identifier));
      if (page) {
        this.activePage = page;
        await page.bringToFront();
        return page;
      }
    }

    return null;
  }

  /**
   * Close a page
   */
  async closePage(identifier: number | string): Promise<boolean> {
    const pages = await this.getAllPages();
    let pageToClose: Page | undefined;

    if (typeof identifier === "number") {
      pageToClose = pages[identifier];
    } else {
      pageToClose = pages.find((p) => p.url().includes(identifier));
    }

    if (pageToClose) {
      await pageToClose.close();
      if (this.activePage === pageToClose) {
        const remaining = await this.getAllPages();
        this.activePage = remaining[0] || null;
      }
      return true;
    }
    return false;
  }

  /**
   * Detect Luca's imported Chrome profile
   */
  private detectLucaProfile(): string | null {
    const lucaProfile = path.join(
      os.homedir(),
      "Documents",
      "Luca",
      "browser-profile"
    );
    if (fs.existsSync(lucaProfile)) {
      return lucaProfile;
    }
    return null;
  }

  /**
   * Get default Chrome profile path for current OS
   */
  private getDefaultProfilePath(): string | null {
    const platform = process.platform;
    const home = os.homedir();

    const paths: Record<string, string> = {
      darwin: path.join(
        home,
        "Library",
        "Application Support",
        "Google",
        "Chrome"
      ),
      win32: path.join(
        home,
        "AppData",
        "Local",
        "Google",
        "Chrome",
        "User Data"
      ),
      linux: path.join(home, ".config", "google-chrome"),
    };

    const chromePath = paths[platform];
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
    return null;
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.activePage = null;
    this.pages.clear();
  }
}
