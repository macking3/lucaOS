/**
 * Local Router Service
 * Prototype: Simulates FunctionGemma intent classification and tool routing.
 * Focus: High-speed local execution for "Zero-Cloud" tools.
 */

export const classifyIntent = async (text) => {
  const input = text.toLowerCase();
  
  // SCORING SYSTEM (Categorized for Zero-Cloud Tools)
  const scores = {
    // --- 1. SYSTEM & CONTROL ---
    clearChatHistory: (input.includes("clear") && (input.includes("chat") || input.includes("history"))) ? 0.95 : 0,
    restartConversation: (input.includes("restart") || input.includes("start over")) ? 0.95 : 0,
    controlSystemInput: (input.includes("type") || input.includes("click") || input.includes("press") || input.includes("move mouse")) ? 0.9 : 0,
    launchApp: (input.includes("open") || input.includes("launch") || input.includes("start")) && !input.includes("url") ? 0.8 : 0,
    closeApp: (input.includes("close") || input.includes("quit") || input.includes("kill")) && (input.includes("app") || input.includes("program")) ? 0.9 : 0,
    runSystemDiagnostics: (input.includes("diagnostic") || input.includes("system check") || input.includes("health check")) ? 0.95 : 0,
    setSystemAlertLevel: (input.includes("alert level") || input.includes("security level")) ? 0.95 : 0,
    readClipboard: (input.includes("read clipboard") || input.includes("what is in my clipboard")) ? 0.95 : 0,
    writeClipboard: (input.includes("copy to clipboard") || input.includes("write to clipboard")) ? 0.95 : 0,
    killProcess: (input.includes("kill process") || input.includes("stop process")) ? 0.95 : 0,

    // --- 2. FILE SYSTEM & PROJECTS ---
    listFiles: (input.includes("list files") || input.includes("show contents of directory") || input.includes("ls")) ? 0.95 : 0,
    readFile: (input.includes("read file") || input.includes("cat ") || input.includes("show file")) ? 0.9 : 0,
    changeDirectory: (input.includes("change directory") || input.includes("cd ") || input.includes("go to folder")) ? 0.95 : 0,
    createOrUpdateFile: (input.includes("create file") || input.includes("write file") || input.includes("save file")) ? 0.85 : 0,
    openFileBrowser: (input.includes("open browser") || input.includes("file explorer")) && input.includes("file") ? 0.95 : 0,

    // --- 3. EXECUTION & SCRIPTING ---
    runPythonScript: (input.includes("run") || input.includes("execute")) && (input.includes("script") || input.includes("python") || input.includes(".py")) ? 0.95 : 0,
    executeTerminalCommand: (input.includes("run") || input.includes("exec")) && (input.includes("command") || input.includes("terminal") || input.includes("shell") || input.includes("bash")) ? 0.95 : 0,
    openInteractiveTerminal: (input.includes("interactive terminal") || input.includes("open shell")) ? 0.95 : 0,

    // --- 4. COMMUNICATIONS (Relays) ---
    whatsappSendMessage: (input.includes("whatsapp") && input.includes("send")) ? 0.98 : 0,
    telegramSendMessage: (input.includes("telegram") && input.includes("send")) ? 0.98 : 0,
    sendInstantMessage: (input.includes("send") || input.includes("message") || input.includes("text")) && !input.includes("whatsapp") && !input.includes("telegram") ? 0.8 : 0,

    // --- 5. NETWORK & SECURITY ---
    runNmapScan: (input.includes("scan network") || input.includes("nmap") || input.includes("open ports") || input.includes("port scan")) ? 0.98 : 0,
    wifiDeauth: (input.includes("kick from wifi") || input.includes("deauth") || input.includes("disconnect user")) ? 0.98 : 0,
    scanWifiDevices: (input.includes("scan wifi") || input.includes("find networks") || input.includes("wifi scan")) ? 0.98 : 0,
    scanBluetoothSpectrum: (input.includes("bluetooth scan") || input.includes("find bluetooth") || input.includes("scan bt")) ? 0.98 : 0,
    analyzeNetworkTraffic: (input.includes("sniff") || input.includes("traffic") || input.includes("analyze network")) ? 0.9 : 0,

    // --- 6. MOBILE & ANDROID (ADB) ---
    takeAndroidScreenshot: (input.includes("phone screenshot") || input.includes("android screenshot") || input.includes("snap phone")) ? 0.98 : 0,
    listAndroidDevices: (input.includes("list devices") || input.includes("adb devices") || input.includes("show connected phones")) ? 0.98 : 0,
    sendAdbCommand: (input.includes("adb command") || input.includes("send to phone")) ? 0.9 : 0,
    tapAndroidElement: (input.includes("tap") || input.includes("touch")) && (input.includes("phone") || input.includes("android")) ? 0.9 : 0,
    installApk: (input.includes("install apk") || input.includes("sideload")) ? 0.98 : 0,

    // --- 7. MEMORY & LOCAL DB ---
    rememberFact: (input.includes("remember") || input.includes("save to memory") || input.includes("keep in mind")) ? 0.95 : 0,
    retrieveMemory: (input.includes("search memory") || input.includes("recall") || input.includes("what do you know about")) ? 0.9 : 0,
    storeCredentials: (input.includes("save password") || input.includes("store credentials")) ? 0.98 : 0,
    retrieveCredentials: (input.includes("get password") || input.includes("retrieve login")) ? 0.98 : 0,

    // --- 8. SYSTEM INFORMATION & HARDWARE CONTROL ---
    getBatteryStatus: (input.includes("battery") && (input.includes("percentage") || input.includes("level") || input.includes("status") || input.includes("charge") || input.includes("how much") || input.includes("what") || input.includes("check"))) ? 0.98 : 0,
    controlSystem: (
      (input.includes("volume") && (input.includes("set") || input.includes("change") || input.includes("increase") || input.includes("decrease") || input.match(/\d+/))) ||
      (input.includes("mute") || input.includes("unmute")) ||
      (input.includes("brightness") && (input.includes("set") || input.includes("change") || input.includes("increase") || input.includes("decrease"))) ||
      (input.includes("play") || input.includes("pause") || input.includes("next") || input.includes("previous")) && (input.includes("song") || input.includes("track") || input.includes("music"))
    ) ? 0.95 : 0,
    getSystemLoad: (input.includes("cpu") || input.includes("memory") || input.includes("ram") || input.includes("system load") || input.includes("performance")) && (input.includes("usage") || input.includes("status") || input.includes("check") || input.includes("how much")) ? 0.95 : 0,
    getScreenDimensions: (input.includes("screen") && (input.includes("size") || input.includes("resolution") || input.includes("dimensions"))) ? 0.95 : 0,
    
    // --- 9. SMART HOME & IOT ---

    controlSmartTV: (input.includes("tv")) && (input.includes("on") || input.includes("off") || input.includes("volume") || input.includes("power")) ? 0.9 : 0,
    connectSmartTV: (input.includes("connect to tv") || input.includes("pair tv")) ? 0.95 : 0,
  };

  // Find the highest score
  const sortedTools = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestTool, confidence] = sortedTools[0];

  if (confidence > 0.6) {
    // EXTRACTION LOGIC
    const parameters = {};
    
    // URL Extraction
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    if (urlMatch) parameters.url = urlMatch[0];

    // Recipient Extraction
    const toMatch = input.match(/to ([\w\s]+)/);
    if (toMatch && toMatch[1]) {
        // Clean up recipient (e.g. "to Alice" -> "Alice")
        parameters.recipient = toMatch[1].split(" ")[0].trim();
    }

    // Command/Text Extraction (for execution/messaging)
    if (input.includes(" \"") && input.includes("\"")) {
        const textMatch = input.match(/"([^"]+)"/);
        if (textMatch) parameters.text = textMatch[1];
        if (textMatch) parameters.command = textMatch[1]; // Alias for terminal
    }

    // System Control Action Extraction
    if (bestTool === 'controlSystem') {
        // Volume control
        if (input.includes('volume')) {
            const volumeMatch = input.match(/\d+/);
            if (volumeMatch) {
                parameters.action = 'SET_VOLUME';
                parameters.level = parseInt(volumeMatch[0]);
            } else if (input.includes('mute')) {
                parameters.action = 'MUTE';
            } else if (input.includes('unmute')) {
                parameters.action = 'UNMUTE';
            }
        }
        // Media controls
        else if (input.includes('play')) parameters.action = 'PLAY';
        else if (input.includes('pause')) parameters.action = 'PAUSE';
        else if (input.includes('next')) parameters.action = 'NEXT_TRACK';
        else if (input.includes('previous') || input.includes('prev')) parameters.action = 'PREV_TRACK';
        // Brightness
        else if (input.includes('brightness')) {
            const brightnessMatch = input.match(/\d+/);
            if (brightnessMatch) {
                parameters.action = 'SET_BRIGHTNESS';
                parameters.level = parseInt(brightnessMatch[0]);
            }
        }
    }

    // Battery Status - map to controlSystem with GET_BATTERY action
    if (bestTool === 'getBatteryStatus') {
        parameters.action = 'GET_BATTERY';
        // Override tool to use controlSystem
        return {
          success: true,
          thought: `Zero-Cloud Intercept: Battery query mapped to controlSystem with ${(confidence * 100).toFixed(0)}% confidence.`,
          tool: 'controlSystem',
          confidence,
          parameters
        };
    }

    return {
      success: true,
      thought: `Zero-Cloud Intercept: ${bestTool} mapped with ${(confidence * 100).toFixed(0)}% confidence.`,
      tool: bestTool,
      confidence,
      parameters
    };
  }


  return {
    success: true,
    thought: "Intent requires cloud reasoning or no high-confidence local tool found.",
    tool: null,
    confidence: 0
  };
};
