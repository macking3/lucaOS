import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { getSnapshotScript } from "./snapshotScript.js";
import { getLucaBrowserProfilePath } from "./chromeProfileService.js";

class WebSurferService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
    this.usingUserProfile = false;
  }

  async init(options = {}) {
    if (this.isInitialized) return;
    
    console.log("[WebSurfer] Initializing Playwright...");
    
    // Check for imported Chrome profile
    const userProfilePath = getLucaBrowserProfilePath();
    const useUserProfile = options.useUserProfile !== false && userProfilePath;
    
    const launchOptions = { 
      headless: options.headless !== undefined ? options.headless : true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    // If user profile is available, use persistent context
    if (useUserProfile) {
      console.log(`[WebSurfer] Using Chrome profile from: ${userProfilePath}`);
      this.context = await chromium.launchPersistentContext(userProfilePath, {
        ...launchOptions,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
      });
      this.page = this.context.pages()[0] || await this.context.newPage();
      this.browser = null; // Persistent context doesn't expose browser
      this.usingUserProfile = true;
    } else {
      // Standard clean browser
      this.browser = await chromium.launch(launchOptions);
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
      });
      this.page = await this.context.newPage();
      this.usingUserProfile = false;
    }
    
    this.isInitialized = true;
    console.log(`[WebSurfer] Ready. ${this.usingUserProfile ? '(Using your Chrome sessions)' : '(Clean browser)'}`);
  }

  async ensureReady() {
    if (!this.isInitialized) await this.init();
  }

  async _injectSnapshotScript() {
      // Inject the AISnapshot script if not present
      const isPresent = await this.page.evaluate(() => typeof window.__devBrowser_getAISnapshot === 'function');
      if (!isPresent) {
          const scriptContent = getSnapshotScript();
          await this.page.evaluate(scriptContent);
      }
  }

  async browse(url) {
    await this.ensureReady();
    console.log(`[WebSurfer] Navigating to ${url}`);
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this._injectSnapshotScript();

      const snapshot = await this.page.evaluate(() => window.__devBrowser_getAISnapshot());
      const title = await this.page.title();
      const content = await this.page.content();

      return { 
          title, 
          url: this.page.url(), 
          snapshot, // The YAML Accessibility Tree
          content: this._cleanHtml(content) 
      };
    } catch (error) {
      console.error(`[WebSurfer] Browse Error: ${error.message}`);
      throw error;
    }
  }
  
  // Specific Scraper: Market News
  async getMarketNews(sector = "GENERAL") {
    await this.ensureReady();
    
    // Define Sources per Sector
    const SOURCES = {
        "CRYPTO": [
            { name: "CoinGecko", url: "https://www.coingecko.com/en/news", type: "coingecko" },
            { name: "CoinDesk", url: "https://www.coindesk.com/", type: "coindesk" }
        ],
        "FOREX": [
            { name: "DailyFX", url: "https://www.dailyfx.com/breakouts", type: "generic" },
            { name: "ForexLive", url: "https://www.forexlive.com/", type: "generic" }
        ],
        "TECH": [
            { name: "TechCrunch", url: "https://techcrunch.com/", type: "techcrunch" },
            { name: "The Verge", url: "https://www.theverge.com/tech", type: "generic" }
        ],
        "GENERAL": [
            { name: "Yahoo Finance", url: "https://finance.yahoo.com/topic/stock-market-news", type: "yahoo" },
            { name: "CNBC", url: "https://www.cnbc.com/world/", type: "generic" },
            { name: "Reuters", url: "https://www.reuters.com/business/finance/", type: "generic" }
        ]
    };

    const targetSources = SOURCES[sector.toUpperCase()] || SOURCES["GENERAL"];
    console.log(`[WebSurfer] Fetching ${sector} News from ${targetSources.length} sources...`);
    
    let allNewsItems = [];

    // Parallel Scrape (limited concurrency to avoid detection/resource spikes)
    // For now, sequential to ensure stability of the single browser context
    for (const source of targetSources) {
        console.log(`[WebSurfer] Scraping ${source.name}...`);
        try {
            await this.page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.page.waitForTimeout(1000); // polite delay

            const content = await this.page.content();
            const $ = cheerio.load(content);
            let items = [];

            if (source.type === "coingecko") {
                 $('a.tw-text-base').each((i, el) => {
                    if (i > 5) return;
                    const title = $(el).text().trim();
                    let link = $(el).attr('href');
                    if (link && !link.startsWith('http')) link = `https://www.coingecko.com${link}`;
                    if (title) items.push({ title, url: link, source: source.name, summary: "" });
                 });
            } else if (source.type === "coindesk") {
                $('a.card-title').each((i, el) => {
                    if (i > 5) return;
                    const title = $(el).text().trim();
                    const link = $(el).attr('href');
                    if (title && link) items.push({ title, url: `https://www.coindesk.com${link}`, source: source.name });
                });
            } else if (source.type === "techcrunch") {
                 $('h2.has-link-color a').each((i, el) => {
                     if (i > 5) return;
                     const title = $(el).text().trim();
                     const link = $(el).attr('href');
                     if (title) items.push({ title, url: link, source: source.name, summary: "" });
                 });
            } else if (source.type === "yahoo") {
                 $('h3').each((i, el) => {
                    if(i > 5) return;
                    const title = $(el).text();
                    let link = $(el).find('a').attr('href') || $(el).closest('a').attr('href');
                    if (title && link) {
                        if (!link.startsWith('http')) link = `https://finance.yahoo.com${link}`;
                        items.push({ title, url: link, summary: "", source: source.name });
                    }
                });
            } else {
                 // Generic Fallback
                 items = await this._genericNewsExtraction($);
                 items = items.map(i => ({ ...i, source: source.name }));
            }
            
            allNewsItems = [...allNewsItems, ...items];

        } catch (e) {
            console.error(`[WebSurfer] Failed to scrape ${source.name}: ${e.message}`);
        }
    }
    
    // Deduplicate based on similar titles (simplified)
    const uniqueItems = [];
    const titles = new Set();
    for (const item of allNewsItems) {
        // Simple fuzzy dedup: ignore exact title matches or very short titles
        if (!titles.has(item.title) && item.title.length > 20) {
            titles.add(item.title);
            uniqueItems.push(item);
        }
    }

    return uniqueItems.slice(0, 20); // Return top 20 aggregated items
  }

  // Specific Scraper: Polymarket
  async searchPolymarket(query) {
    await this.ensureReady();
    const targetUrl = `https://polymarket.com/?q=${encodeURIComponent(query)}`;
    console.log(`[WebSurfer] Searching Polymarket: ${query}`);
    
    try {
        await this.page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 }); 
        
        // Polymarket is a Client-Side Rendered React App.
        // We wait for the market cards.
        try {
            await this.page.waitForSelector('a[href^="/event/"]', { timeout: 5000 });
        } catch (e) {
            console.log("No specific market links found immediately.");
        }

        const markets = [];
        
        // Evaluate in browser context to get shadow DOM or dynamic elements reliably
        // BUT using cheerio on page.content() is often enough for hydration
        const content = await this.page.content();
        const $ = cheerio.load(content);
        
        // Polymarket classes are often messy/minified (e.g. "c-market-card"). 
        // We look for anchor tags that look like market links.
        // href starts with "/event/" or "/market/"
        
        $('a[href^="/event/"]').each((i, el) => {
            if (i > 8) return;
            const link = $(el).attr('href');
            const title = $(el).find('div').first().text() || $(el).text();
            
            // Try to find percentages nearby
            // This is heuristic and might break if UI changes
            const textContent = $(el).text();
            
            markets.push({
                title: title.replace(/\s+/g, ' ').trim(),
                url: `https://polymarket.com${link}`,
                probability: textContent.match(/(\d+)%/) ? textContent.match(/(\d+)%/)[0] : "?",
                details: textContent.substring(0, 100)
            });
        });

        if (markets.length === 0) {
             // Fallback: Just return the raw text of the results container if possible
             return [{ title: "Search Results", details: "No structured markets found." }];
        }
        
        return markets;

    } catch (e) {
        console.error(`[WebSurfer] Polymarket Error: ${e.message}`);
        return [{ title: "Error", details: e.message }];
    }
  }
  
  async click(selectorOrRef) {
      await this.ensureReady();
      console.log(`[WebSurfer] Clicking ${selectorOrRef}`);
      try {
          await this._injectSnapshotScript();
          
          // Check if it looks like a ref (e.g. "e12", "e305")
          const isRef = /^e\d+$/.test(selectorOrRef) || /^\[ref=e\d+\]$/.test(selectorOrRef);
          
          if (isRef) {
              // Strip "[ref=...]" wrapper if present
              const ref = selectorOrRef.replace(/^\[ref=|\]$/g, '');
              console.log(`[WebSurfer] Resolving ref: ${ref}`);

              // Use the injected function to select the element
              const handle = await this.page.evaluateHandle((r) => window.__devBrowser_selectSnapshotRef(r), ref);
              
              if (handle && handle.asElement()) {
                 await handle.asElement().click({ timeout: 5000 });
              } else {
                 throw new Error(`Element ref '${ref}' not found in current snapshot.`);
              }
          } else {
              // Standard Selector Fallback
              await this.page.click(selectorOrRef, { timeout: 5000 });
          }

          // Return new state after click
          const title = await this.page.title();
          const content = await this.page.content();
          
          // Re-inject script if it was lost during navigation
          await this._injectSnapshotScript();
          
          // Re-generate snapshot for the new state
          const snapshot = await this.page.evaluate(() => window.__devBrowser_getAISnapshot());

          return { title, url: this.page.url(), snapshot, content: this._cleanHtml(content) };
      } catch (e) {
          throw new Error(`Click failed: ${e.message}`);
      }
  }

  async type(selectorOrRef, text) {
      await this.ensureReady();
      console.log(`[WebSurfer] Typing "${text}" into ${selectorOrRef}`);
      try {
          await this._injectSnapshotScript();
          
          const isRef = /^e\d+$/.test(selectorOrRef) || /^\[ref=e\d+\]$/.test(selectorOrRef); // Check for Ref format
          
          if (isRef) {
              const ref = selectorOrRef.replace(/^\[ref=|\]$/g, '');
              const handle = await this.page.evaluateHandle((r) => window.__devBrowser_selectSnapshotRef(r), ref);
               if (handle && handle.asElement()) {
                 await handle.asElement().fill(text, { timeout: 5000 });
              } else {
                 throw new Error(`Element ref '${ref}' not found in current snapshot.`);
              }
          } else {
              await this.page.fill(selectorOrRef, text, { timeout: 5000 });
          }
          
          return { success: true };
      } catch (e) {
          throw new Error(`Type failed: ${e.message}`);
      }
  }

  async _genericNewsExtraction($) {
      const items = [];
      $('a').each((i, el) => {
          if (items.length > 10) return;
          const title = $(el).text();
          const href = $(el).attr('href');
          if (title.length > 40 && href) {
              items.push({ title, url: href, source: "Generic" });
          }
      });
      return items;
  }

  _cleanHtml(html) {
      const $ = cheerio.load(html);
      $('script').remove();
      $('style').remove();
      $('nav').remove(); 
      $('footer').remove();
      return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000); 
  }

  async close() {
      if (this.browser) await this.browser.close();
      this.isInitialized = false;
  }
}

export const webSurferService = new WebSurferService();
