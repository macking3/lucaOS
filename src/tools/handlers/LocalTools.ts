/**
 * Local Tools Handler
 * Executes tools via Cortex backend for instant zero-latency operations
 */

// Import apiUrl from config
import { cortexUrl } from "../../config/api";

/**
 * List of tools that should be executed locally via Cortex
 */
const LOCAL_TOOLS = new Set([
  // Media Control
  "playMusic",
  "pauseMedia",
  "nextTrack",
  "previousTrack",
  "setVolume",

  // File Operations
  "openFile",
  "createFolder",
  "deleteFile",
  "organizeFiles",

  // File Editing
  "appendToFile",
  "findReplace",
  "improveWriting",
  "refactorCode",

  //Communication
  "messageContact",
  "callContact",

  // Web
  "openUrl",

  // System
  "takeScreenshot",
  "lockScreen",
  "sleep",

  // Time
  "getTime",
  "getDate",
  "setReminder",
  "setTimer",
  "setAlarm",

  // Productivity
  "enableFocusMode",
  "disableFocusMode",
  "copyText",
  "paste",

  // More...
  "searchWeb",
  "getWeather",
  "calculator",
  "translate",
  "defineWord",
  "openApp",
  "closeApp",
  "controlSystem",
  "listInstalledApps",
]);

/**
 * Check if a tool should be executed locally
 */
export function isLocalTool(toolName: string): boolean {
  return LOCAL_TOOLS.has(toolName);
}

/**
 * Check system permissions
 */
export async function checkPermissions(): Promise<any> {
  try {
    const response = await fetch(cortexUrl("/api/system/permissions"));
    return await response.json();
  } catch (error) {
    console.error("[PERMISSION] Check failed:", error);
    return { success: false, error: "Failed to check permissions" };
  }
}

/**
 * Request system permissions
 */
export async function requestPermissions(): Promise<any> {
  try {
    const response = await fetch(cortexUrl("/api/system/permissions/request"), {
      method: "POST",
    });
    return await response.json();
  } catch (error) {
    console.error("[PERMISSION] Request failed:", error);
    return { success: false, error: "Failed to request permissions" };
  }
}

/**
 * List all installed applications
 */
export async function listInstalledApps(): Promise<any> {
  try {
    const response = await fetch(cortexUrl("/api/system/apps"));
    return await response.json();
  } catch (error) {
    console.error("[APPS] List failed:", error);
    return { success: false, error: "Failed to list applications" };
  }
}

/**
 * Execute a local tool via Cortex backend
 */
export async function executeLocalTool(
  toolName: string,
  args: any
): Promise<string> {
  console.log(`[LOCAL TOOL] Executing ${toolName} via Cortex`, args);

  try {
    // Map tool name to endpoint
    const endpoint = `/api/execute/${toolName}`;

    // Call Cortex endpoint
    const response = await fetch(cortexUrl(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      if (result.error === "PERMISSION_DENIED") {
        // Trigger recovery UI (this logic would ideally be tied to an event emitter or state store)
        // For now, we'll suggest requesting permissions in the error message
        const recoveryType = result.recovery_type || "general";
        throw new Error(
          `PERMISSION_DENIED: Please grant ${recoveryType} access in Settings > General.`
        );
      }
      throw new Error(result.error || "Tool execution failed");
    }

    // Format response
    const message = result.message || `${toolName} completed successfully`;
    const tier = result.tier ? ` (Tier ${result.tier})` : "";
    const elapsed = result.elapsed ? ` in ${result.elapsed.toFixed(2)}s` : "";

    console.log(`[LOCAL TOOL] ✅ ${toolName} completed${tier}${elapsed}`);

    // Return formatted result
    return `${message}${tier}${elapsed}`;
  } catch (error: any) {
    console.error(`[LOCAL TOOL] ❌ ${toolName} failed:`, error);
    throw new Error(`Local tool execution failed: ${error.message}`);
  }
}

/**
 * Tool schema definitions for local tools
 * These can be registered with Gemini or used for validation
 */
export const LOCAL_TOOL_SCHEMAS = {
  playMusic: {
    name: "playMusic",
    description: "Play music on a specified music app",
    parameters: {
      type: "object",
      properties: {
        songInfo: { type: "string", description: "Song name or artist" },
        app: {
          type: "string",
          description: "Music app (spotify, apple_music, youtube)",
          default: "spotify",
        },
      },
      required: ["songInfo"],
    },
  },

  openFile: {
    name: "openFile",
    description: "Open a file in its default application",
    parameters: {
      type: "object",
      properties: {
        fileName: { type: "string", description: "Name of the file to open" },
        directory: { type: "string", description: "Optional directory path" },
      },
      required: ["fileName"],
    },
  },

  createFolder: {
    name: "createFolder",
    description: "Create a new folder",
    parameters: {
      type: "object",
      properties: {
        folderName: {
          type: "string",
          description: "Name of the folder to create",
        },
        location: {
          type: "string",
          description: "Optional location path",
          default: "~/Desktop",
        },
      },
      required: ["folderName"],
    },
  },

  appendToFile: {
    name: "appendToFile",
    description: "Append text to the end of a file",
    parameters: {
      type: "object",
      properties: {
        fileName: { type: "string", description: "Name of the file" },
        text: { type: "string", description: "Text to append" },
        directory: { type: "string", description: "Optional directory path" },
      },
      required: ["fileName", "text"],
    },
  },

  improveWriting: {
    name: "improveWriting",
    description: "Use AI to improve writing quality (grammar, clarity, tone)",
    parameters: {
      type: "object",
      properties: {
        fileName: {
          type: "string",
          description: "Name of the file to improve",
        },
        aspect: {
          type: "string",
          description:
            "Aspect to improve: grammar, clarity, tone, conciseness, overall",
          default: "overall",
        },
      },
      required: ["fileName"],
    },
  },

  messageContact: {
    name: "messageContact",
    description: "Send a message to a contact via messaging app",
    parameters: {
      type: "object",
      properties: {
        contactName: { type: "string", description: "Name of the contact" },
        message: { type: "string", description: "Message to send" },
        app: {
          type: "string",
          description: "Messaging app (whatsapp, telegram, discord)",
          default: "whatsapp",
        },
      },
      required: ["contactName", "message"],
    },
  },

  openUrl: {
    name: "openUrl",
    description: "Open a URL in a web browser",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to open" },
        browser: {
          type: "string",
          description: "Browser to use (chrome, safari, firefox)",
          default: "chrome",
        },
      },
      required: ["url"],
    },
  },

  // Productivity
  listInstalledApps: {
    name: "listInstalledApps",
    description: "List all applications installed on the computer",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // Add more schemas as needed...
};
