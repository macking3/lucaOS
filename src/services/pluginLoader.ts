import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FunctionDeclaration } from "@google/generative-ai";

// ESM Shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LucaPlugin {
  name: string;
  tools: FunctionDeclaration[];
  handler: (toolName: string, args: any) => Promise<any>;
}

export class PluginLoader {
  private plugins: Map<string, LucaPlugin> = new Map();
  private handlers: Map<string, Function> = new Map();
  private manualTools: FunctionDeclaration[] = [];
  private integrationsPath: string;

  constructor() {
    this.integrationsPath = path.join(__dirname, "integrations");
    this.manualTools = [];
    this.handlers = new Map();
    // Ensure directory exists
    if (!fs.existsSync(this.integrationsPath)) {
      fs.mkdirSync(this.integrationsPath, { recursive: true });
    }
  }

  /**
   * Load all plugins from services/integrations
   */
  async loadPlugins(): Promise<void> {
    console.log("[PLUGIN] Scanning for native integrations...");

    try {
      if (!fs.existsSync(this.integrationsPath)) return;

      const entries = fs.readdirSync(this.integrationsPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginName = entry.name;
          const pluginPath = path.join(this.integrationsPath, pluginName);

          try {
            const modulePath = path.join(pluginPath, "index.ts"); // Try TS source first
            if (!fs.existsSync(modulePath)) {
              // Fallback to JS if no TS
              if (!fs.existsSync(path.join(pluginPath, "index.js"))) {
                continue;
              }
            }

            // Dynamic Import
            const fileUrl = `file://${path.join(pluginPath, "index.ts")}`; // Assuming running with ts-node/loader
            const pluginModule = await import(fileUrl);

            // Validate Plugin Structure
            if (
              pluginModule.tools &&
              typeof pluginModule.handler === "function"
            ) {
              this.plugins.set(pluginName, {
                name: pluginName,
                tools: pluginModule.tools,
                handler: pluginModule.handler,
              });
              console.log(
                `[PLUGIN] Loaded: ${pluginName} (${pluginModule.tools.length} tools)`
              );
            } else {
              console.warn(
                `[PLUGIN] Skipped ${pluginName}: Missing 'tools' array or 'handler' function.`
              );
            }
          } catch (e) {
            console.error(`[PLUGIN] Failed to load ${pluginName}:`, e);
          }
        }
      }
    } catch (e) {
      console.error("[PLUGIN] Error reading integrations directory:", e);
    }
  }

  /**
   * Manually register a tool (e.g. for Meta-Tools like Ingestor)
   */
  public registerManualTool(
    tool: FunctionDeclaration,
    handler: (args: any, ai: any) => Promise<any>
  ) {
    this.manualTools.push(tool);
    this.handlers.set(tool.name, handler);
  }

  /**
   * Get all tool definitions from all plugins + manual tools
   */
  getAllTools(): FunctionDeclaration[] {
    const allTools: FunctionDeclaration[] = [...this.manualTools];
    for (const plugin of this.plugins.values()) {
      allTools.push(...plugin.tools);
    }
    return allTools;
  }

  /**
   * Execute a tool by name
   */
  async executeTool(name: string, args: any): Promise<any> {
    // 1. Manual callback
    if (this.handlers.has(name)) {
      try {
        return await this.handlers.get(name)!(args, null);
      } catch (e: any) {
        return { error: e.message || "Manual tool execution failed" };
      }
    }

    // 2. Plugin delegation
    for (const plugin of this.plugins.values()) {
      if (plugin.tools.some((t) => t.name === name)) {
        try {
          return await plugin.handler(name, args);
        } catch (e: any) {
          console.error(`[PLUGIN] Error executing ${name}:`, e);
          return { error: e.message || "Plugin execution error" };
        }
      }
    }

    return null; // Not handled
  }
}

export const pluginLoader = new PluginLoader();
