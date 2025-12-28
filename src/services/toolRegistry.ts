import { FunctionDeclaration } from "@google/genai";
import { CORTEX_URL } from "../config/api";
import { nativeControl } from "./nativeControlService";
import { computerService } from "./computerService";
import { ServerToolDispatcher } from "../tools/handlers/ServerToolDispatcher";
import { MessagingTools } from "../tools/handlers/MessagingTools";
import { UITools } from "../tools/handlers/UITools";
import { TradingTools } from "../tools/handlers/TradingTools";
import { apiUrl } from "../config/api";
// We don't import full types to avoid circular deps during runtime, assuming context shape

export type ToolCategory =
  | "CORE"
  | "FILES"
  | "NETWORK"
  | "MOBILE"
  | "HACKING"
  | "CRYPTO"
  | "OSINT"
  | "WHATSAPP"
  | "MEDIA"
  | "SYSTEM"
  | "DEV"
  | "OFFICE";

export interface ToolEntry {
  category: ToolCategory;
  tool: FunctionDeclaration;
  keywords: string[];
}

const registry: ToolEntry[] = [];

export const ToolRegistry = {
  register: (
    tool: FunctionDeclaration,
    category: ToolCategory,
    keywords: string[] = []
  ) => {
    // Force HMR Update
    console.log("[ToolRegistry] Loaded v2.2 (Refactored for IPC)");

    const existing = registry.findIndex((t) => t.tool.name === tool.name);
    if (existing >= 0) {
      registry[existing] = { tool, category, keywords };
    } else {
      const descWords = tool.description?.toLowerCase().split(" ") || [];
      const nameWords = (tool.name || "").toLowerCase().split(/(?=[A-Z])/);
      const allKeywords = [
        ...new Set([
          ...keywords,
          ...descWords,
          ...nameWords,
          category.toLowerCase(),
        ]),
      ];
      registry.push({ tool, category, keywords: allKeywords });
    }
  },

  search: (query: string): FunctionDeclaration[] => {
    const q = query.toLowerCase();
    if (q === "all" || q === "everything") return registry.map((e) => e.tool);
    const queryTerms = q.split(/\s+/);
    return registry
      .filter((entry) => {
        const catMatch = entry.category.toLowerCase().includes(q);
        const keywordMatch = queryTerms.some((term) =>
          entry.keywords.some((k) => k.includes(term) || term.includes(k))
        );
        return catMatch || keywordMatch;
      })
      .map((e) => e.tool);
  },

  getCore: (): FunctionDeclaration[] =>
    registry.filter((e) => e.category === "CORE").map((e) => e.tool),
  getAll: (): FunctionDeclaration[] => registry.map((e) => e.tool),

  // --- EXECUTION CORE ---
  execute: async (name: string, args: any, context: any): Promise<string> => {
    console.log(`[TOOL_REGISTRY] Executing ${name} with args:`, args);

    // 0. LOCAL TOOLS (Cortex Backend - Zero Latency)
    // Check if this is a local tool that should be executed via Cortex
    const { isLocalTool, executeLocalTool } = await import(
      "../tools/handlers/LocalTools"
    );

    if (isLocalTool(name)) {
      try {
        console.log(`[TOOL_REGISTRY] ⚡ Routing ${name} to Cortex (LOCAL)`);
        const result = await executeLocalTool(name, args);
        return result;
      } catch (e: any) {
        console.error(`[TOOL_REGISTRY] Local tool execution failed:`, e);
        // Fallback: Continue to other handlers
        console.warn(`[TOOL_REGISTRY] Attempting fallback for ${name}...`);
      }
    }

    // 1. Messaging Tools (App Automation)
    if (name === "sendInstantMessage") {
      try {
        return await MessagingTools.sendInstantMessage(args, context);
      } catch (e) {
        console.error("MessagingTools load failed", e);
        return "Messaging capability unavailable.";
      }
    }

    // 2. UI Tools
    const uiTools = [
      "openFileBrowser",
      "openAutonomyDashboard",
      "openCodeEditor",
      "searchWeb",
      "presentVisualData",
      "controlAlwaysOnVision",
      "controlAlwaysOnAudio",
      "switchPersona",
      "analyzeStock",
      "listCustomSkills",
      "createCustomSkill",
      "startSubsystem",
      "listSubsystems",
      "openWebview",
      "closeWebview",
    ];
    if (uiTools.includes(name)) {
      try {
        return await UITools.execute(name, args, context);
      } catch (e) {
        console.error("UITools load failed", e);
        return "UI capability unavailable.";
      }
    }

    // 2.5 Trading Tools
    const tradingTools = [
      "startDebate",
      "executeTrade",
      "getPositions",
      "closeAllPositions",
      "evolveCodeSafe",
    ];
    if (tradingTools.includes(name)) {
      try {
        return await TradingTools.execute(name, args, context);
      } catch (e) {
        console.error("TradingTools execution failed", e);
        return "Trading capability unavailable.";
      }
    }

    // 3. SPECIAL TOOLS (Ported from Legacy Registry)
    if (name === "readScreen") {
      context.soundService?.play("PROCESSING");
      try {
        // Pass the focusApp and displayId param to the server
        let activeApp = args.focusApp
          ? `?focusApp=${encodeURIComponent(args.focusApp)}`
          : "?";

        // Get Current Display ID
        try {
          if (context.displayId) {
            activeApp += `&displayId=${context.displayId}`;
          }
          // window.electron is injected via preload script
          else if (
            (window as any).electron &&
            (window as any).electron.ipcRenderer
          ) {
            const displayId = await (window as any).electron.ipcRenderer.invoke(
              "get-current-display-id"
            );
            if (displayId) activeApp += `&displayId=${displayId}`;
          }
        } catch (e) {
          console.warn(
            "[TOOLS] Failed to fetch display ID, defaulting to primary:",
            e
          );
          activeApp += `&displayId=0`;
        }

        const res = await fetch(apiUrl(`/api/system/screenshot${activeApp}`));
        const data = await res.json();
        if (data.image) {
          // Use Local UI-TARS Vision Model (Quota-Free)
          const instruction =
            args.instruction ||
            "Describe the screen contents in detail for an AI agent.";

          // NEURAL LINK ROUTING: If on mobile, delegate to desktop
          const isMobile =
            context.currentDeviceType === "mobile" ||
            context.currentDeviceType === "tablet";

          if (isMobile && context.neuralLinkManager) {
            try {
              console.log(
                "[readScreen] Mobile device detected, routing to desktop via Neural Link..."
              );

              // Find desktop device
              const availableDevices = Array.from(
                (context.neuralLinkManager as any).devices?.values() || []
              ).map((d: any) => ({
                type: d.type,
                deviceId: d.deviceId,
                name: d.name,
              }));

              const desktopDevice = availableDevices.find(
                (d: any) => d.type === "desktop"
              );

              if (desktopDevice) {
                const result = await (
                  context.neuralLinkManager as any
                ).delegateTool(desktopDevice.deviceId, "readScreen", {
                  ...args,
                  screenshot: data.image,
                  instruction,
                });

                return (
                  result?.result ||
                  `SCREEN ANALYSIS COMPLETE (via ${desktopDevice.name}):\n${result}`
                );
              } else {
                console.warn(
                  "[readScreen] No desktop device found in Neural Link, falling back to local/Gemini"
                );
              }
            } catch (neuralLinkError) {
              console.warn(
                "[readScreen] Neural Link delegation failed:",
                neuralLinkError
              );
            }
          }

          try {
            const visionRes = await fetch(`${CORTEX_URL}/vision/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                screenshot: data.image,
                instruction: instruction,
              }),
            });

            const visionData = await visionRes.json();
            if (visionData.status === "success") {
              return `SCREEN ANALYSIS COMPLETE (Local Vision):\n${visionData.prediction}`;
            } else {
              throw new Error(visionData.message || "Vision analysis failed");
            }
          } catch (visionError) {
            // Fallback to Gemini if local vision fails
            console.warn(
              "[readScreen] Local vision failed, falling back to Gemini:",
              visionError
            );
            const analysis = await context.lucaService.analyzeImage(
              data.image,
              instruction
            );
            return `SCREEN ANALYSIS COMPLETE (Gemini Fallback):\n${analysis}`;
          }
        }
        return "Failed to capture screenshot.";
      } catch {
        return "Error reading screen.";
      }
    }

    if (name === "proofreadText") {
      // NEURAL LINK ROUTING: If on mobile, delegate to desktop
      const isMobile =
        context.currentDeviceType === "mobile" ||
        context.currentDeviceType === "tablet";

      if (isMobile && context.neuralLinkManager) {
        try {
          console.log(
            "[proofreadText] Mobile device detected, routing to desktop via Neural Link..."
          );

          const availableDevices = Array.from(
            (context.neuralLinkManager as any).devices?.values() || []
          ).map((d: any) => ({
            type: d.type,
            deviceId: d.deviceId,
            name: d.name,
          }));

          const desktopDevice = availableDevices.find(
            (d: any) => d.type === "desktop"
          );

          if (desktopDevice) {
            const result = await (
              context.neuralLinkManager as any
            ).delegateTool(desktopDevice.deviceId, "proofreadText", args);

            return (
              result?.result ||
              `PROOFREAD COMPLETE (via ${desktopDevice.name}):\n${result}`
            );
          } else {
            console.warn(
              "[proofreadText] No desktop device found, falling back to Gemini"
            );
          }
        } catch (neuralLinkError) {
          console.warn(
            "[proofreadText] Neural Link delegation failed:",
            neuralLinkError
          );
        }
      }

      // GEMINI FALLBACK: Original implementation
      if (context.lucaService) {
        const result = await context.lucaService.proofreadText(
          args.text,
          args.style
        );
        return `PROOFREAD RESULT:\n${result}`;
      }
      return "Proofreading unavailable.";
    }

    // 4. NATIVE AUTOMATION (IPC FIRST, FALLBACK TO NETWORK)
    if (name === "typeText" || name === "pressKey") {
      // Try IPC via Electron first (Faster, Offline)
      // window.electron is injected via preload
      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        try {
          const type = name === "typeText" ? "type" : "key";
          const payload =
            name === "typeText"
              ? { type, text: args.text, delay: args.delay }
              : {
                  type,
                  key: args.key,
                  modifiers: args.modifiers,
                  delay: args.delay,
                };

          // ipcRenderer.invoke is standard Electron
          const result = await (window as any).electron.ipcRenderer.invoke(
            "simulate-keyboard",
            payload
          );
          if (result.success) return "Input Simulated via IPC.";
        } catch (e) {
          console.warn("IPC Input failed, falling back to Network", e);
        }
      }

      // Fallback to Network (ComputerService)
      if (name === "typeText") {
        const success = await computerService.typeText(args.text);
        return success ? "Typed text (Network)." : "Type failed.";
      } else {
        // Handle modifiers for network service if needed, currently it takes string[]
        const keys = [args.key, ...(args.modifiers || [])];
        const success = await computerService.pressKey(keys);
        return success ? "Pressed key (Network)." : "Key press failed.";
      }
    }

    // 5. Native Control Service (Volume, Battery, etc)
    if (name === "toggleWidget") {
      const { widget } = args;
      // window.electron check
      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        if (widget === "hologram") {
          // toggle-hologram message
          (window as any).electron.ipcRenderer.send("toggle-hologram");
          return "Hologram Toggled.";
        }
        if (widget === "chat") {
          // toggle-chat-widget message
          (window as any).electron.ipcRenderer.send("toggle-chat-widget");
          return "Chat Toggled.";
        }
        if (widget === "orb") {
          (window as any).electron.ipcRenderer.send("toggle-orb");
          return "Voice Orb Toggled.";
        }
      }
      return "Widget control unavailable (No Electron).";
    }

    if (name === "controlSystem") {
      // ... (Existing implementation kept but moved inside switch/if structure)
      const { action, value } = args;
      switch (action) {
        case "VOLUME_SET":
          return (await nativeControl.setVolume(value)) || "Failed.";
        case "VOLUME_MUTE":
          return (await nativeControl.mute()) || "Failed.";
        case "VOLUME_UNMUTE":
          return (await nativeControl.unmute()) || "Failed.";
        case "GET_BATTERY":
          return await nativeControl.getBatteryStatus();
        case "GET_SYSTEM_LOAD":
          return await nativeControl.getSystemLoad();
        case "MEDIA_PLAY_PAUSE":
          return (await nativeControl.mediaPlayPause()) || "Failed.";
        case "MEDIA_NEXT":
          return (await nativeControl.mediaNext()) || "Failed.";
        default:
          return "Unknown action.";
      }
    }

    if (name === "launchApp") {
      return (await nativeControl.launchApp(args.appName)) || "Failed.";
    }

    // --- PERSONA SWITCHING ---
    if (name === "switchPersona") {
      const mode = args.mode;
      if (context.handlePersonaSwitch) {
        await context.handlePersonaSwitch(mode);
        return `Behavioral mode switched to ${mode}. Adapting communication style while maintaining full memory and capability awareness.`;
      }
      return "Persona switch unavailable (no handler).";
    }

    if (name === "googleImageSearch") {
      if (context.lucaService)
        return await context.lucaService.runGoogleImageSearch(args.query);
      return "Service unavailable.";
    }

    // 6. Server Tools Route
    if (ServerToolDispatcher.isServerTool(name) || name === "evolveCodeSafe") {
      return await ServerToolDispatcher.execute(name, args, context);
    }

    return `ERROR: Unknown Tool "${name}".`;
  },
};
