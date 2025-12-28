import { ToolExecutionContext } from "../types";
import { uiTarsService } from "../../services/uiTarsService";
// @ts-ignore
import { screenCaptureService } from "../../services/screenCaptureService.js";
// @ts-ignore
import { visionAnalyzerService } from "../../services/visionAnalyzerService.js";
import { settingsService } from "../../services/settingsService";
import { apiUrl } from "../../config/api";

const SERVER_TOOLS = [
  "executeTerminalCommand",
  "runDiagnostics",
  "scanNetwork",
  "auditSourceCode",
  "createOrUpdateFile",
  "osintDomainIntel",
  "traceSignalSource",
  "osintUsernameSearch",
  "osintDarkWebScan",
  "controlSystemInput",
  "listInstalledApps",
  "runNativeAutomation",
  "changeDirectory",
  "listFiles",
  "readFile",
  "writeProjectFile",
  "controlSystem",
  "controlMobileDevice",
  "connectWirelessTarget",
  "exfiltrateData",
  "killProcess",
  "closeApp",
  "getActiveApp",
  "sendInstantMessage",
  "ingestGithubRepo",
  "runPythonScript",
  "openInteractiveTerminal",
  "getScreenDimensions",
  "runNmapScan",
  "runMetasploitExploit",
  "generatePayload",
  "runBurpSuite",
  "runWiresharkCapture",
  "runJohnRipper",
  "runCobaltStrike",
  "compileSelf",
  "controlSmartTV",
  "runSqlInjectionScan",
  "performStressTest",
  "scanPublicCameras",
  "deployPhishingKit",
  "connectToMCPServer",
  "writeToExcel",
  "readExcelSheet",
  "inspectFigmaDesign",
  "readUrl",
  "addGraphRelations",
  "queryGraphKnowledge",
  "searchPolymarket",
  "whatsappSendMessage",
  "whatsappGetChats",
  "whatsappReadChat",
  "whatsappSendImage",
  "telegramSendMessage",
  "telegramGetChats",
  "telegramReadChat",
  "telegramGetContacts",
  "whatsappGetContacts",
  "osintGoogleDork",
  "readClipboard",
  "writeClipboard",
  "readDocument",
  "createDocument",
  "analyzeSpreadsheet",
  "generateAndRegisterSkill",
  "executeCustomSkill",
  "getMarketNews",
  "startSubsystem",
  "stopSubsystem",
  "listSubsystems",
  "installFromRecipe",
  "listForgeApps",
  "getForgeRecipes",
  "openWebview",
  "closeWebview",
  "executeRpcScript",
  "saveMacro",
  "listMacros",
  "executeMacro",
  "refineQuery",
  "getUITree",
  "findUIElement",
  "clickUIElement",
  "getAndroidUITree",
  "findAndroidElement",
  "clickAndroidElement",
  "readAndroidNotifications",
  "launchAndroidIntent",
  "setAndroidClipboard",
  "injectAndroidText",
  "enableWirelessADB",
  "scanAndroidDevices",
  "installAndroidAPK",
  "uninstallAndroidAPK",
  "pairAndroidDevice",
  "getAndroidDeviceIP",
  "connectToAndroidDevice",
  "connectMobileViaQR",
  "sendMobileCommand",
  "listConnectedMobileDevices",
  "deployCaptivePortal",
  "wifiDeauthAttack",
  "scanWiFiDevices",
  "startHighSpeedStream",
  "autonomousWebBrowse",
  "navigateWebPage",
  "clickWebElement",
  "typeWebElement",
  "castToDevice",
  "deploySystemHotspot",
  "setSystemAlertLevel",
  "initiateLockdown",
  "controlAndroidAgent",
  "searchAndInstallTools",
  "proofreadText",
  "setBackgroundImage",
  "requestFullSystemPermissions",
  "broadcastGlobalDirective",
  "controlAlwaysOnVision",
  "controlAlwaysOnAudio",
  "analyzeAmbientAudio",
  "osintDomainIntel",
  "searchWeb",
  "searchMaps",
  "analyzeImageDeeply",
  "generateOrEditImage",
  "generateNetworkMap",
  "connectSmartTV",
  "scanBluetoothSpectrum",
  "initiateWirelessConnection",
  "manageBluetoothDevices",
  "runNativeAutomation",
  "closeAllPositions",
  "executeTrade",
  "getPositions",
  "startDebate",
];

export class ServerToolDispatcher {
  static isServerTool(name: string): boolean {
    // Some tools might be handled by specific handlers but still listed here for reference.
    // In this refactor, we prioritizing checking specific handlers first.
    // But for the "catch-all" server dispatch, we check this list.
    return SERVER_TOOLS.includes(name);
  }

  static async execute(
    name: string,
    args: any,
    context: ToolExecutionContext
  ): Promise<string> {
    if (!context.isLocalCoreConnected) {
      return `ERROR: Tool ${name} requires Local Core connection.`;
    }

    const {
      setIngestionState,
      setToolLogs,
      attachedImage,
      messages,
      memoryService,
    } = context;

    // --- MEMORY TOOLS (LOCAL SERVICE) ---
    if (name === "storeMemory") {
      try {
        const memory = await memoryService.saveMemory(
          args.key,
          args.value,
          args.category || "FACT"
        );
        return `Memory Stored: [${memory.category}] ${memory.key} (ID: ${memory.id})`;
      } catch (e: any) {
        return `Failed to store memory: ${e.message}`;
      }
    }

    if (name === "retrieveMemory") {
      try {
        const results = await memoryService.searchMemories(args.query);
        if (results.length === 0) return "No relevant memories found.";
        return `Memory Retrieval Results:\n${results
          .map(
            (m: any) =>
              `- [${m.memory.category}] ${m.memory.key}: ${
                m.memory.value
              } (Confidence: ${Math.round(m.similarity * 100)}%)`
          )
          .join("\n")}`;
      } catch (e: any) {
        return `Failed to retrieve memory: ${e.message}`;
      }
    }

    // --- TRIGGER INGESTION UI ---
    if (name === "ingestGithubRepo") {
      setIngestionState({ active: true, files: [], skills: [] });
    }

    // --- SPECIAL LOGIC: MACRO EXECUTION ---
    if (name === "executeMacro") {
      const macroName = args.name;
      try {
        const macroRes = await fetch(apiUrl(`/api/rpc/macro/${macroName}`));
        if (!macroRes.ok) {
          return `ERROR: Macro "${macroName}" not found.`;
        }
        const macro = await macroRes.json();
        const executeRes = await fetch(apiUrl("/api/rpc/execute"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script: macro.script }),
        });
        const executeData = await executeRes.json();
        if (executeRes.ok) {
          return `MACRO "${macroName}" EXECUTED: ${executeData.results.length} steps completed.`;
        } else {
          return `ERROR: ${executeData.error}`;
        }
      } catch (e: any) {
        return `ERROR: Failed to execute macro: ${e.message}`;
      }
    }

    // --- SPECIAL LOGIC: WHATSAPP IMAGE ---
    if (name === "whatsappSendImage") {
      let imageToSend = attachedImage;
      if (!imageToSend) {
        const reversedMsgs = [...messages].reverse();
        const lastImageMsg = reversedMsgs.find(
          (m: any) => m.generatedImage || m.attachment
        );
        if (lastImageMsg) {
          imageToSend =
            lastImageMsg.generatedImage || lastImageMsg.attachment || null;
        }
      }

      if (!imageToSend) {
        const err =
          "ERROR: No image found in context (Attachment or History) to send.";
        setToolLogs((prev) => [
          ...prev,
          { toolName: name, args, result: err, timestamp: Date.now() },
        ]);
        return err;
      }
      args.image = imageToSend;
    }

    // Endpoint Mapping
    let endpoint = apiUrl("/api/command");
    let method = "POST";
    let body: any = { tool: name, args };

    // --- SYSTEM & FILES ---
    if (name === "createOrUpdateFile") endpoint = apiUrl("/api/files/write");
    else if (name === "listInstalledApps") {
      endpoint = apiUrl("/api/system/apps/list");
      method = "GET";
      body = undefined;
    } else if (name === "closeApp") endpoint = apiUrl("/api/system/apps/close");
    else if (name === "getActiveApp") {
      endpoint = apiUrl("/api/system/apps/active");
      method = "GET";
      body = undefined;
    } else if (name === "getScreenDimensions") {
      endpoint = apiUrl("/api/system/screen/dimensions");
      method = "GET";
      body = undefined;
    } else if (name === "runNativeAutomation")
      endpoint = apiUrl("/api/system/script");
    else if (name === "controlSystem")
      endpoint = apiUrl("/api/control/control-unified");
    else if (name === "controlSystemInput") {
      endpoint = apiUrl("/api/input");
      // SMART DOWNSCALING (Retina Fix)
      if (args.x !== undefined && args.y !== undefined) {
        try {
          const dimRes = await fetch(apiUrl("/api/system/dimensions"));
          const dim = await dimRes.json();
          // If coord appears to be physical (larger than logical), downscale it
          if (args.x > dim.width || args.y > dim.height) {
            args.x = Math.round(args.x / dim.scaleFactor);
            args.y = Math.round(args.y / dim.scaleFactor);
            console.log(
              `[DISPATCH] Auto-scaled coordinates to: ${args.x}, ${args.y}`
            );
          }
        } catch (e) {}
      }
    }
    // Engineer Tools Mapping
    else if (name === "changeDirectory") endpoint = apiUrl("/api/fs/cwd");
    else if (name === "listFiles") endpoint = apiUrl("/api/fs/list");
    else if (name === "readFile") endpoint = apiUrl("/api/fs/read");
    else if (name === "writeProjectFile") endpoint = apiUrl("/api/fs/write");
    // Mobile Tools Mapping
    else if (name === "controlMobileDevice")
      endpoint = apiUrl("/api/mobile/input");
    // Ingest Tool Mapping
    else if (name === "ingestGithubRepo")
      endpoint = apiUrl("/api/knowledge/github");
    else if (name === "readUrl") endpoint = apiUrl("/api/knowledge/scrape");
    // Network Tools
    // --- PROCESS & TERMINAL ---
    else if (name === "executeTerminalCommand")
      endpoint = apiUrl("/api/command");
    // automation.routes handles this
    else if (name === "killProcess")
      endpoint = apiUrl("/api/system/apps/close");
    // Use app close logic
    else if (name === "runPythonScript")
      endpoint = apiUrl("/api/python/execute");
    else if (name === "openInteractiveTerminal")
      endpoint = apiUrl("/api/system/script");
    // Scripting engine can launch terminal
    // --- IOT & CASTING (Standard Mapping) ---
    else if (name === "castToDevice") {
      endpoint = apiUrl("/api/iot/control");
      body = {
        deviceId: args.deviceId,
        action: "CAST",
        params: args,
      };
    } else if (name === "controlSmartTV") endpoint = apiUrl("/api/iot/control");
    // Security Tools Mapping
    else if (name === "sourceCodeFetcher")
      endpoint = apiUrl("/api/security/source");
    else if (name === "constructorResolver")
      endpoint = apiUrl("/api/security/constructor");
    else if (name === "simulateSecurityAudit")
      endpoint = apiUrl("/api/security/simulate");
    else if (name === "codeSanitizer")
      endpoint = apiUrl("/api/security/sanitize");
    else if (name === "storageReader")
      endpoint = apiUrl("/api/security/storage");
    else if (name === "swapRouter")
      endpoint = apiUrl("/api/security/swap-route");
    else if (name === "executionHarness")
      endpoint = apiUrl("/api/security/validate");
    else if (name === "ingestExploitLibrary")
      endpoint = apiUrl("/api/security/ingest-library");
    else if (name === "monitorMempool")
      endpoint = apiUrl("/api/security/mempool");
    else if (name === "scanForAtomicArbs")
      endpoint = apiUrl("/api/security/scan-arbs");
    else if (name === "executeExtraction")
      endpoint = apiUrl("/api/security/extract");
    else if (name === "scanGlobalMempools")
      endpoint = apiUrl("/api/security/scan-global");
    else if (name === "viewGlobalSovereigntyDashboard")
      endpoint = apiUrl("/api/security/dashboard");
    else if (name === "addSecurityGoal") endpoint = apiUrl("/api/goals/add");
    else if (name === "updateSecurityGoalStatus")
      endpoint = apiUrl("/api/goals/update");
    // Build Tool Mapping
    else if (name === "compileSelf") endpoint = apiUrl("/api/build/compile");
    else if (name === "getBuildStatus") {
      const platformParam = args?.platform ? `?platform=${args.platform}` : "";
      endpoint = apiUrl(`/api/build/status${platformParam}`);
      method = "GET";
      body = undefined;
    }
    // C2 Tools
    else if (name === "generateHttpPayload")
      endpoint = apiUrl("/api/c2/generate");
    else if (name === "listC2Sessions") {
      endpoint = apiUrl("/api/c2/sessions");
      method = "GET";
      body = undefined;
    } else if (name === "sendC2Command") endpoint = apiUrl("/api/c2/command");
    // Graph Tools
    else if (name === "addGraphRelations")
      endpoint = apiUrl("/api/memory/graph/merge");
    else if (name === "queryGraphKnowledge")
      endpoint = apiUrl("/api/memory/graph/query");
    // Polymarket
    else if (name === "searchPolymarket") {
      endpoint = apiUrl(
        `/api/finance/polymarket/markets?query=${encodeURIComponent(
          args.query
        )}`
      );
      method = "GET";
      body = undefined;
    }
    // WEB TOOLS (WebSurfer)
    else if (name === "autonomousWebBrowse" || name === "navigateWebPage") {
      endpoint = apiUrl("/api/web/browse");
      // Remap args if necessary, but WebSurfer expects { url }
      if (name === "navigateWebPage" && args.url) {
        body = { url: args.url };
      }
    } else if (name === "clickWebElement") endpoint = apiUrl("/api/web/click");
    else if (name === "typeWebElement") endpoint = apiUrl("/api/web/type");
    // Crypto Tools
    else if (name === "createWallet")
      endpoint = apiUrl("/api/crypto/wallet/create");
    else if (name === "getWalletBalance") {
      endpoint = apiUrl(
        `/api/crypto/balance?chain=${args.chain || "ethereum"}&address=${
          args.address
        }`
      );
      method = "GET";
      body = undefined;
    } else if (name === "sendCryptoTransaction")
      endpoint = apiUrl("/api/crypto/transaction");
    else if (name === "listWallets") {
      endpoint = apiUrl("/api/crypto/wallets");
      method = "GET";
      body = undefined;
    }
    // NEW: Wireless Security Tools
    else if (name === "wifiDeauthAttack")
      endpoint = apiUrl("/api/mobile/wifi-deauth");
    else if (name === "scanWiFiDevices")
      endpoint = apiUrl("/api/mobile/scan-wifi-devices");
    else if (name === "deployCaptivePortal")
      endpoint = apiUrl("/api/mobile/deploy-captive-portal");
    // Assuming this endpoint exists based on intent
    else if (name === "startHighSpeedStream")
      endpoint = apiUrl("/api/mobile/scrcpy");
    // --- HACKING & SECURITY ---
    else if (name === "runNmapScan") endpoint = apiUrl("/api/hacking/nmap");
    else if (name === "runWireshark")
      endpoint = apiUrl("/api/hacking/wireshark");
    else if (name === "runMetasploitExploit")
      endpoint = apiUrl("/api/hacking/metasploit");
    else if (name === "generatePayload")
      endpoint = apiUrl("/api/hacking/payload");
    else if (name === "runBurpSuite") endpoint = apiUrl("/api/hacking/burp");
    else if (name === "runSqlInjectionScan")
      endpoint = apiUrl("/api/hacking/sqli");
    else if (name === "performStressTest")
      endpoint = apiUrl("/api/hacking/stress");
    else if (name === "scanPublicCameras")
      endpoint = apiUrl("/api/hacking/camera");
    // --- CRYPTO & TRADING ---
    else if (name === "createWallet")
      endpoint = apiUrl("/api/crypto/wallet/create");
    else if (name === "getWalletBalance") {
      endpoint = apiUrl(
        `/api/crypto/balance?chain=${args.chain || "ethereum"}&address=${
          args.address
        }`
      );
      method = "GET";
      body = undefined;
    } else if (name === "sendCryptoTransaction")
      endpoint = apiUrl("/api/crypto/transaction");
    else if (name === "listWallets") {
      endpoint = apiUrl("/api/crypto/wallets");
      method = "GET";
      body = undefined;
    }
    // --- FOREX/MT4 TOOLS ---
    else if (name === "executeForexTrade")
      endpoint = apiUrl("/api/forex/trade");
    else if (name === "getForexPositions") {
      endpoint = apiUrl("/api/forex/positions");
      method = "GET";
      body = undefined;
    } else if (name === "closeForexPosition")
      endpoint = apiUrl("/api/forex/close");
    else if (name === "closeAllForexPositions") {
      endpoint = apiUrl("/api/forex/closeAll");
      method = "POST";
      body = JSON.stringify({});
    }
    // --- TRADING (AI Trading, not Forex) ---
    else if (name === "executeTrade") endpoint = apiUrl("/api/trading/execute");
    else if (name === "getPositions") {
      endpoint = apiUrl("/api/trading/positions");
      method = "GET";
      body = undefined;
    }

    // --- MOBILE & ANDROID (WITH ALIASING) ---
    else if (name === "takeAndroidScreenshot" || name === "takeScreenshot")
      endpoint = apiUrl("/api/android/screenshot");
    else if (name === "listAndroidFiles" || name === "listMobileFiles")
      endpoint = apiUrl("/api/android/list-files");
    else if (name === "sendAdbCommand" || name === "executeAndroidCommand")
      endpoint = apiUrl("/api/android/command");
    else if (name === "connectToAndroidDevice")
      endpoint = apiUrl("/api/android/connect-ip");
    else if (name === "tapAndroidElement" || name === "clickAndroidElement")
      endpoint = apiUrl("/api/android/click");
    else if (name === "inputTextAndroid" || name === "injectAndroidText")
      endpoint = apiUrl("/api/android/type");
    else if (name === "getAndroidUITree")
      endpoint = apiUrl("/api/android/ui-tree");
    else if (name === "findAndroidElement")
      endpoint = apiUrl("/api/android/find");
    else if (name === "controlAndroidAgent")
      endpoint = apiUrl("/api/android/control-agent");
    // --- SYSTEM SECURITY & LOCKDOWN ---
    else if (name === "setSystemAlertLevel")
      endpoint = apiUrl("/api/system/alert");
    else if (name === "initiateLockdown")
      endpoint = apiUrl("/api/system/lockdown");
    else if (name === "deploySystemHotspot")
      endpoint = apiUrl("/api/system/hotspot");
    // --- WIRELESS SECURITY (WITH ALIASING) ---
    else if (name === "wifiDeauth" || name === "wifiDeauthAttack")
      endpoint = apiUrl("/api/mobile/wifi-deauth");
    else if (name === "scanWiFiDevices" || name === "scanWifiDevices")
      endpoint = apiUrl("/api/mobile/scan-wifi-devices");
    // --- IOT & CASTING ---
    else if (name === "castToDevice") {
      endpoint = apiUrl("/api/iot/control");
      body = {
        deviceId: args.deviceId,
        action: "CAST",
        params: args,
      };
    }
    // --- OFFICE & WORKSPACE ---
    else if (
      name.startsWith("gmail_") ||
      name.startsWith("drive_") ||
      name.startsWith("calendar_")
    )
      endpoint = apiUrl("/api/google/execute");
    else if (
      name === "readDocument" ||
      name === "createDocument" ||
      name === "analyzeSpreadsheet"
    )
      endpoint = apiUrl("/api/office/execute");
    else if (name === "writeToExcel")
      endpoint = apiUrl("/api/office/excel/write");
    // --- GOALS & AUTONOMY ---
    else if (name === "addSecurityGoal") endpoint = apiUrl("/api/goals/add");
    else if (name === "updateSecurityGoalStatus")
      endpoint = apiUrl("/api/goals/update");
    // Market News
    else if (name === "getMarketNews") {
      const sectorParam = args.sector
        ? `?sector=${encodeURIComponent(args.sector)}`
        : "";
      endpoint = apiUrl(`/api/finance/news${sectorParam}`);
      method = "GET";
      body = undefined;
    }
    // Subsystems
    else if (name === "startSubsystem")
      endpoint = apiUrl("/api/subsystems/start");
    else if (name === "stopSubsystem")
      endpoint = apiUrl(`/api/subsystems/${args.id}/stop`);
    else if (name === "listSubsystems") {
      endpoint = apiUrl("/api/subsystems/list");
      method = "GET";
      body = undefined;
    }
    // Neural Forge
    else if (name === "installFromRecipe")
      endpoint = apiUrl("/api/forge/install");
    else if (name === "listForgeApps") {
      endpoint = apiUrl("/api/forge/list");
      method = "GET";
      body = undefined;
    } else if (name === "getForgeRecipes") {
      endpoint = apiUrl("/api/forge/recipes");
      method = "GET";
      body = undefined;
    }
    // RPC
    else if (name === "executeRpcScript") endpoint = apiUrl("/api/rpc/execute");
    else if (name === "saveMacro") endpoint = apiUrl("/api/rpc/macro/save");
    else if (name === "listMacros") {
      endpoint = apiUrl("/api/rpc/macro/list");
      method = "GET";
      body = undefined;
    }
    // OSINT Tools Mapping
    else if (name === "osintDomainIntel")
      endpoint = apiUrl("/api/osint/domain");
    else if (name === "osintUsernameSearch")
      endpoint = apiUrl("/api/osint/username");
    else if (name === "osintDarkWebScan")
      endpoint = apiUrl("/api/osint/darkweb");
    else if (name === "osintGoogleDork")
      endpoint = apiUrl("/api/osint/google-dork");
    else if (name === "traceSignalSource")
      endpoint = apiUrl("/api/osint/trace");
    else if (name === "refineQuery")
      endpoint = apiUrl("/api/osint/refine-query");
    // WhatsApp
    else if (name === "whatsappSendMessage")
      endpoint = apiUrl("/api/whatsapp/send");
    else if (name === "whatsappGetChats") {
      endpoint = apiUrl("/api/whatsapp/chats");
      method = "GET";
      body = undefined;
    } else if (name === "whatsappReadChat")
      endpoint = apiUrl("/api/whatsapp/chat-history");
    else if (name === "whatsappGetContacts") {
      endpoint = apiUrl(
        `/api/whatsapp/contacts?query=${encodeURIComponent(args.query || "")}`
      );
      method = "GET";
      body = undefined;
    } else if (name === "whatsappSendImage") {
      endpoint = apiUrl("/api/whatsapp/send-image");
    }
    // Telegram
    else if (name === "telegramSendMessage")
      endpoint = apiUrl("/api/telegram/message");
    else if (name === "telegramGetChats")
      endpoint = apiUrl("/api/telegram/chats");
    else if (name === "telegramReadChat")
      endpoint = apiUrl("/api/telegram/history");
    else if (name === "telegramGetContacts")
      endpoint = apiUrl("/api/telegram/contacts");

    // Inject Neural Link Credentials for Telegram (JIT Support)
    if (name.startsWith("telegram")) {
      const tgSettings = settingsService.get("telegram");
      body = {
        ...body,
        apiId: tgSettings.apiId,
        apiHash: tgSettings.apiHash,
      };
    }
    // Figma
    else if (name === "inspectFigmaDesign") {
      endpoint = apiUrl(`/api/figma/file/${args.fileKey}`);
      method = "GET";
      body = undefined;
    }
    // Clipboard
    else if (name === "readClipboard") {
      endpoint = apiUrl("/api/system/clipboard");
      method = "GET";
      body = undefined;
    } else if (name === "writeClipboard")
      endpoint = apiUrl("/api/system/clipboard");
    // Skills
    else if (name === "createCustomSkill")
      endpoint = apiUrl("/api/skills/create");
    else if (name === "generateAndRegisterSkill") {
      // AI-assisted skill generation + registration
      // First generate the skill code
      const generateResponse = await fetch(apiUrl("/api/skills/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: args.description,
          language: args.language || "python",
        }),
      });

      if (!generateResponse.ok) {
        throw new Error("Failed to generate skill code");
      }

      const skillData = await generateResponse.json();

      // Then register it
      endpoint = apiUrl("/api/skills/create");
      body = {
        name: skillData.name,
        description: skillData.description,
        script: skillData.code,
        language: skillData.language,
        inputs: skillData.inputs,
      };
    } else if (name === "listCustomSkills") {
      endpoint = apiUrl("/api/skills/list");
      method = "GET";
      body = undefined;
    } else if (name === "executeCustomSkill")
      endpoint = apiUrl("/api/skills/execute");
    // UI Automation Tree Tool Mapping
    else if (name === "getUITree") {
      endpoint = apiUrl("/api/ui/tree");
      method = "GET";
      body = undefined;
    } else if (name === "findUIElement") endpoint = apiUrl("/api/ui/find");
    else if (name === "clickUIElement") endpoint = apiUrl("/api/ui/click");
    // Project Darwin: Safe Evolution
    else if (name === "evolveCodeSafe")
      endpoint = apiUrl("/api/evolution/evolve");
    // --- SPECIAL: UI-TARS VISION INTEGRATION ---
    else if (name === "readScreen") {
      try {
        // 1. Capture Screen
        const capture = await screenCaptureService.capture();
        const screenshotBase64 = capture.imageBuffer.toString("base64");

        // 2. Get Instruction
        const lastUserMsg = context.messages
          .slice()
          .reverse()
          .find((m) => m.role === "user");
        const instruction = lastUserMsg
          ? lastUserMsg.content
          : "Describe the screen state.";

        // 3. UI-TARS Analysis
        const prediction = await uiTarsService.analyze(
          screenshotBase64,
          instruction
        );

        return `[UI-TARS VISION] Analysis Complete.\nPrediction: ${prediction}`;
      } catch (e: any) {
        return `[UI-TARS] Error: ${e.message}`;
      }
    }
    // --- MIDSCENE-INSPIRED AI TOOLS ---
    else if (name === "aiQuery") endpoint = apiUrl("/api/vision/ai-query");
    else if (name === "aiBoolean") endpoint = apiUrl("/api/vision/ai-boolean");
    else if (name === "aiAssert") endpoint = apiUrl("/api/vision/ai-assert");
    else if (name === "aiLocate") endpoint = apiUrl("/api/vision/ai-locate");
    else if (name === "aiWaitFor") endpoint = apiUrl("/api/vision/ai-wait-for");
    else if (name === "aiAct") endpoint = apiUrl("/api/vision/ai-act");

    try {
      const options: RequestInit = {
        method: method,
        headers:
          method === "POST"
            ? { "Content-Type": "application/json" }
            : undefined,
        body: method === "POST" ? JSON.stringify(body) : undefined,
      };

      const res = await fetch(endpoint, options);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();

        // --- AUTOMATIC OSINT DOSSIER TRIGGERING ---
        if (
          (name === "osintDomainIntel" ||
            name === "osintUsernameSearch" ||
            name === "osintDarkWebScan" ||
            name === "osintGoogleDork") &&
          context.setOsintProfile &&
          context.setShowOsintDossier
        ) {
          // Normalize backend response to OsintProfile shape
          const hits: any[] = [];
          const meta: Record<string, string> = {
            SOURCE: "NEURAL_LINK_NODE_X7",
            TIMESTAMP: new Date().toISOString(),
          };

          if (name === "osintUsernameSearch" && data.matches) {
            data.matches.forEach((m: any) => {
              hits.push({
                platform: m.platform,
                url: m.url,
                category: "SOCIAL",
                confidence: m.status === "FOUND" ? 1.0 : 0.0,
              });
            });
            meta.PLATFORMS_SCANNED = data.matches.length.toString();
          } else if (name === "osintDomainIntel" && data.intel) {
            if (data.intel.dns) {
              if (data.intel.dns.A) {
                data.intel.dns.A.forEach((ip: string) => {
                  hits.push({
                    platform: "DNS_A",
                    url: ip,
                    category: "DOMAIN",
                    confidence: 1.0,
                  });
                });
              }
              if (data.intel.dns.MX) {
                data.intel.dns.MX.forEach((ex: string) => {
                  hits.push({
                    platform: "DNS_MX",
                    url: ex,
                    category: "DOMAIN",
                    confidence: 1.0,
                  });
                });
              }
            }
          }

          const osintProfile = {
            target: args.domain || args.username || args.query || data.target,
            riskScore: name === "osintDarkWebScan" ? 85 : 45, // Heuristic
            hits: hits,
            status: "COMPLETE",
            meta: meta,
            intel: data.intel || undefined,
          };

          context.setOsintProfile(osintProfile);
          context.setShowOsintDossier(true);

          // SIGNAL FOR AUTOMATIC RESULT CASTING (VISUAL CORE HUD)
          if (context.setVisualData) {
            context.setVisualData({
              type: "OSINT",
              topic: "INTEL_DOSSIER",
              profile: osintProfile,
            });
          }
        }

        // --- AUTOMATIC STOCKS CASTING ---
        if (
          (name === "getMarketNews" ||
            name === "searchPolymarket" ||
            name === "executeTrade" ||
            name === "getPositions") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "STOCKS",
            topic: "MARKET_TERMINAL",
            symbol: args.symbol || args.query || "MARKET",
            data: data,
          });
        }

        // --- AUTOMATIC AUTONOMY CASTING ---
        if (
          (name === "addSecurityGoal" || name === "updateSecurityGoalStatus") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "AUTONOMY",
            topic: "GOAL_MATRIX",
            data: data,
          });
        }

        // --- AUTOMATIC SUBSYSTEMS CASTING ---
        if (
          (name === "startSubsystem" ||
            name === "stopSubsystem" ||
            name === "listSubsystems") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "SUBSYSTEMS",
            topic: "SUBSYSTEM_DASHBOARD",
            data: data,
          });
        }

        // --- AUTOMATIC CODE EDITOR CASTING ---
        if (
          (name === "readFile" ||
            name === "writeProjectFile" ||
            name === "createOrUpdateFile") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "CODE_EDITOR",
            topic: "CODE_PANEL",
            cwd: args.path || args.directory || "/",
            data: data,
          });
        }

        // --- AUTOMATIC SKILLS CASTING ---
        if (
          (name === "generateAndRegisterSkill" ||
            name === "executeCustomSkill" ||
            name === "listCustomSkills") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "SKILLS",
            topic: "SKILLS_MATRIX",
            data: data,
          });
        }

        // --- AUTOMATIC CRYPTO CASTING ---
        if (
          (name === "createWallet" ||
            name === "getWalletBalance" ||
            name === "sendCryptoTransaction" ||
            name === "listWallets") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "CRYPTO",
            topic: "CRYPTO_TERMINAL",
            data: data,
          });
        }

        // --- AUTOMATIC FOREX CASTING ---
        if (
          (name === "openForexTrade" ||
            name === "closeForexTrade" ||
            name === "getForexPositions") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "FOREX",
            topic: "FOREX_TERMINAL",
            data: data,
          });
        }

        // --- AUTOMATIC PREDICTIONS CASTING ---
        if (
          (name === "searchPolymarket" || name === "placePredictionBet") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "PREDICTIONS",
            topic: "PREDICTION_MARKETS",
            data: data,
          });
        }

        // --- AUTOMATIC NETWORK CASTING ---
        if (
          (name === "scanNetwork" ||
            name === "generateNetworkMap" ||
            name === "runNmapScan") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "NETWORK",
            topic: "NETWORK_MAP",
            data: data,
          });
        }

        // --- AUTOMATIC HACKING CASTING ---
        if (
          (name === "runMetasploitExploit" ||
            name === "generatePayload" ||
            name === "runBurpSuite" ||
            name === "runSqlInjectionScan" ||
            name === "runWiresharkCapture" ||
            name === "runJohnRipper" ||
            name === "runCobaltStrike") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "HACKING",
            topic: "HACKING_TERMINAL",
            data: data,
          });
        }

        // --- AUTOMATIC REPORTS CASTING ---
        if (
          (name === "generateInvestigationReport" ||
            name === "getInvestigationReports" ||
            name === "exportReport") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "REPORTS",
            topic: "INVESTIGATION_REPORTS",
            data: data,
          });
        }

        // --- AUTOMATIC GEO CASTING ---
        if (
          (name === "getGeoLocation" ||
            name === "trackTarget" ||
            name === "plotTacticalMarkers") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "GEO",
            topic: "TACTICAL_MAP",
            targetName: args.target || "Unknown",
            markers: data.markers || [],
            data: data,
          });
        }

        // --- AUTOMATIC LIVE CONTENT CASTING ---
        if (
          (name === "searchLiveContent" || name === "getGroundingMetadata") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "LIVE",
            topic: "LIVE_INTEL",
            content: data,
            data: data,
          });
        }

        // --- AUTOMATIC FILES CASTING ---
        if (
          (name === "browseRemoteFiles" ||
            name === "listMobileFiles" ||
            name === "downloadFile") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "FILES",
            topic: "FILE_BROWSER",
            data: data,
          });
        }

        // --- AUTOMATIC RECORDER CASTING ---
        if (
          (name === "startRecording" ||
            name === "stopRecording" ||
            name === "saveImprint") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "RECORDER",
            topic: "NEURAL_RECORDER",
            data: data,
          });
        }

        // --- AUTOMATIC TELEGRAM CASTING ---
        if (
          (name === "sendTelegramMessage" ||
            name === "getTelegramChats" ||
            name === "checkTelegramStatus") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "TELEGRAM",
            topic: "TELEGRAM_MANAGER",
            data: data,
          });
        }

        // --- AUTOMATIC WHATSAPP CASTING ---
        if (
          (name === "sendWhatsAppMessage" ||
            name === "getWhatsAppChats" ||
            name === "checkWhatsAppStatus") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "WHATSAPP",
            topic: "WHATSAPP_MANAGER",
            data: data,
          });
        }

        // --- AUTOMATIC WIRELESS CASTING ---
        if (
          (name === "scanWifi" ||
            name === "scanBluetooth" ||
            name === "connectWifi" ||
            name === "startHotspot") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "WIRELESS",
            topic: "WIRELESS_MANAGER",
            data: data,
          });
        }

        // --- AUTOMATIC INGESTION CASTING ---
        if (
          (name === "ingestRepository" ||
            name === "ingestKnowledge" ||
            name === "cloneAndAnalyze") &&
          context.setVisualData
        ) {
          context.setVisualData({
            type: "INGESTION",
            topic: "KNOWLEDGE_INGESTION",
            data: data,
          });
        }

        // --- AUTOMATIC CRYPTO SYNC ---
        if (
          (name === "createWallet" ||
            name === "listWallets" ||
            name === "getWalletBalance") &&
          context.setCryptoWallet
        ) {
          const wallets = Array.isArray(data) ? data : data.wallets || [];
          if (wallets.length > 0) {
            const primary = wallets[0];
            context.setCryptoWallet({
              address: primary.address,
              chain: primary.chain || "ETH",
              privateKey: primary.privateKey || "REDACTED",
              assets: primary.assets || [],
              totalValueUsd: primary.totalValueUsd || 0,
            });
          } else if (data.address) {
            // Case for createWallet direct result
            context.setCryptoWallet({
              address: data.address,
              chain: data.chain || "ETH",
              privateKey: data.privateKey || "REDACTED",
              assets: data.assets || [],
              totalValueUsd: data.totalValueUsd || 0,
            });
          }
        }

        // --- AUTOMATIC TRADING SYNC ---
        if (
          (name === "getPositions" || name === "executeTrade") &&
          context.setForexAccount
        ) {
          const positions = Array.isArray(data) ? data : data.positions || [];
          if (positions.length > 0 || name === "getPositions") {
            context.setForexAccount({
              accountId: "FX-REAL-BACKEND",
              baseCurrency: "USD",
              balance: 100000.0,
              equity: 100000.0,
              margin: 0,
              freeMargin: 100000.0,
              leverage: 100,
              positions: positions.map((p: any) => ({
                id: p.id || Math.random().toString(),
                pair: p.symbol || p.pair,
                type: p.side === "SELL" ? "SHORT" : "LONG",
                lots: p.amount || p.lots || 0.1,
                entryPrice: p.entryPrice || 0,
                currentPrice: p.currentPrice || p.entryPrice || 0,
                pnl: p.unrealizedPnl || 0,
              })),
            });
          }
        }

        // --- AUTOMATIC CINEMA CASTING ---
        // Detect video/streaming content and cast to Cinema player
        const videoExtensions = [
          ".mp4",
          ".webm",
          ".mkv",
          ".avi",
          ".mov",
          ".m4v",
        ];

        // DRM platforms that require webview for Widevine support
        const drmDomains = [
          "netflix.com",
          "disneyplus.com",
          "hbomax.com",
          "max.com",
          "hulu.com",
          "primevideo.com",
          "amazon.com/video",
          "peacocktv.com",
          "paramountplus.com",
          "appletv.apple.com",
        ];

        // Non-DRM streaming platforms
        const streamingDomains = [
          "youtube.com",
          "youtu.be",
          "vimeo.com",
          "twitch.tv",
          "dailymotion.com",
        ];

        const urlArg = args?.url || args?.videoUrl || args?.target || "";
        const isVideoFile = videoExtensions.some((ext) =>
          urlArg.toLowerCase().includes(ext)
        );
        const isDrmPlatform = drmDomains.some((domain) =>
          urlArg.toLowerCase().includes(domain)
        );
        const isStreamingService = streamingDomains.some((domain) =>
          urlArg.toLowerCase().includes(domain)
        );

        if (
          (name === "openWebview" ||
            name === "autonomousWebBrowse" ||
            name === "navigateWebPage" ||
            name === "startHighSpeedStream" ||
            name === "castToDevice" ||
            name === "playMedia" ||
            name === "playVideo") &&
          (isVideoFile || isStreamingService || isDrmPlatform) &&
          context.setCinemaUrl
        ) {
          // Determine source type based on content
          let sourceType: "youtube" | "local" | "stream" | "file" | "webview" =
            "stream";

          if (isDrmPlatform) {
            // DRM platforms use webview with Widevine
            sourceType = "webview";
          } else if (
            urlArg.includes("youtube.com") ||
            urlArg.includes("youtu.be")
          ) {
            sourceType = "youtube";
          } else if (isVideoFile) {
            sourceType = urlArg.startsWith("http") ? "stream" : "file";
          }

          context.setCinemaUrl(
            urlArg,
            sourceType,
            args?.title || (isDrmPlatform ? "Streaming (DRM)" : "Now Streaming")
          );
        }

        return JSON.stringify(data, null, 2);
      } else {
        return await res.text();
      }
    } catch (e: any) {
      return `ERROR executing ${name}: ${e.message}`;
    }
  }
}
