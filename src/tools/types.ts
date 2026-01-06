export interface ToolExecutionContext {
  // Services
  lucaService: any;
  liveService: any;
  soundService: any;
  memoryService: any;
  handlePersonaSwitch: (mode: string) => Promise<void>;

  // State Setters
  setToolLogs: React.Dispatch<React.SetStateAction<any[]>>;
  setShowMobileFileBrowser: (show: boolean) => void;
  setShowAutonomyDashboard: (show: boolean) => void;
  setShowCodeEditor: (show: boolean) => void;
  setVoiceSearchResults: (results: any) => void;
  setLiveContent: (content: any) => void;
  setVisualData: (data: any) => void;
  setIngestionState: (state: any) => void;
  setStockTerminalSymbol: (symbol: string) => void;
  setShowStockTerminal: (show: boolean) => void;
  setShowSkillsMatrix: (show: boolean) => void;
  setShowSubsystemDashboard: (show: boolean) => void;
  setActiveWebview: (webview: any) => void;
  setIsRebooting: (rebooting: boolean) => void;
  // Ghost Browser Integration
  setShowGhostBrowser?: (show: boolean) => void;
  setGhostBrowserUrl?: (url: string) => void;

  // OSINT Integration
  setOsintProfile?: (profile: any) => void;
  setShowOsintDossier?: (show: boolean) => void;

  // Trading Integration
  setCryptoWallet?: (wallet: any) => void;
  setForexAccount?: (account: any) => void;

  // Cinema Integration
  setCinemaUrl?: (
    url: string,
    sourceType: "youtube" | "local" | "stream" | "file" | "webview" | "mirror",
    title?: string
  ) => void;

  // State Values
  isLocalCoreConnected: boolean;
  isVoiceMode: boolean;
  hostPlatform: string;
  isRebooting: boolean;
  attachedImage: string | null;
  messages: any[];
  currentDeviceType?: string; // "desktop" | "mobile" | "tablet"
  currentDeviceId?: string; // Neural Link device ID
  neuralLinkManager?: any; // For cross-device tool delegation

  // Callbacks
  // Callbacks
  handleSendMessage: (text: string) => void;

  // Context
  displayId?: number; // Origin Display ID (for Widget interactions)
  sessionId?: string; // Active conversation session ID
}

export interface ToolHandler {
  name: string;
  execute: (args: any, context: ToolExecutionContext) => Promise<string>;
}
