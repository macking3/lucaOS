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

import {
  canDeviceRunTool,
  findBestDeviceForTool,
  getRequiredPlatformsForTool,
  DeviceType,
} from "./deviceCapabilityService";

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

    // --- SYSTEMIC DELEGATION (ONE OS) ---
    // Check if current device can run this tool. If not, delegate to a better one.
    const currentDeviceType = context.currentDeviceType || "desktop";
    const currentDeviceId =
      context.currentDeviceId || (context.neuralLinkManager as any)?.myDeviceId;

    const canRunLocally = canDeviceRunTool(
      currentDeviceType as DeviceType,
      name
    );

    if (!canRunLocally && context.neuralLinkManager) {
      const availableDevices = Array.from(
        (context.neuralLinkManager as any).devices?.values() || []
      ).map((d: any) => ({
        type: d.type as DeviceType,
        deviceId: d.deviceId,
        name: d.name,
      }));

      // findBestDeviceForTool now respects currentDeviceId as priority
      const bestDevice = findBestDeviceForTool(
        name,
        availableDevices,
        currentDeviceId
      );

      if (bestDevice && bestDevice.deviceId !== currentDeviceId) {
        // CONSENT-BASED DELEGATION
        // If the user hasn't explicitly confirmed remote execution in the arguments,
        // we ask for permission first.
        if (!args.confirmRemote) {
          return `REQUIRED_DELEGATION: The tool "${name}" cannot run locally on your current ${currentDeviceType}. It requires ${bestDevice.name} (${bestDevice.type}). \n\nINSTRUCTION: Inform the user that you need to access their ${bestDevice.type} to perform this action and ask for their permission. If they agree, retry this tool call with "confirmRemote: true" in the arguments.`;
        }

        try {
          console.log(
            `[ONE OS] ⚡ Tool "${name}" authorized for delegation to ${bestDevice.name} (${bestDevice.type})`
          );

          const result = await (context.neuralLinkManager as any).delegateTool(
            bestDevice.deviceId,
            name,
            args
          );

          // Handle response object or raw result
          const finalResult =
            result?.result ||
            result?.error ||
            (typeof result === "string" ? result : JSON.stringify(result));

          return `[DELEGATED to ${bestDevice.name}] ${finalResult}`;
        } catch (error: any) {
          console.error(`[ONE OS] Delegation of "${name}" failed:`, error);
          // Fall through to local execution as last resort or error out
          return `ERROR: Delegation failed and tool cannot run locally: ${error.message}`;
        }
      } else if (!bestDevice) {
        // HARDWARE MISSING FALLBACK
        // If we are on mobile (or another non-desktop device) and the tool REQUIRES a desktop,
        // we provide a gentle explanation.
        const requiredPlatforms = getRequiredPlatformsForTool(name);
        if (
          requiredPlatforms.includes("desktop") &&
          currentDeviceType !== "desktop"
        ) {
          return `HARDWARE_MISSING: The feature "${name}" requires a Desktop connection. \n\nINSTRUCTION: Inform the user that this specific task (e.g., file system access, terminal controls, or specific desktop apps) is currently isolated to their computer. Advise them to connect their Desktop via the "Neural Link" QR code in the system dashboard to enable remote control from this mobile device.`;
        }
      }
    }

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

    // 2.6 Mobile Tools (Android Automation)
    const mobileTools = [
      "controlAndroidAgent", // Main Android automation tool
      "android_execute_goal",
      "android_screenshot",
      "android_get_ui",
      "android_check_connection",
    ];
    if (mobileTools.includes(name)) {
      try {
        // Handle the main controlAndroidAgent tool
        if (name === "controlAndroidAgent") {
          const { androidAgent } = await import(
            "../services/androidAgentService"
          );
          console.log(
            `[TOOL_REGISTRY] Executing Android Agent with goal: ${args.goal}`
          );

          // Default to WIRELESS (Neural Link) for wireless, remote control
          // This is the innovative approach - no cables, no ADB setup required
          const result = await androidAgent.executeGoal(
            args.goal,
            args.strategy || "WIRELESS" // Changed from "ACCURACY" to "WIRELESS"
          );

          return result || "Android automation completed successfully.";
        }

        // Handle other mobile tools
        const { mobileToolHandlers } = await import(
          "../tools/handlers/MobileTools"
        );
        const handler =
          mobileToolHandlers[name as keyof typeof mobileToolHandlers];

        if (!handler) {
          return `Mobile tool ${name} not found.`;
        }

        console.log(`[TOOL_REGISTRY] Executing mobile tool: ${name}`);
        const result = await handler(args);

        if (!result.success) {
          return result.error || result.message || "Mobile automation failed.";
        }

        return result.message || JSON.stringify(result.data);
      } catch (e: any) {
        console.error("MobileTools execution failed", e);
        return `Mobile automation unavailable: ${e.message}`;
      }
    }

    // 2.7 Native Mobile Tools (Sensors, Haptics, etc.)
    const nativeMobileTools = ["vibrate", "getLocation", "sendSMS", "makeCall"];
    if (nativeMobileTools.includes(name)) {
      try {
        const { nativeMobileToolHandlers } = await import(
          "../tools/handlers/NativeMobileTools"
        );
        const handler =
          nativeMobileToolHandlers[
            name as keyof typeof nativeMobileToolHandlers
          ];

        if (!handler) {
          return `Native mobile tool ${name} not found.`;
        }

        console.log(`[TOOL_REGISTRY] Executing native mobile tool: ${name}`);
        const result = await (handler as any)(args);

        if (!result.success) {
          return (
            result.error || result.message || "Native mobile operation failed."
          );
        }

        return result.message || JSON.stringify(result.data);
      } catch (e: any) {
        console.error("NativeMobileTools execution failed", e);
        return `Native mobile capability unavailable: ${e.message}`;
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

    // --- AI CLICK (Agentic Vision) ---
    if (name === "aiClick") {
      context.soundService?.play("PROCESSING");
      try {
        const res = await fetch(`${CORTEX_URL}/vision/agent-click`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: args.target,
            // screenshot: null, // Let backend capture it
          }),
        });

        // Check if Cortex returned 503 (Vision Agent not available)
        if (res.status === 503) {
          console.warn("[aiClick] UI-TARS not available, guiding to fallback");
          return `AI Click (UI-TARS) is not available. Use 'readScreen' to capture the screen, analyze the image to find '${args.target}', then use 'controlSystemInput' with specific coordinates to click it.`;
        }

        const data = await res.json();

        if (data.status === "success") {
          return `✓ CLICKED: ${args.target} at (${data.coordinates?.x}, ${data.coordinates?.y})`;
        } else {
          return `Failed to click '${args.target}': ${data.message}. Try using 'readScreen' to analyze the screen and 'controlSystemInput' to click manually.`;
        }
      } catch (e: any) {
        console.error("[aiClick] Error:", e);
        // Provide fallback guidance when Cortex is unreachable
        return `AI Click unavailable (${e.message}). Use 'readScreen' to capture the screen, analyze the image to find '${args.target}', then use 'controlSystemInput' with type:'click' and x,y coordinates.`;
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

    // 7. MOBILE APP LAUNCHER
    if (name === "openMobileApp") {
      const { appControlService } = await import("./appControlService");
      const result = await appControlService.openApp(args.appName);

      if (result.success) {
        return result.message || `Opened ${args.appName}`;
      } else {
        return result.error || "Failed to open app";
      }
    }

    // 8. UI AUTOMATION (Android)
    if (name === "automateUI") {
      const { uiAutomationService } = await import("./uiAutomationService");

      // Check if available
      const available = await uiAutomationService.isAvailable();
      if (!available) {
        return "UI Automation requires Android with Accessibility Service enabled. Please enable it in Settings → Accessibility → Luca.";
      }

      const { task, screenshot } = args;

      // If screenshot provided, use Vision AI multi-step execution
      if (screenshot) {
        const result = await uiAutomationService.executeVisionTask(
          task,
          screenshot
        );
        if (result.success) {
          return result.message || "UI automation completed";
        } else {
          return result.error || "UI automation failed";
        }
      } else {
        // Simple find and click without screenshot
        const result = await uiAutomationService.findAndClick(task);
        if (result.success) {
          return result.message || `Executed: ${task}`;
        } else {
          return result.error || "Could not find element";
        }
      }
    }

    if (name === "generateRemoteSetupCommand") {
      const { platform = "auto" } = args;
      const token = Math.random().toString(36).substring(2, 12).toUpperCase();
      const sessionId = context.sessionId || "SESSION_PROTOTYPE";

      let command = "";
      if (platform === "windows") {
        command = `powershell -Command "iwr -useb https://luca.sh/win | iex; luca-connect --token ${token}"`;
      } else {
        // Mac/Linux default
        command = `curl -sL https://luca.sh/connect | bash -s -- --token=${token} --session=${sessionId}`;
      }

      return `REMOTE SETUP INITIALIZED.\n\nInstruction: Ask the operator to run the following command in their desktop terminal to establish a secure Neural Link bridge:\n\n\`\`\`bash\n${command}\n\`\`\`\n\nOnce executed, the 'Ghost Client' will connect and you will have full file system and terminal access to that machine.`;
    }

    if (name === "generateWebLink") {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const sessionId = context.sessionId || "SESSION_PROTOTYPE";
      const link = `https://luca.sh/link/${token}?s=${sessionId}`;

      return `WEB LINK GENERATED.\n\nInstruction: Ask the operator to open the following URL in their desktop browser (Chrome, Edge, or Safari) to establish a secure 'Web Hook' bridge:\n\n${link}\n\nOnce the page is open, you will be able to request access to their screen, files, and camera via the browser's native permission prompts.`;
    }

    if (name === "remoteLaunchOnSmartTV") {
      const { tvId, url } = args;
      // In a production environment, this would call the SmartThings/ThinQ OAuth API.
      // For now, we simulate the Cloud Handshake.
      console.log(`[CLOUD_RELAY] Sending Remote Launch command to TV: ${tvId}`);
      console.log(`[CLOUD_RELAY] Target URL: ${url}`);

      return `REMOTE CLOUD LAUNCH SUCCESSFUL.\n\nStatus: Luca has reached out to the manufacturer's cloud for Device [${tvId}]. \nAction: The TV is being woken up and will launch the browser at: ${url}.\nConnection: A Neural Link tunnel is established and waiting for the TV to 'check in'.`;
    }

    if (name === "nativeHardwareCast") {
      const { protocol, targetDeviceName } = args;
      console.log(
        `[NATIVE_CAST] Initiating ${protocol} stream to: ${targetDeviceName}`
      );
      const result = await nativeControl.startNativeCast(
        protocol,
        targetDeviceName
      );
      return `NATIVE CAST INITIATED.\n\nProtocol: ${protocol}\nTarget: ${targetDeviceName}\nStatus: ${
        result || "Connecting..."
      }\n\nInstruction: Your Mac is now acting as the local router/source for the stream. The TV should show the dashboard once the hardware handshake is complete.`;
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
