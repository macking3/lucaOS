/**
 * Device Capability Service
 * Maps device types to their available tools and capabilities
 * Enables automatic tool filtering and delegation
 */

export type DeviceType =
  | "desktop"
  | "android"
  | "ios"
  | "smart_tv"
  | "smart_speaker"
  | "iot_device";

export interface DeviceCapabilities {
  type: DeviceType;
  canRunTools: string[]; // List of tool names this device can execute
  canDelegateTo: DeviceType[]; // Which device types this device can delegate to
  specialCapabilities: string[]; // Special features (e.g., 'vibrate', 'gps', 'camera')
}

/**
 * Tool-to-Capability Mapping
 * Defines which device types can run which tools
 */
export const TOOL_CAPABILITY_MAP: Record<string, DeviceType[]> = {
  // Desktop-only tools (require full OS access)
  executeTerminalCommand: ["desktop"],
  controlSystem: ["desktop"],
  runPythonScript: ["desktop"],
  changeDirectory: ["desktop"],
  listFiles: ["desktop"],
  readFile: ["desktop"],
  writeProjectFile: ["desktop"],
  createOrUpdateFile: ["desktop"],
  compileSelf: ["desktop"],
  runNativeAutomation: ["desktop"],
  closeApp: ["desktop"],
  getActiveApp: ["desktop"],
  readClipboard: ["desktop"],
  writeClipboard: ["desktop"],
  readScreen: ["desktop"],
  controlSystemInput: ["desktop"],
  nativeHardwareCast: ["desktop"],
  runNmapScan: ["desktop"],
  runMetasploitExploit: ["desktop"],
  generatePayload: ["desktop"],
  runBurpSuite: ["desktop"],
  runWiresharkCapture: ["desktop"],
  runJohnRipper: ["desktop"],
  runCobaltStrike: ["desktop"],
  generateHttpPayload: ["desktop"],
  listC2Sessions: ["desktop"],
  sendC2Command: ["desktop"],
  runSqlInjectionScan: ["desktop"],
  performStressTest: ["desktop"],
  scanPublicCameras: ["desktop"],
  deployPhishingKit: ["desktop"],
  addGraphRelations: ["desktop"],
  queryGraphKnowledge: ["desktop"],
  whatsappSendMessage: ["desktop"],
  whatsappGetChats: ["desktop"],
  whatsappReadChat: ["desktop"],
  whatsappSendImage: ["desktop"],
  whatsappGetContacts: ["desktop"],
  telegramSendMessage: ["desktop"],
  telegramGetChats: ["desktop"],
  telegramReadChat: ["desktop"],
  telegramGetContacts: ["desktop"],
  gmail_list_messages: ["desktop"],
  gmail_get_message: ["desktop"],
  gmail_send_message: ["desktop"],
  drive_list_files: ["desktop"],
  drive_search: ["desktop"],
  calendar_list_events: ["desktop"],
  calendar_create_event: ["desktop"],
  docs_get_document: ["desktop"],
  docs_create_document: ["desktop"],

  // Mobile-only tools (require mobile APIs)
  controlMobileDevice: ["android", "ios"], // Can control other mobile devices
  connectToAndroidDevice: ["desktop", "android"], // Can connect to Android
  pairAndroidDevice: ["desktop", "android"],
  takeAndroidScreenshot: ["desktop", "android"],
  listAndroidFiles: ["desktop", "android"],
  executeAndroidCommand: ["desktop", "android"],
  getAndroidUITree: ["desktop", "android"],
  findAndroidElement: ["desktop", "android"],
  clickAndroidElement: ["desktop", "android"],
  readAndroidNotifications: ["desktop", "android"],
  launchAndroidIntent: ["desktop", "android"],
  setAndroidClipboard: ["desktop", "android"],
  injectAndroidText: ["desktop", "android"],

  // Mobile native capabilities
  vibrate: ["android", "ios"],
  getLocation: ["android", "ios"],
  takePhoto: ["android", "ios"],
  sendSMS: ["android", "ios"],
  makeCall: ["android", "ios"],

  // Smart TV tools
  controlSmartTV: ["desktop", "smart_tv"],
  launchTVApp: ["desktop", "smart_tv"],

  // Universal tools (can run on any device)
  searchWeb: ["desktop", "android", "ios", "smart_tv"],
  readUrl: ["desktop", "android", "ios"],
  ingestGithubRepo: ["desktop", "android", "ios"],
  setSystemAlertLevel: ["desktop", "android", "ios"],
  runDiagnostics: ["desktop", "android", "ios"],
  controlDevice: ["desktop", "android", "ios", "smart_tv", "iot_device"],
  generateNetworkMap: ["desktop", "android", "ios"],
  scanNetwork: ["desktop", "android", "ios"],
  createTask: ["desktop", "android", "ios"],
  updateTask: ["desktop", "android", "ios"],
  listTasks: ["desktop", "android", "ios"],
  createEvent: ["desktop", "android", "ios"],
  listEvents: ["desktop", "android", "ios"],
  searchPolymarket: ["desktop", "android", "ios"],
  placePolymarketBet: ["desktop", "android", "ios"],
  getPolymarketPositions: ["desktop", "android", "ios"],
  createCryptoWallet: ["desktop", "android", "ios"],
  analyzeCryptoToken: ["desktop", "android", "ios"],
  executeCryptoSwap: ["desktop", "android", "ios"],
  createForexAccount: ["desktop", "android", "ios"],
  analyzeForexPair: ["desktop", "android", "ios"],
  executeForexTrade: ["desktop", "android", "ios"],
  createOsintProfile: ["desktop", "android", "ios"],
  searchOsintDatabase: ["desktop", "android", "ios"],
  auditSourceCode: ["desktop", "android", "ios"],
  openCodeEditor: ["desktop", "android", "ios"],
  openAutonomyDashboard: ["desktop", "android", "ios"],
  storeMemory: ["desktop", "android", "ios"],
  retrieveMemory: ["desktop", "android", "ios"],
};

/**
 * Device capability definitions
 */
export const DEVICE_CAPABILITIES: Record<DeviceType, DeviceCapabilities> = {
  desktop: {
    type: "desktop",
    canRunTools: Object.keys(TOOL_CAPABILITY_MAP).filter((tool) =>
      TOOL_CAPABILITY_MAP[tool].includes("desktop")
    ),
    canDelegateTo: ["android", "ios", "smart_tv"],
    specialCapabilities: [
      "full_os_access",
      "file_system",
      "terminal",
      "network_scan",
      "hacking_tools",
    ],
  },
  android: {
    type: "android",
    canRunTools: Object.keys(TOOL_CAPABILITY_MAP).filter((tool) =>
      TOOL_CAPABILITY_MAP[tool].includes("android")
    ),
    canDelegateTo: ["desktop"],
    specialCapabilities: [
      "vibrate",
      "gps",
      "camera",
      "sms",
      "calls",
      "notifications",
      "adb",
    ],
  },
  ios: {
    type: "ios",
    canRunTools: Object.keys(TOOL_CAPABILITY_MAP).filter((tool) =>
      TOOL_CAPABILITY_MAP[tool].includes("ios")
    ),
    canDelegateTo: ["desktop"],
    specialCapabilities: [
      "vibrate",
      "gps",
      "camera",
      "sms",
      "calls",
      "notifications",
    ],
  },
  smart_tv: {
    type: "smart_tv",
    canRunTools: Object.keys(TOOL_CAPABILITY_MAP).filter((tool) =>
      TOOL_CAPABILITY_MAP[tool].includes("smart_tv")
    ),
    canDelegateTo: ["desktop"],
    specialCapabilities: ["media_control", "app_launch"],
  },
  smart_speaker: {
    type: "smart_speaker",
    canRunTools: ["controlDevice", "setSystemAlertLevel"],
    canDelegateTo: ["desktop", "android", "ios"],
    specialCapabilities: ["voice_output", "voice_input"],
  },
  iot_device: {
    type: "iot_device",
    canRunTools: ["controlDevice"],
    canDelegateTo: ["desktop"],
    specialCapabilities: ["sensor_data", "actuator_control"],
  },
};

/**
 * Check if a device can run a specific tool
 */
export function canDeviceRunTool(
  deviceType: DeviceType,
  toolName: string
): boolean {
  const capabilities = TOOL_CAPABILITY_MAP[toolName];
  if (!capabilities) {
    // Unknown tool - assume desktop can run it
    return deviceType === "desktop";
  }
  return capabilities.includes(deviceType);
}

/**
 * Find the best device to delegate a tool to
 * Priority: desktop > android > ios > smart_tv
 */
export function findBestDeviceForTool(
  toolName: string,
  availableDevices: Array<{
    type: DeviceType;
    deviceId: string;
    name?: string;
  }>,
  preferredDeviceId?: string | null
): { type: DeviceType; deviceId: string; name?: string } | null {
  const capabilities = TOOL_CAPABILITY_MAP[toolName];

  // 1. If we have a preferred device (usually local), and it can run this tool, USE IT IMMEDIATELY.
  if (preferredDeviceId) {
    const preferredDevice = availableDevices.find(
      (d) => d.deviceId === preferredDeviceId
    );
    if (preferredDevice && capabilities?.includes(preferredDevice.type)) {
      return preferredDevice;
    }
  }

  if (!capabilities) {
    // Unknown tool - try desktop first
    const desktop = availableDevices.find((d) => d.type === "desktop");
    return desktop || availableDevices[0] || null;
  }

  // Priority order
  const priority: DeviceType[] = [
    "desktop",
    "android",
    "ios",
    "smart_tv",
    "smart_speaker",
    "iot_device",
  ];

  for (const deviceType of priority) {
    if (capabilities.includes(deviceType)) {
      const device = availableDevices.find((d) => d.type === deviceType);
      if (device) return device;
    }
  }

  return null;
}

/**
 * Get all tools a device can run
 */
export function getToolsForDevice(deviceType: DeviceType): string[] {
  return DEVICE_CAPABILITIES[deviceType]?.canRunTools || [];
}

/**
 * Get device capabilities
 */
export function getDeviceCapabilities(
  deviceType: DeviceType
): DeviceCapabilities | null {
  return DEVICE_CAPABILITIES[deviceType] || null;
}

/**
 * Filter tools based on device capabilities
 */
export function filterToolsByDevice(
  deviceType: DeviceType,
  allTools: string[]
): string[] {
  return allTools.filter((tool) => canDeviceRunTool(deviceType, tool));
}

/**
 * Get the list of platforms that can execute a specific tool
 */
export function getRequiredPlatformsForTool(toolName: string): DeviceType[] {
  return TOOL_CAPABILITY_MAP[toolName] || ["desktop"]; // Default to desktop for unknown tools
}
