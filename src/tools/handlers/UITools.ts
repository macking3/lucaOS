import { ToolExecutionContext } from "../types";
import { apiUrl } from "../../config/api";

export class UITools {
  static async execute(
    name: string,
    args: any,
    context: ToolExecutionContext
  ): Promise<string> {
    const {
      setShowMobileFileBrowser,
      setShowAutonomyDashboard,
      setShowCodeEditor,
      setVoiceSearchResults,
      setLiveContent,
      setVisualData,
      setToolLogs,
      soundService,
      lucaService,
    } = context;

    let result = "";

    if (name === "openFileBrowser") {
      setShowMobileFileBrowser(true);
      result = `MOBILE FILE BROWSER OPENED.\n> Accessing desktop files...`;
      return result;
    }

    if (name === "switchPersona") {
      const mode = args.mode;
      await context.handlePersonaSwitch(mode);
      const friendlyMode =
        mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
      result = `PERSONA SWITCHED: Active Mode is now [${friendlyMode}]. Voice systems re-calibrated.`;
      setToolLogs((prev) => {
        const newLogs = [...prev];
        newLogs[newLogs.length - 1].result = result;
        return newLogs;
      });
      return result;
    }

    if (name === "openAutonomyDashboard") {
      setShowAutonomyDashboard(true);
      soundService.play("SUCCESS");
      result = "[UI] Autonomy Dashboard opened.";
      setToolLogs((prev) => {
        const newLogs = [...prev];
        newLogs[newLogs.length - 1].result = result;
        return newLogs;
      });
      return result;
    }

    if (name === "openCodeEditor") {
      setShowCodeEditor(true);
      result = "HOLOGRAPHIC CODING INTERFACE LAUNCHED.";
      setToolLogs((prev) => {
        const newLogs = [...prev];
        newLogs[newLogs.length - 1].result = result;
        return newLogs;
      });
      return result;
    }

    if (name === "searchWeb") {
      try {
        const searchRes = await lucaService.runGoogleSearch(args.query);

        // 1. Pass to Voice HUD if active
        setVoiceSearchResults(searchRes.groundingMetadata);

        // 2. Pass to Main Screen Live Display (Active Intel Panel)
        setLiveContent(searchRes.groundingMetadata);

        result =
          searchRes.text || "Search complete. See HUD/Live Feed for details.";

        setToolLogs((prev) => {
          const newLogs = [...prev];
          newLogs[newLogs.length - 1].result =
            "Executing Live Search (Display Active)...";
          return newLogs;
        });
        return result;
      } catch (e: any) {
        return "Search failed due to connectivity.";
      }
    }

    if (name === "presentVisualData") {
      try {
        // Pass structured data to Voice HUD
        setVisualData(args);

        // Also clear standard search results to avoid clutter
        setVoiceSearchResults(null);

        result = "SUCCESS: Visual data presented on HUD.";
        setToolLogs((prev) => {
          const newLogs = [...prev];
          newLogs[newLogs.length - 1].result = result;
          return newLogs;
        });
        return result;
      } catch (e: any) {
        return "Failed to present visual data.";
      }
    }

    // Always On Controls
    if (name === "controlAlwaysOnVision" || name === "controlAlwaysOnAudio") {
      const type = name === "controlAlwaysOnVision" ? "vision" : "audio";
      const { action, captureInterval, sensitivity } = args;
      const endpointUrl = apiUrl(`/api/${type}`);

      try {
        if (action === "start") {
          const config: any = {};
          if (captureInterval) config.captureInterval = captureInterval;
          if (sensitivity !== undefined) config.sensitivity = sensitivity;

          const response = await fetch(`${endpointUrl}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          });
          const data = await response.json();
          if (data.success) {
            result = `✅ Always-On ${type} System STARTED.`;
          } else {
            result = `❌ Failed to start: ${data.error}`;
          }
        } else if (action === "stop") {
          const response = await fetch(`${endpointUrl}/stop`, {
            method: "POST",
          });
          const data = await response.json();
          if (data.success) {
            result = `✅ Always-On ${type} System STOPPED.`;
          } else {
            result = `❌ Failed to stop: ${data.error}`;
          }
        } else if (action === "status") {
          const response = await fetch(`${endpointUrl}/status`);
          const data = await response.json();
          result = `📊 Status: ${JSON.stringify(data)}`;
        }
        return result;
      } catch (e: any) {
        return `❌ Error controlling ${type} system: ${e.message}`;
      }
    }

    // --- SPECIALIZED UI TERMINALS ---
    if (name === "analyzeStock") {
      context.setStockTerminalSymbol(args.symbol);
      context.setShowStockTerminal(true);
      soundService.play("SUCCESS");
      return `STOCK TERMINAL OPENED: Analyzing ${args.symbol}.`;
    }

    if (name === "listCustomSkills" || name === "createCustomSkill") {
      // HANDLE PROGRAMMATIC SKILL CREATION (Ramond-e Logic)
      if (name === "createCustomSkill" && args.script) {
        try {
          const res = await fetch(apiUrl("/api/skills/create"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: args.name,
              code: args.script, // Backend expects 'code', tool uses 'script'
              description: args.description,
              language: args.language,
            }),
          });
          const data = await res.json();
          const result = data.success
            ? `SUCCESS: Skill '${args.name}' created at ${data.path}`
            : `ERROR: Failed to create skill: ${data.error}`;

          setToolLogs((prev) => {
            const newLogs = [...prev];
            newLogs[newLogs.length - 1].result = result;
            return newLogs;
          });
          return result;
        } catch (e: any) {
          return `ERROR: Skill creation failed: ${e.message}`;
        }
      }

      // FALLBACK TO UI (If no script provided or just listing)
      context.setShowSkillsMatrix(true);
      soundService.play("SUCCESS");
      return name === "listCustomSkills"
        ? "SKILLS MATRIX OPENED: Viewing registered capabilities."
        : "SKILLS MATRIX OPENED: UI Launched. Please define skill manually.";
    }

    if (name === "startSubsystem" || name === "listSubsystems") {
      context.setShowSubsystemDashboard(true);
      soundService.play("SUCCESS");

      if (name === "startSubsystem") {
        return "SUBSYSTEM DASHBOARD OPENED: Starting subsystem in background...";
      } else {
        return "SUBSYSTEM DASHBOARD OPENED: Viewing managed processes.";
      }
    }

    // --- GHOST BROWSER HANDLERS ---
    if (name === "openWebview") {
      const { url, title } = args;
      if (!url) {
        return "ERROR: Missing URL parameter for openWebview.";
      }
      context.setActiveWebview({ url, title: title || "Ghost Browser" });
      soundService.play("SUCCESS");
      return `GHOST BROWSER OPENED: ${url}`;
    }

    if (name === "closeWebview") {
      context.setActiveWebview(null);
      soundService.play("KEYSTROKE");
      return "GHOST BROWSER CLOSED.";
    }

    return "UNKNOWN UI TOOL";
  }
}
