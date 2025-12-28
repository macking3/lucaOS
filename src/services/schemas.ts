import { z } from "zod";

// Always-On Audio Monitoring Schema (defined before ToolSchemas)
export const controlAlwaysOnAudioSchema = z.object({
  action: z.enum(["start", "stop", "status"]),
  captureInterval: z.number().optional(),
  sensitivity: z.number().min(0).max(1).optional(),
});

export const ToolSchemas = {
  // --- DYNAMIC REGISTRY ---
  searchAndInstallTools: z.object({
    query: z.string(),
  }),

  // --- OFFICE & SKILLS (NEW) ---
  readDocument: z.object({
    filePath: z.string(),
    type: z.enum(["PDF", "DOCX", "XLSX", "PPTX", "AUTO"]).optional(),
  }),
  createDocument: z.object({
    fileName: z.string(),
    type: z.enum(["PDF", "DOCX", "PPTX"]),
    content: z.string(), // For PDF/DOCX text, or JSON structure for PPTX
    title: z.string().optional(),
  }),
  analyzeSpreadsheet: z.object({
    filePath: z.string(),
    query: z.string().optional(), // e.g., "Calculate average of column B"
  }),
  createCustomSkill: z.object({
    name: z.string(),
    description: z.string(),
    script: z.string(),
    language: z.enum(["python", "node"]),
    inputs: z.array(z.string()).optional(),
  }),
  listCustomSkills: z.object({}),
  executeCustomSkill: z.object({
    skillName: z.string(),
    args: z.record(z.string(), z.any()),
  }),

  // --- CLIPBOARD & TEXT TOOLS ---
  readClipboard: z.object({}),
  writeClipboard: z.object({
    content: z.string(),
  }),
  proofreadText: z.object({
    text: z.string(),
    style: z
      .enum(["PROFESSIONAL", "CASUAL", "ACADEMIC", "TECHNICAL"])
      .optional(),
  }),

  // --- CORE SYSTEM ---
  setSystemAlertLevel: z.object({
    level: z.enum(["NORMAL", "CAUTION", "CRITICAL"]),
  }),
  initiateLockdown: z.object({}),
  controlDevice: z.object({
    deviceId: z.string(),
    action: z.enum(["on", "off"]),
  }),
  runDiagnostics: z.object({
    scanLevel: z.enum(["quick", "deep"]),
  }),
  executeTerminalCommand: z.object({
    command: z.string(),
  }),
  openInteractiveTerminal: z.object({
    command: z.string(),
  }),
  clearChatHistory: z.object({
    confirm: z.boolean(),
  }),
  restartConversation: z.object({
    confirm: z.boolean(),
  }),
  requestFullSystemPermissions: z.object({
    justification: z.string().optional(),
  }),
  controlAlwaysOnVision: z.object({
    action: z.enum(["start", "stop", "status"]),
    captureInterval: z
      .number()
      .optional()
      .describe("Capture interval in milliseconds (default: 30000)"),
  }),
  controlAlwaysOnAudio: controlAlwaysOnAudioSchema,
  broadcastGlobalDirective: z.object({
    command: z.string(),
    scope: z.enum(["ALL", "SPECIFIC_REGION", "DEBUG"]).optional(),
    forceOverride: z.boolean().optional(),
  }),
  controlSystem: z.object({
    action: z.string(),
    parameter: z.string().optional(),
    targetApp: z.string().optional(),
    platform: z.string().optional(),
  }),
  controlSystemInput: z.object({
    type: z.enum([
      "CLICK",
      "TYPE",
      "MOVE",
      "RIGHT_CLICK",
      "DOUBLE_CLICK",
      "DRAG",
    ]),
    key: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    x2: z.number().optional(),
    y2: z.number().optional(),
  }),
  getScreenDimensions: z.object({}),

  // --- KNOWLEDGE & FILES ---
  ingestGithubRepo: z.object({
    url: z.string(),
  }),
  readUrl: z.object({
    url: z.string(),
  }),
  readScreen: z.object({}),

  // ===== MIDSCENE-INSPIRED AI TOOLS =====
  aiQuery: z.object({
    query: z.string(),
    includeDom: z.boolean().optional(),
  }),
  aiBoolean: z.object({
    question: z.string(),
  }),
  aiAssert: z.object({
    assertion: z.string(),
  }),
  aiLocate: z.object({
    description: z.string(),
  }),
  aiWaitFor: z.object({
    condition: z.string(),
    timeout: z.number().optional(),
    interval: z.number().optional(),
  }),
  aiAct: z.object({
    instruction: z.string(),
    maxSteps: z.number().optional(),
    context: z.string().optional(),
  }),
  changeDirectory: z.object({
    path: z.string(),
  }),
  listFiles: z.object({
    path: z.string().optional(),
  }),
  readFile: z.object({
    path: z.string(),
  }),
  writeProjectFile: z.object({
    path: z.string(),
    content: z.string(),
  }),
  createOrUpdateFile: z.object({
    fileName: z.string(),
    content: z.string(),
  }),
  auditSourceCode: z.object({
    language: z.string(),
    snippet: z.string().optional(),
    filePath: z.string().optional(),
  }),
  runPythonScript: z.object({
    script: z.string(),
  }),
  openCodeEditor: z.object({}),

  // --- BUILD & DEPLOY ---
  compileSelf: z.object({
    target: z.enum(["win", "mac", "linux"]),
    publish: z.boolean().optional(),
  }),

  // --- NETWORK & WIRELESS ---
  scanNetwork: z.object({
    frequency: z.enum(["2.4GHz", "5GHz", "ALL"]).optional(),
  }),
  generateNetworkMap: z.object({}),
  analyzeNetworkTraffic: z.object({}),
  traceSignalSource: z.object({
    targetIdentifier: z.string(),
  }),
  scanBluetoothSpectrum: z.object({}),
  manageBluetoothDevices: z.object({
    action: z.enum(["LIST", "CONNECT", "DISCONNECT", "PAIR"]),
    deviceId: z.string().optional(),
  }),
  deploySystemHotspot: z.object({
    ssid: z.string(),
    password: z.string().optional(),
    securityMode: z.enum(["WPA2", "WPA3"]).optional(),
    generatePassword: z.boolean().optional(),
    isHidden: z.boolean().optional(),
  }),
  initiateWirelessConnection: z.object({
    targetIdentifier: z.string(),
    protocol: z.enum(["WIFI", "BLUETOOTH", "WLAN_DIRECT", "HOTSPOT"]),
    credentials: z.string().optional(),
  }),

  // --- MOBILE ---
  generateCompanionPairingCode: z.object({}),
  locateMobileDevice: z.object({}),
  manageMobileDevice: z.object({
    deviceId: z.string(),
  }),
  controlMobileDevice: z.object({
    action: z.enum(["TAP", "TEXT", "KEY", "SWIPE", "SCREENSHOT"]),
    x: z.number().optional(),
    y: z.number().optional(),
    text: z.string().optional(),
    keyCode: z.number().optional(),
  }),
  connectWirelessTarget: z.object({
    ip: z.string(),
    port: z.number().optional(),
  }),
  enableWirelessADB: z.object({
    port: z
      .number()
      .optional()
      .describe("Port to enable WiFi ADB on (default 5555)."),
  }),
  scanAndroidDevices: z.object({
    network: z
      .string()
      .optional()
      .describe('Network CIDR to scan (e.g., "192.168.1.0/24").'),
    port: z.number().optional().describe("ADB port to scan (default 5555)."),
    timeout: z
      .number()
      .optional()
      .describe("Timeout per host in milliseconds."),
    useNmap: z
      .boolean()
      .optional()
      .describe("Use nmap for faster scanning if available."),
    autoConnect: z
      .boolean()
      .optional()
      .describe("If true, automatically connect to first found device."),
  }),
  connectToAndroidDevice: z.object({
    network: z.string().optional().describe("Network CIDR to scan."),
    port: z.number().optional().describe("ADB port to scan (default 5555)."),
    ip: z
      .string()
      .optional()
      .describe("Optional: Direct IP address to connect to (skips scanning)."),
  }),
  installAndroidAPK: z.object({
    apkPath: z
      .string()
      .describe("Path to APK file (local path or HTTP/HTTPS URL)."),
    packageName: z.string().optional().describe("Optional: Package name."),
    replace: z
      .boolean()
      .optional()
      .describe("If true, replace existing app if already installed."),
  }),
  uninstallAndroidAPK: z.object({
    packageName: z.string().describe("Package name to uninstall."),
    keepData: z
      .boolean()
      .optional()
      .describe("If true, keep app data and cache."),
  }),
  pairAndroidDevice: z.object({
    ip: z.string().describe("Target device IP address."),
    port: z.number().optional().describe("Pairing port (default 5555)."),
    pairingCode: z
      .string()
      .optional()
      .describe("6-digit pairing code shown on device screen."),
  }),
  getAndroidDeviceIP: z.object({}),
  connectMobileViaQR: z.object({}),
  sendMobileCommand: z.object({
    deviceId: z.string().describe("Device ID from connected devices list."),
    command: z
      .any()
      .describe(
        'Command to execute: { type: "vibrate"|"notification"|"location", ...params }'
      ),
  }),
  listConnectedMobileDevices: z.object({}),
  deployCaptivePortal: z.object({
    ssid: z.string().optional().describe("WiFi SSID name."),
    password: z.string().optional().describe("WiFi password."),
    portalContent: z
      .string()
      .optional()
      .describe("Custom HTML for captive portal."),
  }),
  wifiDeauthAttack: z.object({
    targetMAC: z.string().describe("Target device MAC address."),
    interface: z.string().optional().describe("Network interface."),
    count: z.number().optional().describe("Number of deauth packets to send."),
  }),
  scanWiFiDevices: z.object({
    interface: z.string().optional().describe("Network interface to scan."),
  }),
  exfiltrateData: z.object({
    type: z.enum(["SMS", "CALLS"]),
  }),
  killProcess: z.object({
    package: z.string(),
  }),

  // --- MEMORY & GRAPH ---
  storeMemory: z.object({
    key: z.string(),
    value: z.string(),
    category: z.enum([
      "PREFERENCE",
      "FACT",
      "PROTOCOL",
      "SECURITY",
      "USER_STATE",
      "SESSION_STATE",
      "AGENT_STATE",
    ]),
  }),
  retrieveMemory: z.object({
    query: z.string(),
  }),
  addGraphRelations: z.object({
    triples: z.array(
      z.object({
        source: z.string(),
        relation: z.string(),
        target: z.string(),
      })
    ),
    namespace: z.string().optional(),
  }),
  queryGraphKnowledge: z.object({
    entity: z.string(),
    depth: z.number().optional(),
  }),

  // --- MANAGEMENT ---
  createTask: z.object({
    title: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    description: z.string().optional(),
  }),
  updateTaskStatus: z.object({
    taskId: z.string(),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "BLOCKED"]),
  }),
  scheduleEvent: z.object({
    title: z.string(),
    startTimeISO: z.string().optional(),
    type: z.enum(["MEETING", "DEADLINE", "MAINTENANCE"]),
  }),
  installCapability: z.object({
    capabilityName: z.string(),
    justification: z.string().optional(),
  }),

  // --- FINANCE ---
  createWallet: z.object({
    chain: z.enum(["ETH", "SOL", "BTC"]),
  }),
  analyzeToken: z.object({
    symbol: z.string(),
  }),
  executeSwap: z.object({
    action: z.enum(["BUY", "SELL"]),
    token: z.string(),
    amount: z.number(),
  }),
  createForexAccount: z.object({
    leverage: z.number().optional(),
    baseCurrency: z.string().optional(),
  }),
  analyzeForexPair: z.object({
    pair: z.string(),
  }),
  executeForexTrade: z.object({
    action: z.enum(["BUY", "SELL"]),
    pair: z.string(),
    lots: z.number(),
  }),

  // --- STOCK MARKET (ROBINHOOD STYLE) ---
  analyzeStock: z.object({
    symbol: z.string(),
  }),
  getMarketNews: z.object({
    sector: z.string().optional(),
  }),

  // --- POLYMARKET (PREDICTION) ---
  searchPolymarket: z.object({
    query: z.string(),
  }),
  placePolymarketBet: z.object({
    marketId: z.string(),
    outcome: z.enum(["Yes", "No"]),
    amount: z.number(),
  }),
  getPolymarketPositions: z.object({}),

  // --- OSINT & SECURITY ---
  osintUsernameSearch: z.object({
    username: z.string(),
  }),
  osintDomainIntel: z.object({
    domain: z.string(),
  }),
  osintDarkWebScan: z.object({
    query: z.string(),
    engines: z.array(z.string()).optional(),
    maxResults: z.number().optional(),
    refineQuery: z.boolean().optional(),
    searchVariations: z.boolean().optional(),
    context: z.string().optional(),
  }),
  refineQuery: z.object({
    query: z.string(),
    context: z.string().optional(),
    generateVariations: z.boolean().optional(),
  }),
  runNmapScan: z.object({
    target: z.string(),
    scanType: z.enum(["QUICK", "FULL", "SERVICE", "OS_DETECT"]),
  }),
  runMetasploitExploit: z.object({
    target: z.string(),
    module: z.string(),
  }),
  generatePayload: z.object({
    os: z.enum(["windows", "linux", "android", "osx"]),
    lhost: z.string(),
    lport: z.number(),
    format: z.enum(["exe", "elf", "apk", "raw"]).optional(),
  }),
  generateHttpPayload: z.object({
    lhost: z.string().optional(),
    lport: z.number().optional(),
    fileName: z.string().optional(),
  }),
  listC2Sessions: z.object({}),
  sendC2Command: z.object({
    sessionId: z.string(),
    command: z.string(),
  }),
  runBurpSuite: z.object({
    url: z.string(),
    scanMode: z.enum(["PASSIVE", "ACTIVE"]).optional(),
  }),
  runWiresharkCapture: z.object({
    interface: z.string().optional(),
    duration: z.number(),
  }),
  runJohnRipper: z.object({
    hash: z.string(),
    format: z.string().optional(),
  }),
  runCobaltStrike: z.object({
    listenerIP: z.string(),
    payloadType: z.enum(["HTTP", "DNS", "SMB"]).optional(),
  }),

  // NEW: L0p4 TOOLKIT INTEGRATIONS
  runSqlInjectionScan: z.object({
    targetUrl: z.string(),
    params: z.string().optional(),
  }),
  performStressTest: z.object({
    target: z.string(),
    port: z.number(),
    method: z.enum(["HTTP_FLOOD", "UDP_FLOOD", "SYN_FLOOD"]),
    duration: z.number().optional(),
  }),
  scanPublicCameras: z.object({
    query: z.string().optional(),
    limit: z.number().optional(),
  }),
  deployPhishingKit: z.object({
    template: z.enum(["LOGIN_GENERIC", "GOOGLE", "BANK"]),
    port: z.number().optional(),
  }),

  // --- APPS & MEDIA ---
  listInstalledApps: z.object({}),
  closeApp: z.object({
    appName: z.string(),
  }),
  getActiveApp: z.object({}),
  runNativeAutomation: z.object({
    language: z.enum(["applescript", "powershell"]),
    script: z.string(),
    description: z.string().optional(),
  }),
  sendInstantMessage: z.object({
    app: z.string(),
    recipient: z.string(),
    message: z.string(),
  }),
  connectSmartTV: z.object({
    modelHint: z.string().optional(),
  }),
  controlSmartTV: z.object({
    action: z.string(), // Changed from command
    appName: z.string().optional(),
  }),
  startRemoteDesktop: z.object({
    targetId: z.string(),
  }),
  analyzeAmbientAudio: z.object({
    duration: z.number().optional(),
    sensitivity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    targetSignature: z.string().optional(),
  }),

  // --- WHATSAPP MCP ---
  whatsappSendMessage: z.object({
    contactName: z.string(),
    message: z.string(),
  }),
  whatsappSendImage: z.object({
    contactName: z.string(),
    caption: z.string().optional(),
  }),
  whatsappGetContacts: z.object({
    query: z.string().optional(),
  }),
  whatsappGetChats: z.object({
    limit: z.number().optional(),
  }),
  whatsappReadChat: z.object({
    contactName: z.string(),
    limit: z.number().optional(),
  }),

  // --- TELEGRAM ---
  telegramSendMessage: z.object({
    contactName: z.string(),
    message: z.string(),
  }),
  telegramGetChats: z.object({
    limit: z.number().optional(),
  }),
  telegramReadChat: z.object({
    contactName: z.string(),
    limit: z.number().optional(),
  }),
  telegramGetContacts: z.object({
    query: z.string().optional(),
  }),

  // --- UTILS ---
  switchPersona: z.object({
    mode: z.enum(["RUTHLESS", "ENGINEER", "ASSISTANT", "HACKER", "CUSTOM"]),
  }),
  searchWeb: z.object({
    query: z.string(),
  }),
  searchMaps: z.object({
    query: z.string(),
  }),
  analyzeImageDeeply: z.object({}),
  generateOrEditImage: z.object({
    prompt: z.string(),
  }),
  setBackgroundImage: z.object({
    mode: z.enum(["LAST_GENERATED", "UPLOADED", "CLEAR"]),
  }),
  googleImageSearch: z.object({
    query: z.string(),
  }),
  setVoiceAvatar: z.object({
    mode: z.enum(["ARC", "RUTHLESS", "ENGINEER", "HACKER", "ASSISTANT"]),
  }),

  // --- MISSING SCHEMAS ---
  launchApp: z.object({
    appName: z.string(),
  }),
  autonomousWebBrowse: z.object({
    startUrl: z.string(),
    objective: z.string(),
    maxSteps: z.number().optional(),
  }),
  presentVisualData: z.object({
    topic: z.string(),
    type: z.enum(["table", "chart", "list", "PRODUCT", "PLACE"]),
    layout: z.string().optional(),
    data: z.any().optional(),
    items: z.array(z.any()).optional(),
  }),

  // --- UI AUTOMATION TREE (X-RAY VISION) ---
  getUITree: z.object({}),
  findUIElement: z.object({
    name: z
      .string()
      .optional()
      .describe('Element name (e.g., "Send", "Submit", "Login").'),
    role: z
      .string()
      .optional()
      .describe('Element role/type (e.g., "Button", "Edit", "Text").'),
    automationId: z
      .string()
      .optional()
      .describe("Element automation ID (unique identifier)."),
    className: z
      .string()
      .optional()
      .describe("Element class name (Windows control class)."),
  }),
  clickUIElement: z.object({
    name: z
      .string()
      .optional()
      .describe('Element name to find and click (e.g., "Send", "Submit").'),
    automationId: z
      .string()
      .optional()
      .describe("Element automation ID to find and click."),
    x: z
      .number()
      .optional()
      .describe(
        "X coordinate for direct coordinate clicking (fallback method)."
      ),
    y: z
      .number()
      .optional()
      .describe(
        "Y coordinate for direct coordinate clicking (fallback method)."
      ),
  }),

  // --- ANDROID OS INTEGRATION (ADVANCED ANDROID AUTOMATION) ---
  getAndroidUITree: z.object({}),
  findAndroidElement: z.object({
    resourceId: z
      .string()
      .optional()
      .describe('Android resource ID (e.g., "com.whatsapp:id/send").'),
    text: z
      .string()
      .optional()
      .describe('Element text content (e.g., "Send", "Submit").'),
    contentDesc: z
      .string()
      .optional()
      .describe("Content description (accessibility label)."),
    className: z
      .string()
      .optional()
      .describe('Android class name (e.g., "android.widget.Button").'),
    package: z
      .string()
      .optional()
      .describe('Package name to filter elements (e.g., "com.whatsapp").'),
  }),
  clickAndroidElement: z.object({
    resourceId: z
      .string()
      .optional()
      .describe("Android resource ID to find and click."),
    text: z.string().optional().describe("Element text to find and click."),
    contentDesc: z
      .string()
      .optional()
      .describe("Content description to find and click."),
    x: z
      .number()
      .optional()
      .describe(
        "X coordinate for direct coordinate clicking (fallback method)."
      ),
    y: z
      .number()
      .optional()
      .describe(
        "Y coordinate for direct coordinate clicking (fallback method)."
      ),
  }),
  readAndroidNotifications: z.object({}),
  launchAndroidIntent: z.object({
    action: z
      .string()
      .optional()
      .describe('Intent action (e.g., "android.intent.action.VIEW").'),
    data: z
      .string()
      .optional()
      .describe('Intent data URI (e.g., "geo:0,0?q=New+York").'),
    component: z.string().optional().describe("Full component name."),
    package: z.string().optional().describe("Package name."),
    activity: z
      .string()
      .optional()
      .describe("Activity name (must be used with package)."),
    extras: z
      .record(z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .describe("Additional intent extras."),
  }),
  setAndroidClipboard: z.object({
    text: z.string().describe("Text content to set in the clipboard."),
  }),
  injectAndroidText: z.object({
    text: z.string().describe("Text to inject into the Android device."),
    useClipboard: z
      .boolean()
      .optional()
      .describe("If true, uses clipboard method (faster for long text)."),
  }),
  gmail_list_messages: z.object({
    query: z.string().optional(),
    maxResults: z.number().optional(),
  }),
  gmail_get_message: z.object({
    messageId: z.string(),
  }),
  gmail_send_message: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  drive_list_files: z.object({
    query: z.string().optional(),
    maxResults: z.number().optional(),
  }),
  drive_search: z.object({
    query: z.string(),
  }),
  calendar_list_events: z.object({
    calendarId: z.string().optional(),
    timeMin: z.string().optional(),
    maxResults: z.number().optional(),
  }),
  calendar_create_event: z.object({
    summary: z.string(),
    description: z.string().optional(),
    start: z.string().describe("ISO DateTime string"),
    end: z.string().describe("ISO DateTime string"),
    location: z.string().optional(),
  }),
};

export const validateToolArgs = (toolName: string, args: any) => {
  const schema = ToolSchemas[toolName as keyof typeof ToolSchemas];

  // Strict Validation: If schema doesn't exist, warn but don't crash,
  // but if it DOES exist, strict parse.
  if (!schema) {
    console.warn(`[SCHEMA] No validation schema found for tool: ${toolName}`);
    return { success: true };
  }

  const result = schema.safeParse(args);
  if (!result.success) {
    console.error(
      `[SCHEMA] Validation Failed for ${toolName}:`,
      result.error.format()
    );
    return {
      success: false,
      error: `Schema Validation Failed: ${result.error.message}`,
    };
  }
  return { success: true };
};

// Always-On Audio Monitoring Schema (moved to top, before ToolSchemas)
