import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMobile, useDeviceCapabilities } from "./hooks/useMobile";
import { AppProvider, useAppContext } from "./context/AppContext";
import { useVoiceInput } from "./hooks/useVoiceInput"; // New Import
import { MobilePhoenix } from "./mobile/MobilePhoenix";
import ChatWidgetInput from "./components/ChatWidgetInput";
import ChatMessageBubble from "./components/ChatMessageBubble";
import {
  lucaService,
  PersonaType,
  PERSONA_UI_CONFIG,
  switchPersonaTool,
} from "./services/lucaService";
import { liveService } from "./services/liveService";
import { memoryService } from "./services/memoryService";
import { taskService } from "./services/taskService";
import { taskQueue } from "./services/taskQueueService";
import { voiceCommandService } from "./services/voiceCommandService";
import { soundService } from "./services/soundService";
import { voiceService } from "./services/voiceService";
import { settingsService } from "./services/settingsService";
import { apiUrl, WS_PORT, cortexUrl } from "./config/api";
import { ToolRegistry } from "./services/toolRegistry";
import {
  Message,
  Sender,
  SmartDevice,
  DeviceType,
  ToolExecutionLog,
  OsintProfile,
  SystemStatus,
  PolyPosition,
  UserProfile,
} from "./types";
import { OperatorProfile } from "./types/operatorProfile";
import {
  Activity,
  Cpu,
  Shield,
  Database,
  BrainCircuit,
  Trash2,
  Box,
  Download,
  Wallet,
  TrendingUp,
  Landmark,
  ImageIcon,
  X,
  AudioWaveform,
  Eye,
  Search,
  Server as ServerIcon,
  Unplug,
  Monitor,
  Code2,
  FolderOpen,
  Sparkles,
  ShieldAlert,
  Lock,
  Dna,
  BarChart3,
  Settings,
  FileText,
  Smartphone,
  Brain,
  Terminal as TerminalIcon,
} from "lucide-react";
import SmartDeviceCard from "./components/SmartDeviceCard";
import SystemMonitor from "./components/SystemMonitor";
import RemoteAccessModal from "./components/RemoteAccessModal";
import GhostBrowser from "./components/GhostBrowser";

import { DesktopStreamModal } from "./components/DesktopStreamModal";
import NeuralLinkModal from "./components/NeuralLinkModal";
import { io } from "socket.io-client";
import {
  canDeviceRunTool,
  findBestDeviceForTool,
} from "./services/deviceCapabilityService";
import { neuralLinkManager } from "./services/neuralLink/manager";
import { neuralLink as neuralLinkService } from "./services/neuralLinkService"; // Guest handling

// Helper for device capability check
const hasCapability = (deviceType: string, capability: string): boolean => {
  if (capability === "mobile")
    return deviceType === "mobile" || deviceType === "tablet";
  if (capability === "desktop") return deviceType === "desktop";
  return false;
};
import GeoTacticalView from "./components/GeoTacticalView";
import VoiceHud from "./components/VoiceHud";
import { WakeWordListener } from "./components/WakeWordListener"; // NEW IMPORT

import { VoiceCommandConfirmation } from "./components/VoiceCommandConfirmation";
import CryptoTerminal from "./components/CryptoTerminal";
// import { ToolRegistry } from "./tools/ToolRegistry"; // Deprecated, using services/toolRegistry instead
import { allTools } from "./services/lucaService";
import { introspectionService } from "./services/introspectionService";
import { selfExpressionService } from "./services/selfExpressionService";
import { ToolExecutionContext } from "./tools/types";
import ForexTerminal from "./components/ForexTerminal";
import PredictionTerminal from "./components/PredictionTerminal";
import ManagementDashboard from "./components/ManagementDashboard";
import OsintDossier from "./components/OsintDossier";
import SmartTVRemote from "./components/SmartTVRemote";
import WirelessManager from "./components/WirelessManager";
import MobileManager from "./components/MobileManager";
import NetworkMap from "./components/NetworkMap";
import HackingTerminal from "./components/HackingTerminal";
import VisionCameraModal from "./components/VisionCameraModal";
import AppExplorerModal from "./components/AppExplorerModal";

import HolographicFaceIcon from "./components/HolographicFaceIcon";
import ChatWidgetMode from "./components/ChatWidgetMode";
import NeuralCloud from "./components/NeuralCloud";
import SecurityGate from "./components/SecurityGate";
import IngestionModal from "./components/IngestionModal";
import CodeEditor from "./components/CodeEditor";
import LiveContentDisplay from "./components/LiveContentDisplay";
import AdminGrantModal from "./components/AdminGrantModal";
import HumanInputModal from "./components/HumanInputModal";
import GhostCursor from "./components/GhostCursor";
import WhatsAppManager from "./components/WhatsAppManager";
import TelegramManager from "./components/TelegramManager";
import ProfileManager from "./components/ProfileManager";
import SkillsMatrix from "./components/SkillsMatrix";
import StockTerminal from "./components/StockTerminal";
import AdvancedTradingTerminal from "./components/trading/AdvancedTradingTerminal";
import CompetitionPage from "./components/trading/CompetitionPage";
import AITradersPage from "./components/trading/AITradersPage";
import SubsystemDashboard from "./components/SubsystemDashboard";
// Removed duplicate GhostBrowser import
import InvestigationReports from "./components/InvestigationReports";
import VisualCore from "./components/VisualCore";
import ThoughtGraph, { ThoughtNode } from "./components/ThoughtGraph";
import ThoughtGraphMobile from "./components/ThoughtGraphMobile";
import ExecutionPipeline, {
  PipelineStep,
} from "./components/ExecutionPipeline";
import {
  parseToolLogsToThoughtNodes,
  parseToolLogsToPipelineSteps,
} from "./utils/thoughtParser";
import { AutonomyDashboard } from "./components/AutonomyDashboard";
import { ScreenShare, ScreenShareHandle } from "./components/ScreenShare";
import MobileFileBrowser from "./components/MobileFileBrowser";
import conversationService from "./services/conversationService";
import VisionHUD from "./components/VisionHUD";
import AlwaysOnControls from "./components/AlwaysOnControls";
import { NeuralRecorder } from "./components/NeuralRecorder";
import iotManager from "./services/iot/IoTManager";
import { SettingsModal } from "./components/SettingsModal";
import OnboardingFlow from "./components/Onboarding/OnboardingFlow";
import { Capacitor } from "@capacitor/core";

// --- Mock Initial State ---
const INITIAL_DEVICES: SmartDevice[] = [];

const CHAT_STORAGE_KEY = "LUCA_CHAT_HISTORY_V1";
const PROFILE_STORAGE_KEY = "LUCA_USER_PROFILE_V1";
const MAX_HISTORY_LIMIT = 50; // Rolling window of messages to keep

/**
 * Normalize persona name by mapping common aliases to canonical names
 * "normal mode" or "default mode" -> "ASSISTANT" (the default/normal persona)
 * "ruthless mode" or "command mode" -> "RUTHLESS" (efficiency/tactical mode)
 */
function normalizePersonaName(rawMode: string): string {
  const normalized = rawMode.trim().toUpperCase();

  // Map common aliases to canonical persona names
  const personaAliases: Record<string, string> = {
    // ASSISTANT (Normal/Default mode) aliases
    NORMAL: "ASSISTANT",
    DEFAULT: "ASSISTANT",
    "NORMAL MODE": "ASSISTANT",
    "DEFAULT MODE": "ASSISTANT",
    JARVIS: "ASSISTANT",
    PUCK: "ASSISTANT",
    "HELPFUL MODE": "ASSISTANT",
    // RUTHLESS (Command/Efficiency mode) aliases
    "RUTHLESS MODE": "RUTHLESS",
    "COMMAND MODE": "RUTHLESS",
    KORE: "RUTHLESS",
    REDQUEEN: "RUTHLESS",
    "RED QUEEN": "RUTHLESS",
    // ENGINEER aliases
    "ENGINEER MODE": "ENGINEER",
    "CODE MODE": "ENGINEER",
    FENRIR: "ENGINEER",
    DEVELOPER: "ENGINEER",

    // HACKER aliases
    "HACKER MODE": "HACKER",
    "SECURITY MODE": "HACKER",
    CHARON: "HACKER",
    "RED TEAM": "HACKER",
  };

  // Check for exact match in aliases first
  if (personaAliases[normalized]) {
    return personaAliases[normalized];
  }

  // Check if it contains alias keywords (e.g., "normal mode", "switch to normal")
  const lower = rawMode.toLowerCase();
  if (lower.includes("normal") || lower.includes("default")) {
    return "ASSISTANT";
  }
  if (
    lower.includes("engineer") ||
    lower.includes("code") ||
    lower.includes("fenrir")
  ) {
    return "ENGINEER";
  }
  if (
    lower.includes("assistant") ||
    lower.includes("helpful") ||
    lower.includes("jarvis") ||
    lower.includes("puck")
  ) {
    return "ASSISTANT";
  }
  if (
    lower.includes("hacker") ||
    lower.includes("security") ||
    lower.includes("charon") ||
    lower.includes("red team")
  ) {
    return "HACKER";
  }

  // Return as-is if no mapping found (will be validated by enum)
  return normalized;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  console.log(
    "[APP] AppContent component rendering - FRESH LOAD CHECK " + Date.now()
  );

  // Mobile detection (Phase 2 - Mobile Optimization)
  const isMobile = useMobile();
  const deviceCapabilities = useDeviceCapabilities();

  // --- VOICE HUB HOOK (NIGERIAN EAR) ---
  const {
    startListening: startVoiceHub,
    stopListening: stopVoiceHub,
    transcript: voiceHubTranscript,
    isListening: isVoiceHubListening,
    status: voiceHubStatus,
  } = useVoiceInput();

  // --- PERSISTENT CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Basic validation
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(
            `[STORAGE] Loaded ${parsed.length} messages from history.`
          );
          return parsed;
        }
      }
    } catch (e: any) {
      console.warn("[STORAGE] Failed to load chat history:", e);
    }
    return [];
  });

  const [input, setInput] = useState("");
  const [localIp, setLocalIp] = useState<string>(""); // Store real LAN IP

  const [isProcessing, setIsProcessing] = useState(false);
  const {
    neuralLink,
    management,
    diagnostics,
    trading,
    voice: voiceSystem,
  } = useAppContext();

  const {
    devices,
    setDevices,
    showRemoteModal,
    setShowRemoteModal,
    remoteCode,
    setRemoteCode,
    showDesktopStream,
    setShowDesktopStream,
    desktopTarget,
    setDesktopTarget,
    showNeuralLinkModal,
    setShowNeuralLinkModal,
  } = neuralLink;
  const {
    rightPanelMode,
    setRightPanelMode,
    memories,
    setMemories,
    tasks,
    setTasks,
    events,
    setEvents,
    goals,
    setGoals,
    installedModules,
    setInstalledModules,
    queuedTasks,
    setQueuedTasks,
  } = management;
  const {
    showGhostBrowser,
    setShowGhostBrowser,
    ghostBrowserUrl,
    setGhostBrowserUrl,
    showGeoTactical,
    setShowGeoTactical,
    tacticalMarkers,
    setTacticalMarkers,
    trackingTarget,
    setTrackingTarget,
  } = diagnostics;
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([]);

  // Right Panel View State

  // Voice State
  const {
    isVoiceMode,
    setIsVoiceMode,
    showVoiceHud,
    setShowVoiceHud,
    voiceAmplitude,
    setVoiceAmplitude,
    voiceTranscript,
    setVoiceTranscript,
    voiceTranscriptSource,
    setVoiceTranscriptSource,
    isVadActive,
    setIsVadActive,
    voiceSearchResults,
    setVoiceSearchResults,
    visualData,
    setVisualData,
    isSpeaking,
    setIsSpeaking,
  } = voiceSystem;

  // --- QUERY PARAM MODE CHECK ---
  const [appMode, setAppMode] = useState<
    "dashboard" | "widget" | "chat" | "browser" | "visual_core" | "hologram"
  >("dashboard");

  useEffect(() => {
    // Parse URL params for ?mode=widget/chat/browser/visual_core
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");

    // Check if running in Capacitor (mobile) - Use proper Capacitor API
    const isCapacitor = Capacitor.isNativePlatform();

    console.log(
      "[APP] Platform check - isNativePlatform:",
      isCapacitor,
      "getPlatform:",
      Capacitor.getPlatform()
    );

    if (mode === "widget") {
      setAppMode("widget");
      document.body.style.backgroundColor = "transparent";
      setBootSequence("READY"); // Skip BIOS
    } else if (mode === "chat") {
      setAppMode("chat");
      document.body.style.backgroundColor = "transparent";
      setBootSequence("READY"); // Skip BIOS
    } else if (mode === "browser") {
      setAppMode("browser");
      document.body.style.backgroundColor = "transparent";
      setBootSequence("READY"); // Skip BIOS
      const initialUrl = params.get("initialUrl");
      if (initialUrl) {
        setGhostBrowserUrl(initialUrl);
      }
    } else if (mode === "visual_core") {
      setAppMode("visual_core");
      document.body.style.backgroundColor = "transparent";
      setBootSequence("READY"); // Skip BIOS - Instant Load
    } else if (mode === "hologram") {
      setAppMode("hologram");
      document.body.style.backgroundColor = "transparent";
      setBootSequence("READY"); // Skip BIOS
    } else if (isCapacitor) {
      // Mobile app - check if first run (needs onboarding)
      console.log("[APP] ✅ CAPACITOR DETECTED! Running mobile mode");

      const isSetupComplete =
        localStorage.getItem("LUCA_SETUP_COMPLETE") === "true";

      if (!isSetupComplete) {
        console.log("[APP] Capacitor detected - First run, showing onboarding");
        setBootSequence("ONBOARDING");
      } else {
        console.log("[APP] Capacitor detected - Setup complete, skipping BIOS");
        setBootSequence("READY");
      }
    } else {
      console.log("[APP] Desktop mode - will show BIOS");
    }
  }, []);

  // Voice Command Confirmation State
  const [pendingCommand, setPendingCommand] = useState<{
    original: string;
    interpreted: string;
    confidence?: number;
    isRisky: boolean;
  } | null>(null);

  // Task Queue State

  // NEW: Live Content State (Text Mode)
  const [liveContent, setLiveContent] = useState<any | null>(null);

  // Audio Sensor State
  const [isListeningAmbient, setIsListeningAmbient] = useState(false);

  const {
    showCryptoTerminal,
    setShowCryptoTerminal,
    cryptoWallet,
    setCryptoWallet,
    tradeHistory,
    setTradeHistory,
    showForexTerminal,
    setShowForexTerminal,
    forexAccount,
    setForexAccount,
    forexTrades,
    setForexTrades,
    showPredictionTerminal,
    setShowPredictionTerminal,
    polyPositions,
    setPolyPositions,
  } = trading;

  // OSINT State
  const [showOsintDossier, setShowOsintDossier] = useState(false);
  const [osintProfile, setOsintProfile] = useState<OsintProfile | null>(null);

  // Smart TV State
  const [showTVRemote, setShowTVRemote] = useState(false);
  const [activeTV, setActiveTV] = useState<SmartDevice | null>(null);

  // Wireless Manager State
  const [showWirelessManager, setShowWirelessManager] = useState(false);
  const [wirelessTab, setWirelessTab] = useState<
    "WIFI" | "BLUETOOTH" | "HOTSPOT"
  >("WIFI");

  // Mobile Manager State
  const [showMobileManager, setShowMobileManager] = useState(false);
  const [showMobileFileBrowser, setShowMobileFileBrowser] = useState(false);
  const [activeMobileDevice, setActiveMobileDevice] =
    useState<SmartDevice | null>(null);

  // Thought Visualization State (Phase 2 - 2050 Upgrade)
  const [showThoughtGraph, setShowThoughtGraph] = useState(false);
  const [thoughtNodes, setThoughtNodes] = useState<ThoughtNode[]>([]);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);

  // WhatsApp State
  const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);
  const [showTelegramManager, setShowTelegramManager] = useState(false);

  // Network Map State
  const [showNetworkMap, setShowNetworkMap] = useState(false);

  // Vision & Security State
  const [showCamera, setShowCamera] = useState(false);
  const [showAppExplorer, setShowAppExplorer] = useState(false);

  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Hacking Terminal State
  const [showHackingTerminal, setShowHackingTerminal] = useState(false);
  const [hackingLogs, setHackingLogs] = useState<
    { tool: string; output: string; timestamp: number }[]
  >([]);

  // Autonomy Dashboard State
  const [showAutonomyDashboard, setShowAutonomyDashboard] = useState(false);

  // Always-On Monitoring State
  const [visionMonitoringActive, setVisionMonitoringActive] = useState(false);
  const [audioMonitoringActive, setAudioMonitoringActive] = useState(false);
  // NEW: Wake Word IPC State (Tray Control)
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);

  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on("toggle-wake-word", (enabled: boolean) => {
        console.log("[APP] IPC toggle-wake-word received:", enabled);
        setIsWakeWordActive(enabled);
      });
    }

    // Get Local IP for Neural Bridge
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer
        .invoke("get-local-ip")
        .then((ip: string) => {
          console.log("[APP] Discovered Local IP:", ip);
          setLocalIp(ip);
        })
        .catch((err: any) => {
          console.error("[APP] Failed to get local IP:", err);
        });
    }

    // Get Local IP for Neural Bridge
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer
        .invoke("get-local-ip")
        .then((ip: string) => {
          console.log("[APP] Discovered Local IP:", ip);
          setLocalIp(ip);
        })
        .catch((err: any) => {
          console.error("[APP] Failed to get local IP:", err);
          setLocalIp("localhost"); // Fallback
        });
    }
  }, []);

  // Skills & Stock Terminal State
  const [showSkillsMatrix, setShowSkillsMatrix] = useState(false);
  const [showNeuralRecorder, setShowNeuralRecorder] = useState(false);
  const [showStockTerminal, setShowStockTerminal] = useState(false);
  const [stockTerminalSymbol, setStockTerminalSymbol] = useState<
    string | undefined
  >(undefined);
  const [showTradingTerminal, setShowTradingTerminal] = useState(false);
  const [showCompetitionPage, setShowCompetitionPage] = useState(false);
  const [showAITradersPage, setShowAITradersPage] = useState(false);

  // Subsystem Orchestration State
  const [showSubsystemDashboard, setShowSubsystemDashboard] = useState(false);

  // Ghost Browser State
  const [activeWebview, setActiveWebview] = useState<{
    url: string;
    title: string;
    sessionId?: string;
  } | null>(null);
  const [webNavigatorSessionId, setWebNavigatorSessionId] = useState<
    string | null
  >(null);

  // Human Input Modal State (for credential prompts)
  const [humanInputModal, setHumanInputModal] = useState<{
    isOpen: boolean;
    prompt: string;
    sessionId: string;
  } | null>(null);

  // Investigation Reports State
  const [showInvestigationReports, setShowInvestigationReports] =
    useState(false);

  // Mobile Navigation State
  const [activeMobileTab, setActiveMobileTab] = useState<
    "SYSTEM" | "TERMINAL" | "DATA"
  >("TERMINAL");

  // NAVIGATION TRACKING: Sync mobile tab state with LucaService for context awareness
  useEffect(() => {
    if (isMobile && activeMobileTab) {
      lucaService.setNavigationState({
        currentScreen: activeMobileTab,
      });
      console.log(`[MOBILE] Navigation Context Updated: ${activeMobileTab}`);
    }
  }, [activeMobileTab, isMobile]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Track chat request cancellation

  // LOCAL CORE STATE (REAL BACKEND)
  const [isLocalCoreConnected, setIsLocalCoreConnected] = useState(false);
  const [hostPlatform, setHostPlatform] = useState<string>("Unknown Host");
  // NEW: KERNEL LOCK STATE
  const [isKernelLocked, setIsKernelLocked] = useState(false);

  // VISION STREAM STATE (For pipe to Data Room)
  const [visionStream, setVisionStream] = useState<MediaStream | null>(null);

  // --- PERSONA & ENGINEER MODE STATES ---
  const [persona, setPersona] = useState<PersonaType>(() => {
    try {
      const saved = localStorage.getItem("LUCA_PERSONA_PREF");
      return (saved as PersonaType) || "ASSISTANT";
    } catch {
      return "ASSISTANT";
    }
  });

  useEffect(() => {
    localStorage.setItem("LUCA_PERSONA_PREF", persona);
  }, [persona]);

  // Sync Persona with SettingsService
  useEffect(() => {
    // 1. Initial Load from Settings (Overrides LocalStorage if set)
    const settingsTheme = settingsService.get("general").theme;
    if (settingsTheme && settingsTheme !== persona) {
      setPersona(settingsTheme as PersonaType);
    }

    // 2. Listen for Changes
    const handleSettingsChange = (newSettings: any) => {
      if (newSettings.general.theme && newSettings.general.theme !== persona) {
        console.log(
          "[APP] Theme changed via Settings:",
          newSettings.general.theme
        );
        setPersona(newSettings.general.theme as PersonaType);
      }
    };
    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, []); // Dependencies intentional empty to avoid loops, purely event driven

  const [currentCwd, setCurrentCwd] = useState<string>("");
  const [currentDeviceType, setCurrentDeviceType] = useState<any>("desktop");

  // NEW: IDE STATE
  const [showCodeEditor, setShowCodeEditor] = useState(false);

  // NEW: GOD MODE STATES
  const [bootSequence, setBootSequence] = useState<
    "INIT" | "BIOS" | "KERNEL" | "ONBOARDING" | "READY"
  >("BIOS");
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(
    SystemStatus.NORMAL
  );
  const [isLockdown, setIsLockdown] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false); // Full Admin Access
  const [showAdminGrantModal, setShowAdminGrantModal] = useState(false);
  const [adminJustification, setAdminJustification] = useState<string>("");
  const [isRebooting, setIsRebooting] = useState(false); // For persona switching visual

  // NEW: PROFILE MANAGER STATE
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // NEW: Multi-Monitor Context ID (origin of interaction)
  const [contextDisplayId, setContextDisplayId] = useState<number | undefined>(
    undefined
  );

  // NEW: GHOST CURSOR STATE (COMPUTER USE VISUALIZATION)
  const [ghostCursor, setGhostCursor] = useState<{
    x: number;
    y: number;
    type: string;
    active: boolean;
  }>({ x: 0, y: 0, type: "MOVE", active: false });

  // --- WIDGET SYNC LOOP (REAL-TIME-ISH) ---
  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send("sync-widget-state", {
        // Map Voice Hub State to Widget
        isVadActive: isVoiceHubListening || voiceHubStatus === "THINKING",
        isSpeaking: isSpeaking,
        transcript: voiceHubTranscript || voiceTranscript,
        // Fake amplitude pulse when listening so widget looks alive
        amplitude: isVoiceHubListening ? Math.random() * 0.5 + 0.3 : 0,
        persona: persona,
        status: voiceHubStatus, // Pass full status if widget updates to support it
      });
    }
  }, [
    isVadActive,
    isSpeaking,
    voiceTranscript,
    voiceAmplitude,
    persona,
    isVoiceHubListening,
    voiceHubStatus,
    voiceHubTranscript,
  ]);

  // --- SMART SCREEN SYNC (Option B) ---
  // Instead of rendering VisualCore locally, we forward state to the separate window
  useEffect(() => {
    // If we have visual data or a browser URL (and not just closing it)
    if (
      (visualData || (ghostBrowserUrl && ghostBrowserUrl !== "about:blank")) &&
      window.electron &&
      window.electron.ipcRenderer
    ) {
      const payload = visualData || { type: "BROWSER", url: ghostBrowserUrl };
      window.electron.ipcRenderer.send("update-visual-core", payload);

      // CRITICAL: We DO NOT want to keep this state locally if it triggers an overlay?
      // Actually, we might want to keep it to track "what is showing" but NOT render the overlay.
      // The overlay rendering happens at the bottom of the file. We will remove that.
    }
  }, [visualData, ghostBrowserUrl]);

  // --- VOICE HUB LISTENER (THE BRIDGE) ---

  useEffect(() => {
    if (voiceHubTranscript && voiceHubTranscript.trim().length > 0) {
      console.log("[VOICE HUB] Heard Command:", voiceHubTranscript);
      setVoiceTranscript(voiceHubTranscript); // Update UI
      // Send to Luca's Brain
      handleSendMessage(voiceHubTranscript).catch((err) =>
        console.error("[VOICE HUB] Execution Failed", err)
      );
    }
  }, [voiceHubTranscript]);

  // NEW: KNOWLEDGE INGESTION STATE
  const [ingestionState, setIngestionState] = useState<{
    active: boolean;
    files: string[];
    skills: string[];
  }>({ active: false, files: [], skills: [] });
  const [showIngestionModal, setShowIngestionModal] = useState(false);

  // --- HUMAN-IN-THE-LOOP SECURITY STATE ---
  const [approvalRequest, setApprovalRequest] = useState<{
    tool: string;
    args: any;
    resolve: (val: boolean) => void;
  } | null>(null);

  // NEW: BACKGROUND IMAGE STATE
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // NEW: NEURAL LINK STATE (MOBILE BRIDGE)
  const neuralLinkSocketRef = useRef<any>(null); // Socket.io client reference
  const lastMessageSourceRef = useRef<"desktop" | "mobile" | null>(null); // Track message source to prevent loops
  const currentDeviceTypeRef = useRef<any>("desktop"); // Current device type (desktop by default)

  // Helper function to broadcast messages to mobile
  const broadcastMessageToMobile = useCallback(
    (text: string, sender: "user" | "luca") => {
      if (
        neuralLinkSocketRef.current &&
        neuralLinkSocketRef.current.connected
      ) {
        neuralLinkSocketRef.current.emit("client:message", {
          type: "response",
          target: "all",
          command: {
            tool: "chat",
            args: { text, sender },
          },
          text: text, // Legacy support
          timestamp: Date.now(),
        });
        console.log(`[NEURAL LINK] Broadcasted ${sender} message to mobile`);
      }
    },
    []
  );

  // Helper function to sync chat history to mobile
  const syncChatHistoryToMobile = useCallback(() => {
    if (
      neuralLinkSocketRef.current &&
      neuralLinkSocketRef.current.connected &&
      messages.length > 0
    ) {
      const historyMessages = messages.map((msg) => ({
        text: msg.text,
        sender: msg.sender === Sender.USER ? "USER" : "LUCA",
        timestamp: msg.timestamp,
      }));

      neuralLinkSocketRef.current.emit("client:message", {
        type: "sync",
        target: "all",
        sync: {
          type: "context",
          data: { messages: historyMessages },
        },
        timestamp: Date.now(),
      });
      console.log(
        `[NEURAL LINK] Synced ${historyMessages.length} messages to mobile`
      );
    }
  }, [messages]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<ScreenShareHandle>(null);
  const lastIngestedIndexRef = useRef<number>(-1); // Track last ingested message index for LightRAG
  const ingestionTimerRef = useRef<NodeJS.Timeout | null>(null); // Batching timer
  const hasAnnouncedRef = useRef<boolean>(false); // Track if boot message was already spoken

  // --- REAL BIOS DIAGNOSTICS ---
  const [biosStatus, setBiosStatus] = useState<{
    server: "PENDING" | "OK" | "FAIL";
    core: "PENDING" | "OK" | "FAIL";
    vision: "PENDING" | "OK" | "FAIL";
    audio: "PENDING" | "OK" | "FAIL";
  }>({
    server: "PENDING",
    core: "PENDING",
    vision: "PENDING",
    audio: "PENDING",
  });

  useEffect(() => {
    // SKIP BIOS ENTIRELY ON MOBILE
    if (Capacitor.isNativePlatform()) {
      console.log("[BIOS] Skipping diagnostics - running on native platform");
      return;
    }

    // History detected? Skip boot
    // History detected? We still want to verify system integrity (User Request)
    // if (messages.length > 0) {
    //   setBootSequence("READY");
    //   // return; // Force diagnostics even if history exists
    // }

    const runDiagnostics = async () => {
      console.log(
        "[BIOS] System Health Verification Passed (v2.1 - IPC Refactor Online)"
      );

      // Force verify ToolRegistry version
      console.log("[BIOS] ToolRegistry Loaded:", ToolRegistry);

      // 1. Initial State
      setBootSequence("BIOS");
      soundService.play("BOOT");
      await new Promise((r) => setTimeout(r, 800)); // Cinematic pause

      const MAX_RETRIES = 30; // 30 seconds max (Python backend can be slow)
      const RETRY_DELAY = 1000;

      // Helper for retrying checks
      const checkServiceWithRetry = async (
        name: string,
        checkFn: () => Promise<boolean>,
        onStatus: (status: "PENDING" | "OK" | "FAIL") => void
      ) => {
        onStatus("PENDING");
        for (let i = 0; i < MAX_RETRIES; i++) {
          try {
            const isHealthy = await checkFn();
            if (isHealthy) {
              onStatus("OK");
              return true;
            }
          } catch (e) {
            console.warn(
              `[BIOS] ${name} check failed (Attempt ${i + 1}/${MAX_RETRIES})`
            );
          }
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
        }
        onStatus("FAIL");
        return false;
      };

      // 2. RUN CHECKS IN PARALLEL (BUT WAIT INTEGRATED)

      // Server Check
      const serverTask = checkServiceWithRetry(
        "Server",
        async () => {
          const res = await fetch(apiUrl("/api/health")).catch(() => null);
          return res?.ok ?? false;
        },
        (s) => setBiosStatus((prev) => ({ ...prev, server: s }))
      );

      // Core Check
      const coreTask = checkServiceWithRetry(
        "Core",
        async () => {
          const status = await memoryService
            .getCortexStatus()
            .catch(() => ({ available: false, message: "" }));

          // CRITICAL FIX: Allow boot if Cortex is authenticating/building DB ("not initialized")
          // This prevents getting stuck on BIOS screen during long RAG rebuilds.
          if (
            !status.available &&
            status.message &&
            status.message.includes("not initialized")
          ) {
            console.log(
              "[BIOS] Cortex is initializing (Background process). Allowing boot."
            );
            return true;
          }
          return status.available;
        },
        (s) => setBiosStatus((prev) => ({ ...prev, core: s }))
      );

      // Vision Check
      const visionTask = checkServiceWithRetry(
        "Vision",
        async () => {
          const res = await fetch(apiUrl("/api/vision/status")).catch(
            () => null
          );
          return res?.ok ?? false;
        },
        (s) => setBiosStatus((prev) => ({ ...prev, vision: s }))
      );

      // Audio Check (Real Microphone Permission Check)
      const audioTask = checkServiceWithRetry(
        "Audio",
        async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            // Stop immediately, we just wanted to check permissions
            stream.getTracks().forEach((track) => track.stop());
            return true;
          } catch (e) {
            console.warn("[BIOS] Microphone access denied or unavailable", e);
            return false;
          }
        },
        (s) => setBiosStatus((prev) => ({ ...prev, audio: s }))
      );

      // Wait for all critical checks
      const [serverOk, coreOk, visionOk, audioOk] = await Promise.all([
        serverTask,
        coreTask,
        visionTask,
        audioTask,
      ]);

      // 3. FINAL DECISION
      // STRICT GATING: ALL MUST BE TRUE
      if (serverOk && coreOk && visionOk && audioOk) {
        // SMART PAUSE: Only do the cinematic wait if this is a fresh session
        if (messages.length === 0) {
          await new Promise((r) => setTimeout(r, 1000)); // Cinematic pause for new users
        } else {
          console.log("[BIOS] Fast Boot: Skipping cinematic pause.");
        }

        // --- KERNEL LOADING & SYSTEM INIT ---
        setBootSequence("KERNEL");

        // 4. Initialize Awareness Subsystems (NOW GATED)
        // Restore Tools
        await restoreTools();
        // Artificial Awareness: Proprioception Scan
        console.log("[AWARENESS] Triggering Initial Self-Scan...");
        const systemHealth = await introspectionService.scan();
        // Register sensation but don't duplicate logs if reviving
        await liveService.registerSensation(systemHealth);

        // Only announce verbal status for fresh boots (and only once)
        if (messages.length === 0 && !hasAnnouncedRef.current) {
          hasAnnouncedRef.current = true; // Mark as announced
          console.log("[EXPRESSION] Speaking boot message...");
          await selfExpressionService.announceStatus(systemHealth);
        } else if (hasAnnouncedRef.current) {
          console.log("[EXPRESSION] Skipping duplicate boot message");
        }

        setTimeout(
          () => {
            const isSetupComplete =
              localStorage.getItem("LUCA_SETUP_COMPLETE") === "true";

            if (!isSetupComplete) {
              console.log(
                "[BIOS] First Run Detected - Initiating Onboarding Protocols..."
              );
              setBootSequence("ONBOARDING");
              // Removed auto-open setIsSettingsOpen(true); as OnboardingFlow handles UI now
            } else {
              setBootSequence("READY");
              setMessages((prev) => {
                if (prev.length === 0) {
                  // Dynamic time-of-day greeting
                  const hour = new Date().getHours();
                  let timeGreeting = "Good evening";
                  if (hour >= 5 && hour < 12) timeGreeting = "Good morning";
                  else if (hour >= 12 && hour < 17)
                    timeGreeting = "Good afternoon";

                  // Get user's name from profile
                  const savedProfile =
                    localStorage.getItem("LUCA_USER_PROFILE");
                  let userName = "Commander";
                  if (savedProfile) {
                    try {
                      const profile = JSON.parse(savedProfile);
                      if (profile.name) userName = profile.name;
                    } catch {
                      // Ignore invalid JSON in profile
                    }
                  }

                  const greeting = `${timeGreeting}, ${userName}.\n\nAll systems online. How may I assist?`;
                  return [
                    {
                      id: "0",
                      text: greeting,
                      sender: Sender.LUCA,
                      timestamp: Date.now(),
                    },
                  ];
                }
                return prev;
              });
            }
          },
          messages.length > 0 ? 0 : 2000
        ); // Instant transition for warm boot
      } else {
        // REMAIN ON BIOS SCREEN IF FAILED
        console.error("[BIOS] Boot Halted. System Check Failed.");
        // Optional: soundService.play("ERROR");
      }
    };

    runDiagnostics();
  }, []); // Run once on mount

  // --- ROBUST PERSISTENCE EFFECT WITH PRUNING ---
  useEffect(() => {
    try {
      // PRUNE LARGE IMAGES to prevent QuotaExceededError
      let optimizedMessages = messages.map((msg) => ({
        ...msg,
        // If attachment is large base64, truncate it for storage
        attachment:
          msg.attachment && msg.attachment.length > 1000
            ? undefined
            : msg.attachment,
        // Same for generated images, they are transient
        generatedImage:
          msg.generatedImage && msg.generatedImage.length > 1000
            ? undefined
            : msg.generatedImage,
        // Add a flag so UI knows image was pruned
        _wasPruned: !!(
          (msg.attachment && msg.attachment.length > 1000) ||
          (msg.generatedImage && msg.generatedImage.length > 1000)
        ),
      }));

      // --- PRUNE HISTORY LENGTH (Rolling Window) ---
      if (optimizedMessages.length > MAX_HISTORY_LIMIT) {
        optimizedMessages = optimizedMessages.slice(-MAX_HISTORY_LIMIT);
      }

      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(optimizedMessages));

      // --- AUTOMATIC CONVERSATION INGESTION INTO LIGHTRAG (Batched) ---
      const newMessages = optimizedMessages.slice(
        lastIngestedIndexRef.current + 1
      );
      if (newMessages.length > 0) {
        // Use a small cooldown to avoid firing on every keystroke/message pair
        // (Batching: wait 30s of idle or every 5 messages)
        const BATCH_SIZE = 5;
        const BATCH_COOLDOWN = 30000; // 30 seconds

        const triggerIngestion = () => {
          const toIngest = optimizedMessages.slice(
            lastIngestedIndexRef.current + 1
          );
          if (toIngest.length === 0) return;

          console.log(
            `[CORTEX] Ingesting batch of ${toIngest.length} messages...`
          );
          lastIngestedIndexRef.current = optimizedMessages.length - 1;

          memoryService
            .ingestConversation(
              toIngest.map((msg) => ({
                sender: msg.sender === Sender.USER ? "user" : "assistant",
                text: msg.text || "",
                timestamp: msg.timestamp,
              }))
            )
            .catch((err) => {
              console.warn("[CORTEX] Batch ingestion failed:", err);
            });
        };

        // Clear existing timer
        if (ingestionTimerRef.current) clearTimeout(ingestionTimerRef.current);

        if (newMessages.length >= BATCH_SIZE) {
          triggerIngestion();
        } else {
          // Wait for idle before ingesting small batches
          ingestionTimerRef.current = setTimeout(
            triggerIngestion,
            BATCH_COOLDOWN
          );
        }
      }
    } catch (e: any) {
      console.warn(
        "[STORAGE] Failed to save chat history (likely quota exceeded):",
        e
      );
      // Try to save just the last 10 messages as emergency fallback
      try {
        const shortHistory = messages.slice(-10).map((msg) => ({
          ...msg,
          attachment: undefined,
          generatedImage: undefined,
        }));
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(shortHistory));
        console.log("[STORAGE] Saved truncated history (last 10) as fallback.");
      } catch (e2) {
        console.error("[STORAGE] Critical storage failure.", e2);
      }
    }
  }, [messages]);

  // --- POLYGLOT MODE (NIGERIAN EAR) ---
  const isPolyglotMode = localStorage.getItem("luca_polyglot_mode") === "true";

  // Effect: When Polyglot transcripts arrive, inject them into the chat
  useEffect(() => {
    // Only process if: 1. Mode is Enabled, 2. We have a transcript, 3. It's 'Final' (not partial - assumed finalized by hook logic/user pause)
    // Actually, useVoiceInput updates 'transcript' constantly.
    // We need a trigger for "User Finished Speaking".
    // For now, let's rely on the user manually toggling or a silence timeout in useVoiceInput.
    // Assuming useVoiceInput clears transcript after processing? No, check useVoiceInput logic.
    // It keeps 'transcript' state. We need a way to consume it.

    // NOTE: 'status' in useVoiceInput switches to 'THINKING' when it gets a result?
    // Checking hook: status goes to 'THINKING' only after successfully receiving a transcript.

    if (isPolyglotMode && voiceHubTranscript && voiceHubStatus === "THINKING") {
      console.log(`[POLYGLOT] Injecting Transcript: ${voiceHubTranscript}`);
      handleSendMessage(voiceHubTranscript);
      // Reset handling is tricky here without exposing a 'clear' method from hook.
      // Ideally we should modify useVoiceInput to expose a 'consumeTranscript' or similar.
      // But for now, we'll just guard against double submission by status.
    }
  }, [voiceHubTranscript, voiceHubStatus, isPolyglotMode]);

  // --- SENTINEL LOOP REMOVED ---
  // Now showing only real logs (tool executions, system events, etc.)

  // --- SYSTEM AWARENESS (LIVE RELOAD LISTENER) ---
  // Only connect if Neural Link socket server is running (on-demand mode)
  useEffect(() => {
    let socket: ReturnType<typeof io> | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    const connectSocket = () => {
      if (socket) return; // Already connected

      socket = io(`http://localhost:${WS_PORT}`, {
        path: "/mobile/socket.io",
        query: { clientType: "desktop" },
        reconnection: false, // Don't spam reconnects if server is down
      });

      socket.on("connect", () => {
        console.log("[AWARENESS] Connected to Neural Link socket");
      });

      socket.on("connect_error", () => {
        // Server not running, clean up and retry later
        socket?.disconnect();
        socket = null;
      });

      socket.on("system_file_change", (data: any) => {
        console.log("[AWARENESS] System Change Detected:", data.filename);
        setToolLogs((prev) => [
          ...prev,
          {
            toolName: "SYSTEM_AWARENESS",
            args: { file: data.filename, path: data.path },
            result: `Detected code modification in ${data.filename}. Reloading reflexes...`,
            timestamp: Date.now(),
          },
        ]);
      });

      socket.on("autonomy_update", (event: any) => {
        window.dispatchEvent(
          new CustomEvent("autonomy-update", { detail: event })
        );
      });

      socket.on("vision-event", (event: any) => {
        if (document.visibilityState === "visible") {
          window.dispatchEvent(
            new CustomEvent("vision-update", { detail: event })
          );
        }
      });

      socket.on("agent_visual_command", (data: any) => {
        console.log("[App] 📺 Received Agent Visual Command:", data);
        setVisualData(data);
        soundService.play("SUCCESS");
      });

      socket.on("vision-event", (event: any) => {
        console.log("[VISION] Event received:", event);
        setToolLogs((prev) => [
          ...prev,
          {
            toolName: "VISION_CORE",
            args: { type: event.type, priority: event.priority },
            result: event.message,
            timestamp: Date.now(),
          },
        ]);

        if (event.priority === "CRITICAL" || event.priority === "HIGH") {
          soundService.play("ALERT");
          const visualPayload = {
            topic: `${event.type.toUpperCase()} DETECTED`,
            type: "GENERAL",
            layout: "GRID",
            items: [
              {
                title: event.message,
                imageUrl: `data:image/png;base64,${
                  event.context?.screenshot || ""
                }`,
                details: {
                  Priority: event.priority,
                  Application: event.context?.application || "System",
                  Timestamp: new Date().toLocaleTimeString(),
                  ...event.metadata,
                },
              },
            ],
          };
          setVisualData(visualPayload);
        } else if (event.type === "success") soundService.play("SUCCESS");
        else soundService.play("PROCESSING");
      });
    };

    // Check if socket server is running, connect if so
    const checkAndConnect = async () => {
      try {
        const res = await fetch(apiUrl("/api/neural-link/status"));
        const data = await res.json();
        if (data.status === "running" && !socket) {
          connectSocket();
        }
      } catch {
        // Backend not available, ignore
      }
    };

    // Initial check
    checkAndConnect();

    // Periodic check (every 5 seconds) to connect when server becomes available
    checkInterval = setInterval(checkAndConnect, 5000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      socket?.disconnect();
    };
  }, []);

  // --- SMART SCREEN IPC LISTENER ---
  // Moved from inside socket effect to top level to fix "Invalid Hook Call" error
  useEffect(() => {
    // Only attach listener if we are in visual_core mode, BUT the hook itself must run unconditionaly
    if (
      appMode === "visual_core" &&
      window.electron &&
      window.electron.ipcRenderer
    ) {
      const handleUpdate = (data: any) => {
        console.log("[SMART SCREEN] Received Data Update:", data);
        if (data.type === "BROWSER") {
          setGhostBrowserUrl(data.url);
        } else {
          setVisualData(data);
        }
      };

      const unsubscribe = window.electron.ipcRenderer.on(
        "visual-core-update",
        handleUpdate
      );
      return () => {
        if (unsubscribe && typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, [appMode]);

  // Initial Load
  useEffect(() => {
    // Sync memory with disk first
    memoryService.syncWithCore().then((syncedMemories) => {
      setMemories(syncedMemories);
    });
    setTasks(taskService.getTasks());
    setEvents(taskService.getEvents());

    // Load background
    const savedBg = localStorage.getItem("LUCA_BACKGROUND");
    if (savedBg) setBackgroundImage(savedBg);

    // Initialize last ingested index and handle one-time backfill
    const INGESTION_FLAG_KEY = "LUCA_CORTEX_INITIAL_INGESTION_DONE";
    const hasDoneInitialIngestion =
      localStorage.getItem(INGESTION_FLAG_KEY) === "true";

    if (messages.length > 0) {
      if (!hasDoneInitialIngestion) {
        // First time: Ingest all existing messages (one-time backfill)
        console.log(
          `[CORTEX] Performing one-time backfill of ${messages.length} existing messages...`
        );
        memoryService
          .ingestConversation(
            messages.map((msg) => ({
              sender: msg.sender === Sender.USER ? "user" : "assistant",
              text: msg.text || "",
              timestamp: msg.timestamp,
            }))
          )
          .then(() => {
            localStorage.setItem(INGESTION_FLAG_KEY, "true");
            console.log("[CORTEX] Initial backfill completed");
          })
          .catch((err) => {
            console.warn(
              "[CORTEX] Initial backfill failed (non-critical):",
              err
            );
          });
      }
      // Set index to last message (existing messages already ingested or will be ingested)
      lastIngestedIndexRef.current = messages.length - 1;
    }

    // Load User Profile
    const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setUserProfile(parsed);
        lucaService.setUserProfile(parsed);
      } catch (e: any) {
        console.warn(
          "[APP] Failed to parse saved profile, clearing corrupted data.",
          e
        );
        localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    }
  }, []);

  // Sync profile to service when it changes
  useEffect(() => {
    if (userProfile) {
      lucaService.setUserProfile(userProfile);
    }
  }, [userProfile]);

  // Scroll handling - Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll to bottom on initial load (show latest messages first)
  // This ensures that when chat history is loaded from localStorage, we show the latest messages
  // Scroll to bottom on initial load (show latest messages first)
  useEffect(() => {
    if (messages.length > 0) {
      // Immediate scroll for better UX on load
      chatEndRef.current?.scrollIntoView({ behavior: "auto" });

      // Secondary safety scroll after render
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, []); // Run on mount

  // Additional check: scroll when we become ready if messages exist
  useEffect(() => {
    if (bootSequence === "READY" && messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [bootSequence]);

  // Fetch autonomous goals from backend with retry
  const fetchGoals = async (retryCount = 0) => {
    try {
      const response = await fetch(apiUrl("/api/goals/list"));
      if (response.ok) {
        const data = await response.json();
        setGoals(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if (retryCount < 3) {
        // Retry after delay (1s, 2s, 4s backoff)
        const delay = 1000 * Math.pow(2, retryCount);
        console.log(`[App] Goals backend not ready, retrying in ${delay}ms...`);
        setTimeout(() => fetchGoals(retryCount + 1), delay);
      } else {
        console.warn("[App] Failed to fetch goals after retries:", error);
        setGoals([]);
      }
    }
  };

  // Restore tools to registry
  const restoreTools = async () => {
    console.log("[App] Restoring tools to registry...");
    for (const tool of allTools) {
      if (tool.name) {
        // Default to CORE category for bulk restoration
        ToolRegistry.register(tool, "CORE");
      }
    }
    // Also include Persona Switch
    ToolRegistry.register(switchPersonaTool, "CORE", [
      "persona",
      "mode",
      "theme",
      "switch",
    ]);
    console.log(`[App] Tools restored. Total: ${ToolRegistry.getAll().length}`);
  };

  // --- IOT DEVICE SYNC ---
  useEffect(() => {
    const handleDeviceUpdate = (device: any) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.id === device.id);
        if (exists) {
          return prev.map((d) => (d.id === device.id ? device : d));
        }
        return [...prev, device];
      });
    };

    // Initial load
    const loadDevices = async () => {
      const current = iotManager.getDevices();
      if (current.length > 0) {
        setDevices((prev: any[]) => {
          const newMap = new Map(prev.map((d) => [d.id, d]));
          current.forEach((d: any) => newMap.set(d.id, d));
          return Array.from(newMap.values());
        });
      }
    };

    iotManager.on("device_updated", handleDeviceUpdate);
    loadDevices();

    return () => {
      // iotManager.off("device_updated", handleDeviceUpdate);
    };
  }, []);

  // Guard against double-initialization in Strict Mode
  const hasInitialized = useRef(false);

  // INITIALIZATION Logic is now triggered by BIOS Success (Strict Gating)

  // Load goals on mount and periodically refresh
  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // WhatsApp Neural Link Event Listener
  useEffect(() => {
    const handleWhatsAppLink = () => {
      setShowWhatsAppManager(true);
      // Optional: Close other modals if needed
      // setShowSettingsModal(false); // SettingsModal logic might be handled differently
    };

    window.addEventListener("WHATSAPP_NEURAL_LINK", handleWhatsAppLink);
    return () => {
      window.removeEventListener("WHATSAPP_NEURAL_LINK", handleWhatsAppLink);
    };
  }, []);

  // Telegram Neural Link Event Listener
  useEffect(() => {
    const handleTelegramLink = () => {
      setShowTelegramManager(true);
    };
    window.addEventListener("TELEGRAM_NEURAL_LINK", handleTelegramLink);
    return () => {
      window.removeEventListener("TELEGRAM_NEURAL_LINK", handleTelegramLink);
    };
  }, []);

  // Handle goal deletion
  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(apiUrl("/api/goals/delete"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goalId }),
      });
      if (response.ok) {
        await fetchGoals(); // Refresh goals list
        soundService.play("KEYSTROKE");
      }
    } catch (error) {
      console.error("[App] Failed to delete goal:", error);
    }
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [toolLogs]);

  // Update thought visualization when toolLogs change (Phase 2 - 2050 Upgrade)
  useEffect(() => {
    if (toolLogs.length > 0) {
      const nodes = parseToolLogsToThoughtNodes(toolLogs);
      const steps = parseToolLogsToPipelineSteps(toolLogs);
      setThoughtNodes(nodes);
      setPipelineSteps(steps);
    } else {
      setThoughtNodes([]);
      setPipelineSteps([]);
    }
  }, [toolLogs]);

  // --- REAL HARDWARE API HELPER ---
  const getRealLocation = async (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          (err) => {
            console.warn("Geo permission denied", err);
            resolve({ lat: 37.5665, lng: 126.978 }); // Default Seoul
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        resolve({ lat: 37.5665, lng: 126.978 });
      }
    });
  };

  const checkLocalCore = async () => {
    try {
      const res = await fetch(apiUrl("/api/status"), {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);
      if (res) {
        setIsLocalCoreConnected(true);
        const data = await res.json();
        if (data.cwd && !currentCwd) setCurrentCwd(data.cwd);
        if (data.platform) setHostPlatform(data.platform);
        if (data.isProduction !== undefined)
          setIsKernelLocked(data.isProduction);
      } else {
        setIsLocalCoreConnected(false);
      }
    } catch {
      setIsLocalCoreConnected(false);
    }
  };

  useEffect(() => {
    // Periodically check for local backend
    const interval = setInterval(checkLocalCore, 5000);
    checkLocalCore();
    return () => clearInterval(interval);
  }, []);

  // Sync IoT Devices
  useEffect(() => {
    // Initialize Real Hardware (if configured)
    import("./services/iot/init").then(({ initIoT }) => initIoT());

    // Load devices from manager (Mock + Real)
    const currentDevices = iotManager.getDevices();
    if (currentDevices.length > 0) {
      setDevices(currentDevices);
    }

    // Poll for updates (simple sync for demo)
    const interval = setInterval(() => {
      const updated = iotManager.getDevices();
      // Only update if count changed (basic check to avoid excessive renders)
      if (updated.length !== devices.length) {
        setDevices(updated);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- SYNC PLATFORM TO AI ---
  useEffect(() => {
    lucaService.setPlatform(hostPlatform);
  }, [hostPlatform]);

  // --- BROWSER FALLBACK DETECTION (iOS/Android) ---
  useEffect(() => {
    if (!isLocalCoreConnected) {
      const ua = navigator.userAgent;
      if (/iPad|iPhone|iPod/.test(ua)) {
        setHostPlatform("iOS (Safari)");
      } else if (/Android/.test(ua)) {
        setHostPlatform("Android (Chrome)");
      } else if (/Win/.test(ua)) {
        setHostPlatform("Windows (Browser)");
      } else if (/Mac/.test(ua)) {
        setHostPlatform("macOS (Browser)");
      } else if (/Linux/.test(ua)) {
        setHostPlatform("Linux (Browser)");
      }
    }
  }, [isLocalCoreConnected]);

  // Screen Share State
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // --- SCREEN CAPTURE HANDLER ---
  // --- SCREEN CAPTURE HANDLER ---
  const handleScreenShare = async () => {
    soundService.play("HOVER");
    const nextState = !isScreenSharing;
    setIsScreenSharing(nextState);
  };

  // --- WAKE-ON-VOICE VISION SYNC ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isVadActive && isScreenSharing) {
      // Immediate capture on wake
      if (screenShareRef.current) {
        screenShareRef.current.captureFrame();
      }

      // Loop every 1s while speaking (high frequency vision)
      interval = setInterval(() => {
        if (screenShareRef.current) {
          screenShareRef.current.captureFrame();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVadActive, isScreenSharing]);

  const handleScreenFrame = (base64: string) => {
    // Strip prefix for Gemini Native processing
    const rawBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, "");
    // Send directly to the live session
    liveService.sendVideoFrame(rawBase64);
  };

  // --- MOBILE REMOTE SUCCESS HANDLER ---
  const handleRemoteSuccess = () => {
    setShowRemoteModal(false);
    soundService.play("SUCCESS");

    // Add a new simulated mobile device if not present
    const existingMobile = devices.find((d) => d.type === DeviceType.MOBILE);
    const newDevice: SmartDevice = existingMobile || {
      id: `mobile_${Date.now()}`,
      name: "Samsung S24 Ultra",
      type: DeviceType.MOBILE,
      isOn: true,
      status: "online",
      location: "Near-Field",
    };

    if (!existingMobile) {
      setDevices((prev) => [newDevice, ...prev]);
    }

    setActiveMobileDevice(newDevice);
    setShowMobileManager(true);

    // Log success
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "Remote Uplink Successful. Mobile Control Interface Active.",
        sender: Sender.SYSTEM,
        timestamp: Date.now(),
      },
    ]);
  };

  // --- PREDICTION MARKET HANDLER ---
  const handlePlaceBet = (
    marketId: string,
    outcome: "Yes" | "No",
    amount: number,
    title: string,
    price: number
  ) => {
    const newPos: PolyPosition = {
      id: `pos_${Date.now()}`,
      marketId,
      question: title,
      outcome,
      shares: amount / price,
      avgPrice: price,
      currentPrice: price, // Simulate instant price
      pnl: 0,
    };
    setPolyPositions((prev) => [...prev, newPos]);
    soundService.play("SUCCESS");

    // Log to chat
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: `BET EXECUTED: $${amount} on ${outcome} for "${title}". Position tracked.`,
        sender: Sender.SYSTEM,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleCyclePersona = async () => {
    // Prevent mode change while rebooting
    if (isRebooting) {
      console.warn(
        "[handleCyclePersona] Persona switch in progress, ignoring request"
      );
      return;
    }

    soundService.play("KEYSTROKE");
    const personas: PersonaType[] = [
      "RUTHLESS",
      "ASSISTANT",
      "ENGINEER",
      "HACKER",
    ];
    const currentIndex = personas.indexOf(persona);
    const nextIndex = (currentIndex + 1) % personas.length;
    const nextPersona = personas[nextIndex];

    // Trigger manual switch logic
    executeTool("switchPersona", { mode: nextPersona });
  };

  const handleIngest = (url: string) => {
    setShowIngestionModal(false);
    executeTool("ingestGithubRepo", { url });
  };

  // --- CLEAR CHAT FUNCTION ---
  const handleClearChat = () => {
    soundService.play("ALERT");
    const confirm = window.confirm(
      "WARNING: PURGE NEURAL LOGS? This cannot be undone."
    );
    if (confirm) {
      setMessages([]);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  };

  const handleWipeMemory = () => {
    soundService.play("ALERT");
    const confirm = window.confirm(
      "WARNING: WIPE NEURAL ARCHIVE? This cannot be undone."
    );
    if (confirm) {
      memoryService.wipeMemory();
      setMemories([]);
    }
  };

  const handleDeleteSingleMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    soundService.play("ALERT");
    // Also try to update backend/persistent store if available
    // For now, client-side only based on current implementation patterns
  };

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    lucaService.setUserProfile(profile);

    // Provide feedback
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: `USER PROFILE UPDATED. HELLO, ${profile.name.toUpperCase()}.`,
        sender: Sender.SYSTEM,
        timestamp: Date.now(),
      },
    ]);
    soundService.play("SUCCESS");
  };

  // --- Human Input Polling (for credential prompts) ---
  const pollForHumanInput = (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/web/human-input?sessionId=${sessionId}`)
        );
        const data = await res.json();

        if (data.pending && !humanInputModal?.isOpen) {
          setHumanInputModal({
            isOpen: true,
            prompt: data.prompt,
            sessionId: sessionId,
          });
        } else if (
          !data.pending &&
          humanInputModal?.isOpen &&
          humanInputModal.sessionId === sessionId
        ) {
          setHumanInputModal(null);
          clearInterval(interval);
        }
      } catch (error) {
        // Session might be closed, stop polling
      }
    }, 2000); // Poll every 2 seconds (Reduced load)

    // Cleanup after 2 minutes (Reduced timeout)
    setTimeout(() => clearInterval(interval), 2 * 60 * 1000);
  };

  const handleHumanInputSubmit = async (input: string) => {
    if (!humanInputModal) return;

    try {
      await fetch(apiUrl("/api/web/human-input"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: humanInputModal.sessionId,
          input: input,
        }),
      });

      setHumanInputModal(null);
    } catch (error) {
      console.error("[App] Failed to submit human input:", error);
    }
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Agent "Hands" Implementation ---

  // --- EFFECT: Listen for Persona Switch (Tray Menu) ---
  const handlePersonaSwitch = async (mode: string) => {
    // Prevent switching while already rebooting or same mode
    if (isRebooting || mode === persona) return;

    setIsRebooting(true);

    try {
      setPersona(mode as any);
      await lucaService.setPersona(mode as any);

      // CRITICAL: If Voice is Active, Reconnect with New Persona
      if (isVoiceMode) {
        console.log(`[LIVE] Reconnecting voice for new persona: ${mode}`);
        // Use Encapsulated Logic (Refactored)
        await liveService.switchPersona(mode as any);
      }

      // Clear reboot state after a delay
      setTimeout(() => {
        setIsRebooting(false);
      }, 1500);
    } catch (e) {
      console.error("Persona switch failed", e);
      setIsRebooting(false);
    }
  };

  const executeTool = async (name: string, args: any): Promise<string> => {
    // 0. Start polling for potential human input (credentials, 2FA)
    // OPTIMIZATION: Only poll for tools that typically require interaction
    const INTERACTIVE_TOOLS = [
      "run_terminal",
      "terminal",
      "ssh_connect",
      "access_aws",
      "cloud_login",
      "deploy",
      "git_clone",
    ];

    if (INTERACTIVE_TOOLS.includes(name)) {
      pollForHumanInput(conversationService.getSessionId());
    }

    // 1. Initialize Tool Log
    setToolLogs((prev) => [
      ...prev,
      {
        toolName: name,
        args: args,
        result: "EXECUTING...",
        timestamp: Date.now(),
      },
    ]);

    // --- SPECIAL HANDLING: Chat ---
    // Allow mobile/remote devices to "speak" to Luca via the chat tool
    if (name === "chat") {
      const text = args.text || args.message || "";
      if (text) {
        await handleSendMessage(text);
        return "Message processed by LUCA";
      }
    }

    // --- AUTOMATIC TOOL DELEGATION ---
    // Check if current device can run this tool
    const currentDeviceType = currentDeviceTypeRef.current;

    // Skip delegation checks for "core" tools that should always run locally or are handled by registry routing
    // But do check for OS-specific tools if we are on a different device
    const canRun = canDeviceRunTool(currentDeviceType as any, name);

    if (!canRun) {
      // Device can't run this tool - find best device to delegate to
      const availableDevices = Array.from(
        (neuralLinkManager as any).devices?.values() || []
      ).map((d: any) => ({
        type: d.type as any,
        deviceId: d.deviceId,
        name: d.name,
      }));

      const bestDevice = findBestDeviceForTool(name, availableDevices);

      if (bestDevice && bestDevice.deviceId !== "desktop_main") {
        // Delegate to remote device
        try {
          console.log(
            `[AUTO-DELEGATE] Tool "${name}" cannot run on ${currentDeviceType}, delegating to ${bestDevice.name} (${bestDevice.type})`
          );
          const result = await (neuralLinkManager as any).delegateTool(
            bestDevice.deviceId,
            name,
            args
          );
          const resultText =
            result?.result ||
            result?.error ||
            `Tool executed on ${bestDevice.name}`;

          // Update tool logs
          setToolLogs((prev) => {
            const newLogs = [...prev];
            if (newLogs.length > 0) {
              newLogs[
                newLogs.length - 1
              ].result = `[DELEGATED to ${bestDevice.name}] ${resultText}`;
            }
            return newLogs;
          });

          return resultText;
        } catch (error: any) {
          const errorMsg = `ERROR: Failed to delegate tool to ${bestDevice.name}: ${error.message}`;
          setToolLogs((prev) => {
            const newLogs = [...prev];
            if (newLogs.length > 0) {
              newLogs[newLogs.length - 1].result = errorMsg;
            }
            return newLogs;
          });
          return errorMsg;
        }
      } else if (bestDevice && bestDevice.deviceId === "desktop_main") {
        // Best device is desktop (current device) - this shouldn't happen, but fall through to normal execution
        console.warn(
          `[AUTO-DELEGATE] Tool "${name}" should run on desktop but device type is ${currentDeviceType}`
        );
      } else {
        // No suitable device found
        // Fallback: If it's a server tool, we might still try to run it via the local core bridge
        // so we don't return error immediately unless we are sure.
        // But sticking to original logic:
        const errorMsg = `ERROR: Tool "${name}" cannot run on ${currentDeviceType} and no suitable device is available for delegation.`;
        // setToolLogs((prev) => {
        //   const newLogs = [...prev];
        //   if (newLogs.length > 0) {
        //     newLogs[newLogs.length - 1].result = errorMsg;
        //   }
        //   return newLogs;
        // });
        // return errorMsg;
        // RELAXED LOGIC: Fallthrough to Registry instead of hard blocking,
        // as Registry handles checks too.
        console.warn(errorMsg);
      }
    }

    // --- REFACTORED TOOL EXECUTION (Delegated to Registry) ---

    const context: ToolExecutionContext = {
      lucaService,
      liveService,
      soundService,
      memoryService,
      setToolLogs,
      setShowMobileFileBrowser,
      setShowAutonomyDashboard,
      setShowCodeEditor,
      setVoiceSearchResults,
      setLiveContent,
      setVisualData,
      setIngestionState,
      setStockTerminalSymbol,
      setShowStockTerminal,
      setShowSkillsMatrix,
      setShowSubsystemDashboard,
      setActiveWebview,
      // Ghost Browser Injection
      setShowGhostBrowser,
      setGhostBrowserUrl,
      setIsRebooting,
      isLocalCoreConnected,
      isVoiceMode,
      hostPlatform,
      isRebooting, // Note: Duplicated property key "isRebooting" in original, keeping or fixing doesn't matter much for functionality but cleaner to keep one.
      attachedImage,
      messages,
      handleSendMessage,
      handlePersonaSwitch,
      displayId: contextDisplayId, // Inject Context ID
      currentDeviceType: currentDeviceTypeRef.current, // For Neural Link routing
      neuralLinkManager: neuralLinkManager, // For cross-device delegation
      setOsintProfile,
      setShowOsintDossier,
      setCryptoWallet,
      setForexAccount,
    };

    // --- SPECIAL UI TRIGGERS ---
    if (name === "simulateSecurityAudit") {
      setVisualData({
        topic: args.target || "WebKeyDAO",
        type: "SECURITY",
        layout: "CAROUSEL",
        items: [
          {
            title: args.target || "WebKeyDAO",
            imageUrl: "", // Handled by SecurityHUD internal visuals
            details: {
              status: "AUDITING",
              projectedProfit: "1.45",
              scanCost: "$1.22",
              successProbability: "55.88%",
              threatLevel: "85",
            },
          },
        ],
      });
    }

    let result = "";
    try {
      result = await ToolRegistry.execute(name, args, context);
    } catch (e: any) {
      console.error(`Tool Execution Failed: ${e.message}`);
      result = `CRITICAL ERROR: ${e.message}`;
    }

    // Update the log with the final result (Safely)
    setToolLogs((prev) => {
      const newLogs = [...prev];
      if (newLogs.length > 0) {
        const lastLog = newLogs[newLogs.length - 1];
        // Ensure we are updating the correct log (simple check)
        if (lastLog && lastLog.toolName === name) {
          lastLog.result = result;
        } else {
          // Fallback: If mismatch or empty, push new result
          newLogs.push({
            toolName: name,
            args: args,
            result: result,
            timestamp: Date.now(),
          });
        }
      } else {
        // Should not happen if step 1 ran, but safe fallback
        newLogs.push({
          toolName: name,
          args: args,
          result: result,
          timestamp: Date.now(),
        });
      }
      return newLogs;
    });

    return result;
  };

  // --- NEURAL LINK COMMAND LISTENER (Mobile Mode) ---
  // This enables the desktop to control this device when running as a mobile app
  useEffect(() => {
    // Enable for ALL devices so Desktop can receive commands from Mobile
    // if (!hasCapability(currentDeviceTypeRef.current as any, "mobile")) return;

    const handleCommand = async (event: any) => {
      const { message } = event.data;
      if (message.type === "command" && message.payload) {
        console.log(
          `[NEURAL LINK] Received delegated command: ${message.payload.command}`
        );
        const { command, args } = message.payload;
        const cmdId = message.commandId;

        // Execute the tool
        try {
          const result = await executeTool(command, args);

          // Send result back to origin (Desktop)
          // We use a raw system event because we might not have a full encrypted session with the server
          // The server trusts us via our token
          neuralLinkManager.sendSystemEvent("command:result", {
            id: cmdId,
            result: result,
            deviceId: (neuralLinkManager as any).myDeviceId,
          });
        } catch (error: any) {
          neuralLinkManager.sendSystemEvent("command:result", {
            id: cmdId,
            error: error.message,
            deviceId: (neuralLinkManager as any).myDeviceId,
          });
        }
      }
    };

    neuralLinkManager.on("command:received", handleCommand);

    return () => {
      neuralLinkManager.off("command:received", handleCommand);
    };
  }, []);

  // --- Interaction Logic ---

  // --- VOICE MESSAGE HANDLER ---
  const handleSendMessage = async (
    text: string,
    onProgress?: (message: string, progress?: number) => void
  ): Promise<string | undefined> => {
    if (!text.trim() || isProcessing) return;

    // Track message source (default to desktop if not set)
    const messageSource = lastMessageSourceRef.current || "desktop";
    lastMessageSourceRef.current = null; // Reset after use

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      sender: Sender.USER,
      timestamp: Date.now(),
    };

    // Update UI immediately
    setMessages((prev) => [...prev, userMsg]);

    // Store conversation in Chroma DB (Phase 1: Memory)
    conversationService
      .storeMessage(userMsg, {
        persona: persona,
        deviceType: messageSource,
        sessionId: conversationService.getSessionId(),
      })
      .catch((err) =>
        console.warn("[CONVERSATION] Failed to store user message:", err)
      );

    setIsProcessing(true);

    // Sync user message to mobile if from desktop
    if (messageSource === "desktop") {
      broadcastMessageToMobile(userMsg.text, "user");
    }

    try {
      // Immediate acknowledgment for voice
      if (isVoiceMode) {
        setVoiceTranscript("Processing your request...");
        setVoiceTranscriptSource("model");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: "typing",
          text: "...",
          sender: Sender.LUCA,
          timestamp: Date.now(),
          isTyping: true,
        },
      ]);

      const agentResponse = await lucaService.sendMessage(
        text,
        null,
        executeTool,
        currentCwd
      );

      const lucaResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: agentResponse.text || "",
        sender: Sender.LUCA,
        timestamp: Date.now(),
        groundingMetadata: agentResponse.groundingMetadata,
        generatedImage: agentResponse.generatedImage,
      };

      setMessages((prev) =>
        prev.filter((m) => !m.isTyping).concat(lucaResponse)
      );

      // Store LUCA response in Chroma DB (Phase 1: Memory)
      conversationService
        .storeMessage(lucaResponse, {
          persona: persona,
          deviceType: messageSource,
          sessionId: conversationService.getSessionId(),
          toolsUsed: toolLogs.slice(-5).map((log) => log.toolName), // Last 5 tools used
        })
        .catch((err) =>
          console.warn("[CONVERSATION] Failed to store LUCA response:", err)
        );

      // Broadcast LUCA response to mobile (regardless of source)
      if (agentResponse.text) {
        broadcastMessageToMobile(agentResponse.text, "luca");
      }

      // TTS - Speak response naturally
      if (agentResponse.text && isVoiceMode) {
        const apiKey = localStorage.getItem("google_tts_api_key");
        const voiceConfig = {
          languageCode: localStorage.getItem("google_tts_language") || "en-NG",
          name: localStorage.getItem("google_tts_voice") || "",
        };

        setIsSpeaking(true);
        try {
          // Update transcript with response
          setVoiceTranscript(agentResponse.text);
          setVoiceTranscriptSource("model");

          const audioBlob = await voiceService.speak(
            agentResponse.text,
            apiKey || undefined,
            voiceConfig.name ? voiceConfig : undefined
          );

          // BROADCAST TTS TO TV/MOBILE
          if (audioBlob && neuralLinkSocketRef.current?.connected) {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const base64Audio = reader.result;
              neuralLinkSocketRef.current?.emit("client:stream", {
                type: "tts_audio",
                data: base64Audio,
                timestamp: Date.now(),
              });
            };
          }
        } finally {
          setIsSpeaking(false);
        }
      }

      soundService.play("SUCCESS");
      return agentResponse.text; // Return text for callers
    } catch (error) {
      console.error("Voice Message Failed:", error);
      soundService.play("ALERT");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setMessages((prev) => prev.filter((m) => m.id !== "typing"));
    soundService.play("KEYSTROKE"); // Feedback
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isProcessing) return;
    soundService.play("KEYSTROKE");

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: Sender.USER,
      timestamp: Date.now(),
      attachment: attachedImage || undefined,
    };

    // PERSISTENCE: Save to state (Effect will sync to LS)
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    // Store conversation in Chroma DB (Phase 1: Memory)
    conversationService
      .storeMessage(userMsg, {
        persona: persona,
        deviceType: "desktop",
        sessionId: conversationService.getSessionId(),
      })
      .catch((err) =>
        console.warn("[CONVERSATION] Failed to store user message:", err)
      );

    setInput("");
    setAttachedImage(null);
    setIsProcessing(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setMessages((prev) => [
        ...prev,
        {
          id: "typing",
          text: "...",
          sender: Sender.LUCA,
          timestamp: Date.now(),
          isTyping: true,
        },
      ]);

      // Create placeholder message immediately
      const responseId = (Date.now() + 1).toString();
      const initialResponse: Message = {
        id: responseId,
        text: "", // Start empty
        sender: Sender.LUCA,
        timestamp: Date.now(),
        isTyping: false, // Not "typing" (dots), but "streaming" content
        isStreaming: true,
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== "typing").concat(initialResponse)
      );

      let streamedText = "";

      // Pass full history to service for context restoration
      // Pass image data if available
      const agentResponse = await lucaService.sendMessageStream(
        userMsg.text,
        userMsg.attachment || null,
        (chunk) => {
          streamedText += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === responseId ? { ...m, text: streamedText } : m
            )
          );
        },
        executeTool,
        currentCwd
      );

      if (controller.signal.aborted) {
        console.log("Request aborted by user");
        return;
      }

      // Finalize the message (ensure it has everything and turn off streaming)
      const lucaResponse = {
        ...initialResponse,
        text: agentResponse.text || streamedText,
        groundingMetadata: agentResponse.groundingMetadata,
        generatedImage: agentResponse.generatedImage,
        isStreaming: false, // Done streaming
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === responseId ? lucaResponse : m))
      );

      // Store LUCA response in Chroma DB (Phase 1: Memory)
      conversationService
        .storeMessage(lucaResponse, {
          persona: persona,
          deviceType: "desktop",
          sessionId: conversationService.getSessionId(),
          toolsUsed: toolLogs.slice(-5).map((log) => log.toolName), // Last 5 tools used
        })
        .catch((err) =>
          console.warn("[CONVERSATION] Failed to store LUCA response:", err)
        );

      if (
        neuralLinkSocketRef.current &&
        neuralLinkSocketRef.current.connected
      ) {
        // Only broadcast if message didn't come from mobile (prevent loop)
        if (lastMessageSourceRef.current !== "mobile") {
          neuralLinkSocketRef.current.emit("client:message", {
            id: crypto.randomUUID(),
            type: "response",
            source: "desktop",
            target: "all",
            response: {
              success: true,
              result: lucaResponse.text,
              timestamp: lucaResponse.timestamp,
            },
            timestamp: Date.now(),
          });
          console.log("[NEURAL LINK] Broadcasted response to mobile devices");
        }
        // Reset message source tracking
        lastMessageSourceRef.current = "desktop";
      }

      // TTS: Speak if Voice Mode is active
      // TTS: Speak if Voice Mode is active
      if (isVoiceMode && agentResponse.text) {
        const apiKey = localStorage.getItem("google_tts_api_key");
        const voiceConfig = {
          languageCode: localStorage.getItem("google_tts_language") || "en-NG",
          name: localStorage.getItem("google_tts_voice") || "",
        };

        // Speak and broadcast audio to mobile
        voiceService
          .speak(
            agentResponse.text,
            apiKey || undefined,
            voiceConfig.name ? voiceConfig : undefined
          )
          .then((audioBlob) => {
            if (
              audioBlob &&
              neuralLinkSocketRef.current &&
              neuralLinkSocketRef.current.connected
            ) {
              // Convert Blob to ArrayBuffer for sending
              audioBlob.arrayBuffer().then((buffer) => {
                neuralLinkSocketRef.current.emit("client:stream", {
                  type: "tts_audio",
                  data: buffer,
                  source: "desktop",
                  timestamp: Date.now(),
                });
                console.log(
                  `[NEURAL LINK] Broadcasted TTS audio (${audioBlob.size} bytes) to mobile`
                );
              });
            }
          });
      }

      soundService.play("SUCCESS");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown connection error";
      setMessages((prev) =>
        prev
          .filter((m) => !m.isTyping)
          .concat([
            {
              id: (Date.now() + 1).toString(),
              text: `CRITICAL FAILURE: Neural Core Unresponsive.\nREASON: ${errorMessage}`,
              sender: Sender.SYSTEM,
              timestamp: Date.now(),
            },
          ])
      );
      soundService.play("ALERT");
    } finally {
      setIsProcessing(false);
      // Clean up controller reference
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [dictationActive, setDictationActive] = useState(false);

  // --- VOICE SESSION MANAGEMENT ---
  const connectVoiceSession = useCallback(
    (targetPersona: PersonaType) => {
      console.log(
        `[APP] Connecting Voice Session for Persona: ${targetPersona}...`
      );
      liveService.connect({
        persona: targetPersona,
        onToolCall: executeTool,
        onAudioData: (amp) => {
          setVoiceAmplitude(amp);
          // Sync with Widget UI

          window.electron?.ipcRenderer?.send("widget-voice-data", {
            amplitude: amp,
          });
        },
        onVadChange: (isActive) => {
          setIsVadActive(isActive);
          // Sync with Widget UI

          window.electron?.ipcRenderer?.send("widget-voice-data", {
            isVadActive: isActive,
          });
        },
        onTranscript: (text, type) => {
          // --- DICTATION MODE HANDLING ---
          if (targetPersona === "DICTATION") {
            console.log(
              `[APP] DICTATION transcript received - type: ${type}, text: "${text}"`
            );
            if (type === "user" && text && text.trim().length > 0) {
              console.log(`[APP] Sending to type-text IPC: "${text}"`);
              // Send to System for Typing

              window.electron?.ipcRenderer?.send("type-text", { text });
              setVoiceTranscript(text); // Show in HUD
            }
            return; // Skip normal chat processing
          }

          if (text && text.trim().length > 0) {
            setVoiceTranscript(text);
            setVoiceTranscriptSource(type);
          }
          // NEW: Clear search results if user is speaking to reset HUD context
          if (type === "user") {
            setVoiceSearchResults(null);
            setVoiceStatus(null); // Clear status on new turn
          }
          // PERSIST VOICE INPUT (User)
          if (type === "user" && text.trim().length > 0) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                text: text,
                sender: Sender.USER,
                timestamp: Date.now(),
              },
            ]);
          }
        },

        onStatusUpdate: (message) => {
          // Real-time status updates (Technical Log)
          // Do NOT overwrite the main transcript
          setVoiceStatus(message);
        },
        history: messages, // PASS HISTORY
        profile: userProfile, // PASS USER PROFILE
      });
    },
    [messages, executeTool, userProfile]
  ); // Dependencies

  // Effect to handle persona switching while voice is active
  // track previous persona to prevent loops when other deps change
  const prevPersonaRef = useRef(persona);
  const prevDictationRef = useRef(dictationActive);
  const prevVoiceModeRef = useRef(isVoiceMode);

  useEffect(() => {
    const personaChanged = prevPersonaRef.current !== persona;
    const dictationChanged = prevDictationRef.current !== dictationActive;
    const voiceModeJustActivated = isVoiceMode && !prevVoiceModeRef.current;

    // Connect on FIRST activation OR when persona/dictation changes while active
    if (voiceModeJustActivated) {
      console.log(`[APP] Voice mode activated. Connecting session...`);
      const target = dictationActive ? "DICTATION" : persona;
      connectVoiceSession(target);
    } else if (isVoiceMode && (personaChanged || dictationChanged)) {
      console.log(
        `[App] Configuration changed (Persona: ${persona}, Dictation: ${dictationActive}) while voice active. Reconnecting...`
      );
      liveService.disconnect();
      // Small timeout to allow disconnect to cleanup
      setTimeout(() => {
        const target = dictationActive ? "DICTATION" : persona;
        console.log(
          `[APP] Connecting voice session with persona: ${target}, dictationActive: ${dictationActive}`
        );
        connectVoiceSession(target);
      }, 100);
    }

    // Update refs
    prevPersonaRef.current = persona;
    prevDictationRef.current = dictationActive;
    prevVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode, persona, dictationActive, connectVoiceSession]);

  // --- VOICE LIFECYCLE MANAGEMENT ---
  // Ensure voice hub stops if isVoiceMode is false (Failsafe)
  useEffect(() => {
    if (!isVoiceMode && isVoiceHubListening) {
      console.log("[APP] Failsafe: Stopping Voice Hub");
      stopVoiceHub();
      setIsVadActive(false);
    }
  }, [isVoiceMode, isVoiceHubListening, stopVoiceHub]);

  const toggleVoiceMode = (overrideMode?: string, forceHud = true) => {
    console.log(
      `[APP] toggleVoiceMode called. Mode: ${overrideMode}, ForceHud: ${forceHud}, CurrentState: ${isVoiceMode}`
    );
    soundService.play("HOVER");
    if (isVoiceMode && overrideMode !== "DICTATION" && overrideMode !== "OFF") {
      // Logic fix: If already dictating and we get "DICTATION" again, maybe we should ignore or restart?
      // But for now, let's log.
    }

    if (isVoiceMode) {
      if (overrideMode === "DICTATION" && !dictationActive) {
        // Switching from Chat to Dictation?
        console.log("[APP] Switching to Dictation Mode...");
      } else {
        // Stopping
        console.log("[APP] Stopping Voice Session...");
        stopVoiceHub();
        liveService.disconnect();
        voiceService.stop();
        setIsVoiceMode(false);
        setIsVadActive(false);
        setDictationActive(false);
        setShowVoiceHud(false);
        return;
      }
    }

    // Turning ON
    if (overrideMode === "DICTATION") {
      console.log("[APP] Activating DICTATION State...");
      setDictationActive(true);
    }
    setIsVoiceMode(true);
    setShowVoiceHud(forceHud);
  };

  // Stable ref for toggle function to avoid re-binding IPC listeners
  const toggleVoiceModeRef = useRef(toggleVoiceMode);
  // Update ref whenever function changes
  useEffect(() => {
    toggleVoiceModeRef.current = toggleVoiceMode;
  }, [toggleVoiceMode]);

  // --- WIDGET VOICE TOGGLE LISTENER ---
  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const remove = window.electron?.ipcRenderer?.on(
        "trigger-voice-toggle",
        (payload: any) => {
          // Dashboard handles voice sessions for all widgets
          // Widget/Hologram windows just display UI, dashboard does the work

          // ALLOW DICTATION: The Widget (via Main) sends this to start the engine.
          if (payload?.mode === "DICTATION" || payload?.mode === "TOGGLE") {
            console.log(
              "[APP] 🎤 Received voice toggle from Widget. Mode:",
              payload?.mode
            );
            if (toggleVoiceModeRef.current) {
              toggleVoiceModeRef.current(
                "DICTATION",
                false // forceHud=false (Stay hidden, let Widget handle UI)
              );
            } else {
              console.error("[APP] ❌ toggleVoiceModeRef is missing!");
            }
            return;
          }

          // Handle explicit OFF command
          if (payload?.mode === "OFF") {
            console.log("[APP] 🔇 Received OFF command from Widget");
            if (toggleVoiceModeRef.current) {
              toggleVoiceModeRef.current("OFF", false);
            }
            return;
          }

          // ALLOW OFF SIGNAL: Widget sends this to stop dictation.
          if (payload?.mode === "OFF") {
            if (toggleVoiceModeRef.current) {
              toggleVoiceModeRef.current("OFF");
            }
            return;
          }

          // BLOCKING: If this event is coming from Dictation Logic, ignore it.
          // The Dashboard has its own Voice Hub toggle (Ctrl+H or UI button).
          // We assume 'trigger-voice-toggle' here is legacy or misrouting from Main.

          console.log(
            "[APP] Ignoring global voice toggle for Dashboard (prevent conflict)."
          );
        }
      );

      return () => remove && remove();
    }
  }, []); // Bind ONCE only

  // --- CHAT WIDGET LISTENER ---
  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const remove = window.electron?.ipcRenderer?.on(
        "trigger-chat-message",
        async (payload: any) => {
          let message = "";

          // Handle Object Payload vs Legacy String
          if (typeof payload === "object" && payload.text) {
            message = payload.text;
            if (payload.displayId) setContextDisplayId(payload.displayId);
          } else if (typeof payload === "string") {
            message = payload;
          }

          console.log("[APP] Widget sent message:", message);

          // CRITICAL: Bring main window to front when interacting via widget
          // otherwise Visual Core activates in the background
          if (window.electron && window.electron.ipcRenderer) {
            // Request main process to show and focus the window
            window.electron.ipcRenderer.send("request-focus");
          }

          // Force Voice Mode off for text interaction to avoid TTS confusion if mixed
          // But if user wants TTS, they can toggle it.
          // For now, let's just process it.
          const response = await handleSendMessage(message);
          if (response) {
            window.electron?.ipcRenderer?.send("reply-chat-widget", response);
          }
        }
      );

      return () => remove && remove();
    }
  }, []);

  // Stable ref for persona switch
  const handlePersonaSwitchRef = useRef(handlePersonaSwitch);
  useEffect(() => {
    handlePersonaSwitchRef.current = handlePersonaSwitch;
  }, [handlePersonaSwitch]);

  // --- TRAY PERSONA SWITCH LISTENER ---
  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const remove = window.electron?.ipcRenderer?.on(
        "switch-persona",
        (mode: string) => {
          console.log("[APP] Tray requested persona switch:", mode);
          if (handlePersonaSwitchRef.current) {
            handlePersonaSwitchRef.current(mode);
          }
        }
      );

      return () => remove && remove();
    }
  }, []);

  // --- CHAT WIDGET MESSAGE LISTENER ---
  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const remove = window.electron?.ipcRenderer?.on(
        "chat-widget-message",
        async (data: { text: string; image?: string; displayId?: number }) => {
          console.log("[APP] Received chat-widget-message:", data.text);

          try {
            // Process the message
            const response = await handleSendMessage(data.text);

            // Send response back to chat widget
            if (response) {
              window.electron?.ipcRenderer?.send("reply-chat-widget", response);
            }
          } catch (error) {
            console.error("[APP] Error processing chat widget message:", error);

            window.electron?.ipcRenderer?.send(
              "reply-chat-widget",
              "Sorry, I encountered an error processing your message."
            );
          }
        }
      );

      return () => remove && remove();
    }
  }, [handleSendMessage]);

  // Initialize task queue
  useEffect(() => {
    // Store handleSendMessage reference to avoid dependency issues
    const executeCommand = async (
      command: string,
      onProgress?: (message: string, progress?: number) => void
    ): Promise<string> => {
      return await new Promise<string>((resolve, reject) => {
        handleSendMessage(command, onProgress)
          .then(() => {
            resolve("Command executed");
          })
          .catch(reject);
      });
    };

    taskQueue.setExecutor(executeCommand);
    taskQueue.onStatusUpdate((tasks) => {
      setQueuedTasks(tasks);
    });

    return () => {
      taskQueue.clear();
    };
  }, []); // Empty deps - handleSendMessage is stable

  // Initialize Neural Link guest message handler
  useEffect(() => {
    // Wire up guest messages to Luca AI processing
    const processGuestMessage = async (message: string): Promise<string> => {
      // Add the guest message to chat history
      const guestMessage: Message = {
        id: Date.now().toString(),
        text: message,
        sender: Sender.USER,
        timestamp: Date.now(), // Use number, not Date
      };
      setMessages((prev) => [...prev, guestMessage]);

      // Process with handleSendMessage and return the response
      try {
        await handleSendMessage(message);
        // Get the last assistant message as the response
        const lastAssistant = messages
          .filter((m) => m.sender === Sender.LUCA)
          .pop();
        return lastAssistant?.text || "I processed your request.";
      } catch (e) {
        console.error("[GuestHandler] Failed to process:", e);
        throw e;
      }
    };

    // Generate TTS audio for response
    const generateAudio = async (text: string): Promise<string | null> => {
      try {
        // Use the voice service to generate audio
        const settings = settingsService.getSettings();
        if (settings.voice.provider === "local-neural") {
          // Call Cortex TTS and get base64
          const response = await fetch(cortexUrl("/tts"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              voice: settings.voice.voiceId || "amy",
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.type === "audio" && data.data) {
              return data.data; // Already base64
            }
          }
        }
        return null;
      } catch (e) {
        console.warn("[GuestHandler] Audio generation failed:", e);
        return null;
      }
    };

    neuralLinkService.initGuestHandler(processGuestMessage, generateAudio);
    console.log("[App] Neural Link guest handler initialized");
  }, [handleSendMessage, messages]);

  // GLOBAL KEYBOARD LISTENERS (HOTKEYS)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Alt + V : Voice Mode
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        toggleVoiceMode();
      }
      // Alt + I : IDE
      if (e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setShowCodeEditor((prev) => !prev);
      }
      // Alt + D : Data Room (Visual Core Dashboard)
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setVisualData((prev: any) => {
          if (prev && prev.topic === "DATA_ROOM") return null; // Close if open
          return {
            topic: "DATA_ROOM",
            type: "GENERAL",
            layout: "GRID", // Ignored by VisualCore in favor of DATA_ROOM mode logic
            items: [],
          };
        });
      }
      // Alt + C : Cinema Mode
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setVisualData((prev: any) => {
          if (prev && prev.topic === "CINEMA") return null; // Close if open
          return {
            topic: "CINEMA",
            type: "GENERAL",
            layout: "GRID",
            items: [],
          };
        });
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [isVoiceMode]); // Depend on isVoiceMode for proper toggling context

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove data URL prefix (e.g. "data:image/png;base64,")
        const base64 = reader.result as string;
        const cleanBase64 = base64.split(",")[1];
        setAttachedImage(cleanBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeviceControlClick = async (device: SmartDevice) => {
    soundService.play("KEYSTROKE");
    if (device.type === DeviceType.SMART_TV) {
      setActiveTV(device);
      setShowTVRemote(true);
    } else if (device.type === DeviceType.MOBILE) {
      // FETCH REAL LOCATION for UI action immediately
      const loc = await getRealLocation();
      const locStr = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;

      // Create updated object
      const updatedDevice = { ...device, location: locStr };

      // CRITICAL: Update global devices list so tools can see it
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? updatedDevice : d))
      );

      // Set active for modal
      setActiveMobileDevice(updatedDevice);
      setShowMobileManager(true);
    }
  };

  const handleWirelessConnect = (id: string, protocol: string) => {
    // Trigger the tool logic from the UI directly
    executeTool("initiateWirelessConnection", {
      targetIdentifier: id,
      protocol: protocol,
    });
    setShowWirelessManager(false);
  };

  // --- HELPER: Dynamic Theme Colors ---
  const getThemeColors = () => {
    if (isLockdown) {
      return {
        primary: "text-rq-red",
        border: "border-rq-red",
        bg: "bg-red-950/40",
        glow: "shadow-[0_0_30px_#ef4444]",
        coreColor: "text-red-500",
        hex: "#ef4444",
      };
    }

    // STANDARD SYSTEM STATUS (RUTHLESS / DEFAULT) - Override for status changes
    if (persona === "RUTHLESS") {
      switch (systemStatus) {
        case SystemStatus.CRITICAL:
          return {
            primary: "text-rq-red",
            border: "border-rq-red",
            bg: "bg-rq-red-dim",
            glow: "shadow-[0_0_20px_#ef4444]",
            coreColor: "text-red-500",
            hex: "#ef4444",
          };
        case SystemStatus.CAUTION:
          return {
            primary: "text-rq-amber",
            border: "border-rq-amber",
            bg: "bg-rq-amber-dim",
            glow: "shadow-[0_0_20px_#f59e0b]",
            coreColor: "text-amber-500",
            hex: "#f59e0b",
          };
        default:
          return {
            primary: "text-rq-blue",
            border: "border-rq-blue",
            bg: "bg-rq-blue-dim",
            glow: "shadow-[0_0_20px_#3b82f6]",
            coreColor: "text-blue-500",
            hex: "#3b82f6",
          };
      }
    }

    // Use PERSONA_UI_CONFIG for theme colors
    const personaConfig =
      PERSONA_UI_CONFIG[persona] || PERSONA_UI_CONFIG.RUTHLESS;

    return {
      primary: personaConfig.primaryColor,
      border: personaConfig.borderColor,
      bg: personaConfig.bgColor,
      glow: personaConfig.glowColor,
      coreColor: personaConfig.coreColor,
      hex: personaConfig.hex || "#3b82f6",
    };
  };

  const theme = getThemeColors();

  // --- THEME SYNC (NEURAL LINK) ---
  useEffect(() => {
    if (neuralLinkSocketRef.current?.connected) {
      console.log("[THEME] Syncing theme to mobile nodes:", theme.hex);
      neuralLinkSocketRef.current.emit("client:message", {
        type: "theme_update",
        target: "all",
        theme: {
          hex: theme.hex,
          primary: theme.primary,
          bg: theme.bg,
        },
        timestamp: Date.now(),
      });
    }
  }, [theme.hex, theme.primary, theme.bg]);

  // --- VISUAL CORE SYNC (TV/MIRROR) ---
  useEffect(() => {
    if (neuralLinkSocketRef.current?.connected) {
      let currentMode = "IDLE";
      if (visualData?.topic === "DATA_ROOM") currentMode = "DATA_ROOM";
      else if (visualData?.topic === "CINEMA") currentMode = "CINEMA";
      else if (visualData) currentMode = "DATA";
      else if (ghostBrowserUrl && ghostBrowserUrl !== "about:blank")
        currentMode = "BROWSER";

      console.log("[SYNC] Broadcasting Visual Core state:", currentMode);
      neuralLinkSocketRef.current.emit("client:message", {
        type: "visual_core_sync",
        target: "all",
        data: {
          mode: currentMode,
          visualData: visualData,
          browserUrl: ghostBrowserUrl,
        },
        timestamp: Date.now(),
      });
    }
  }, [visualData, ghostBrowserUrl]);

  // --- THEME TOGGLE SHORTCUT (Shift+T) ---
  useEffect(() => {
    const handleThemeToggle = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "T" || e.key === "t")) {
        const personas: PersonaType[] = [
          "RUTHLESS",
          "ENGINEER",
          "ASSISTANT",
          "HACKER",
        ];
        const current = persona === "DEFAULT" ? "ASSISTANT" : persona;
        const currentIndex = personas.indexOf(current);
        const nextIndex = (currentIndex + 1) % personas.length;
        const nextPersona = personas[nextIndex];

        console.log("[THEME] Cycling persona to:", nextPersona);
        setIsRebooting(true);
        setTimeout(() => {
          setPersona(nextPersona);
          setIsRebooting(false);
        }, 800);
      }
    };

    window.addEventListener("keydown", handleThemeToggle);
    return () => window.removeEventListener("keydown", handleThemeToggle);
  }, [persona]);

  // --- HELPER: Dynamic Glass Style ---
  const getGlassStyle = (
    isActive: boolean = false,
    isDanger: boolean = false
  ) => {
    const baseColor = isDanger ? "#ef4444" : theme.hex;

    return {
      background: `${baseColor}${isActive ? "26" : "0d"}`,
      border: `1px solid ${baseColor}66`,
      boxShadow: isActive
        ? `0 0 20px ${baseColor}26, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
        : `inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 0 rgba(100, 116, 139, 0.1)`,
      // Helper for hover states to get the raw color string
      borderColor: `${baseColor}66`,
      glow: `0 0 20px ${baseColor}26`,
    };
  };

  // --- RENDER: VISUAL CORE MODE (Smart Screen - Widget) ---
  if (appMode === "widget") {
    // Mini Chat Widget Mode
    return <ChatWidgetMode />;
  }

  if (appMode === "visual_core") {
    return (
      <div className="w-full h-full bg-transparent flex flex-col overflow-hidden relative">
        <VisualCore
          isVisible={true}
          themeColor={theme.hex}
          visualData={visualData}
          browserUrl={ghostBrowserUrl}
          sessionId={conversationService.getSessionId()}
          videoStream={visionStream}
          onClose={() => {
            if (window.electron && window.electron.ipcRenderer) {
              window.electron.ipcRenderer.send("close-visual-core");
            }
          }}
          theme={theme}
          onClearData={() => setVisualData(null)}
        />
        {/* Render VisionHUD invisible to capture stream */}
        <div style={{ display: "none" }}>
          <VisionHUD
            themeColor={theme.hex}
            onStreamReady={setVisionStream}
            isActive={false}
          />
        </div>
      </div>
    );
  }

  // --- RENDER: BROWSER MODE (Standalone Window) ---
  if (appMode === "browser") {
    return (
      <div className="w-full h-screen bg-black/90 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <GhostBrowser
          url={ghostBrowserUrl}
          onClose={() => {
            if (window.electron)
              window.electron.ipcRenderer.send("close-browser");
          }}
          sessionId={webNavigatorSessionId || `session_${Date.now()}`}
          mode="STANDALONE"
        />
      </div>
    );
  }

  // --- BOOT SEQUENCE RENDER ---
  // Only render BIOS for main dashboard mode
  if (bootSequence !== "READY" && bootSequence !== "ONBOARDING") {
    console.log("[RENDER] Boot sequence render, current:", bootSequence);
    return (
      <div
        className="h-screen w-full bg-black flex flex-col items-center justify-center font-mono crt cursor-none select-none draggable"
        style={{ color: theme.hex }}
      >
        <div className="max-w-md w-full space-y-4 p-8">
          <div
            className="flex justify-between items-center border-b pb-2 mb-4"
            style={{ borderColor: `${theme.hex}50` }}
          >
            <span className="text-xs tracking-widest">LUCA BIOS v2.4</span>
            <Activity size={14} className="animate-pulse" />
          </div>

          {bootSequence === "INIT" && (
            <div className="space-y-1 text-xs">
              <div className="opacity-50">&gt; INITIALIZING HARDWARE...</div>
              <div>&gt; CHECKING MEMORY BANKS... OK</div>
              <div>&gt; MOUNTING LOCAL_CORE... PENDING</div>
            </div>
          )}

          {bootSequence === "BIOS" && (
            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span>&gt; SYSTEM INITIALIZATION:</span>
                <span
                  className={
                    biosStatus.server === "OK"
                      ? "text-green-500"
                      : biosStatus.server === "FAIL"
                      ? "text-red-500 animate-pulse"
                      : "text-amber-500/50"
                  }
                  style={
                    biosStatus.server !== "OK" && biosStatus.server !== "FAIL"
                      ? { color: theme.hex }
                      : {}
                  }
                >
                  {biosStatus.server === "OK"
                    ? "COMPLETE"
                    : biosStatus.server === "FAIL"
                    ? "FAILED"
                    : "PENDING..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>&gt; CORTEX CORE (RAG):</span>
                <span
                  className={
                    biosStatus.core === "OK"
                      ? "text-green-500"
                      : biosStatus.core === "FAIL"
                      ? "text-red-500 animate-pulse"
                      : "text-amber-500/50"
                  }
                  style={
                    biosStatus.core !== "OK" && biosStatus.core !== "FAIL"
                      ? { color: theme.hex }
                      : {}
                  }
                >
                  {biosStatus.core === "OK"
                    ? "ONLINE"
                    : biosStatus.core === "FAIL"
                    ? "OFFLINE" // Retain FAIL logic for actual failures
                    : "INITIALIZING..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>&gt; VISUAL CORTEX:</span>
                <span
                  className={
                    biosStatus.vision === "OK"
                      ? "text-green-500"
                      : biosStatus.vision === "FAIL"
                      ? "text-red-500 animate-pulse"
                      : "text-amber-500/50"
                  }
                  style={
                    biosStatus.vision !== "OK" && biosStatus.vision !== "FAIL"
                      ? { color: theme.hex }
                      : {}
                  }
                >
                  {biosStatus.vision === "OK"
                    ? "ONLINE"
                    : biosStatus.vision === "FAIL"
                    ? "ERROR"
                    : "CALIBRATING..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>&gt; AUDIO RECEPTORS:</span>
                <span
                  className={
                    biosStatus.audio === "OK"
                      ? "text-green-500"
                      : biosStatus.audio === "FAIL"
                      ? "text-red-500 animate-pulse"
                      : "text-amber-500/50"
                  }
                  style={
                    biosStatus.audio !== "OK" && biosStatus.audio !== "FAIL"
                      ? { color: theme.hex }
                      : {}
                  }
                >
                  {biosStatus.audio === "OK"
                    ? "ONLINE"
                    : biosStatus.audio === "FAIL"
                    ? "ERROR"
                    : "CALIBRATING..."}
                </span>
              </div>
              <div className="text-rq-red animate-pulse mt-2">
                &gt; SECURITY PROTOCOLS: ENGAGED
              </div>
            </div>
          )}

          {bootSequence === "KERNEL" && (
            <div className="flex flex-col items-center justify-center h-32">
              <div
                className="w-16 h-16 border-4 rounded-full border-t-transparent animate-spin mb-4"
                style={{
                  borderColor: theme.hex,
                  borderTopColor: "transparent",
                }}
              ></div>
              <div className="text-sm font-bold tracking-[0.5em] animate-pulse">
                LOADING LUCA OS
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Removed Browser block from here (Moved Up)

  return (
    <MobilePhoenix>
      <div className="glass-noise" />
      <div
        className={`flex flex-col h-screen w-full bg-black/40 ${theme.bg} font-mono overflow-hidden relative crt transition-colors duration-700`}
        style={{ borderColor: theme.hex }}
      >
        {/* --- SOLID BACKGROUND --- */}

        {/* --- PHASE 4: THE SENSES (VISION) --- */}
        <ScreenShare
          ref={screenShareRef}
          isActive={isScreenSharing}
          onToggle={setIsScreenSharing}
          onFrameCapture={handleScreenFrame}
          theme={theme}
          isMobile={isMobile}
          showUI={!isMobile || activeMobileTab === "DATA"}
        />

        {/* --- AUTONOMY DASHBOARD --- */}

        {/* --- BACKGROUND WALLPAPER LAYER (User Generated) --- */}
        {backgroundImage && (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 opacity-40 animate-in fade-in"
            style={{
              backgroundImage: `url(data:image/jpeg;base64,${backgroundImage})`,
            }}
          />
        )}

        {/* --- GHOST CURSOR LAYER (COMPUTER USE) --- */}
        <GhostCursor
          x={ghostCursor.x}
          y={ghostCursor.y}
          type={ghostCursor.type}
          isActive={ghostCursor.active}
        />

        {/* --- SYSTEM REBOOT OVERLAY (PERSONA SWITCH) --- */}
        {isRebooting && (
          <div className="absolute inset-0 z-[2000] bg-black/95 flex flex-col items-center justify-center font-mono animate-in fade-in duration-200 pointer-events-auto">
            <div
              className="text-4xl font-bold animate-pulse mb-4 tracking-[0.3em] text-center"
              style={{
                color: theme.hex,
                textShadow: `0 0 20px ${theme.hex}80`,
              }}
            >
              SYSTEM REBOOT
            </div>
            <div
              className="w-64 h-2 bg-gray-900/50 rounded overflow-hidden border"
              style={{ borderColor: `${theme.hex}33` }}
            >
              <div
                className="h-full animate-[loading_1.5s_ease-in-out_infinite]"
                style={{ backgroundColor: theme.hex }}
              ></div>
            </div>
            <div
              className="mt-4 text-xs font-mono opacity-60 animate-pulse text-center"
              style={{ color: theme.hex }}
            >
              LOADING NEURAL CORE: {persona}...
            </div>
          </div>
        )}

        {/* --- LIVE CONTENT OVERLAY (TEXT MODE) --- */}
        {/* Show live content card when active and NOT in voice mode (Voice HUD handles its own) */}
        {!isVoiceMode && liveContent && (
          <LiveContentDisplay
            content={liveContent}
            onClose={() => setLiveContent(null)}
          />
        )}

        {/* --- SECURITY GATE OVERLAY --- */}
        {approvalRequest && (
          <SecurityGate
            toolName={approvalRequest.tool}
            args={approvalRequest.args}
            onApprove={() => approvalRequest.resolve(true)}
            onDeny={() => approvalRequest.resolve(false)}
          />
        )}

        {/* --- ADMIN GRANT MODAL --- */}
        {showAdminGrantModal && (
          <AdminGrantModal
            justification={adminJustification}
            onGrant={() => {
              setIsAdminMode(true);
              setShowAdminGrantModal(false);
              // Log the escalation
              setToolLogs((prev) => [
                ...prev,
                {
                  toolName: "SYSTEM_KERNEL",
                  args: {},
                  result: "ADMINISTRATIVE PRIVILEGES GRANTED (ROOT).",
                  timestamp: Date.now(),
                },
              ]);
              // NEW: Inject into chat context so AI knows immediately
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  text: "SYSTEM_ALERT: ROOT ACCESS GRANTED. AUTHORIZATION LEVEL: ADMINISTRATOR. FULL SYSTEM CONTROL ENABLED.",
                  sender: Sender.SYSTEM,
                  timestamp: Date.now(),
                },
              ]);
              soundService.play("SUCCESS");
            }}
            onDeny={() => {
              setShowAdminGrantModal(false);
              // Log refusal
              setToolLogs((prev) => [
                ...prev,
                {
                  toolName: "SYSTEM_KERNEL",
                  args: {},
                  result: "ADMINISTRATIVE PRIVILEGES DENIED.",
                  timestamp: Date.now(),
                },
              ]);
            }}
          />
        )}

        {/* WHATSAPP MANAGER */}
        {showWhatsAppManager && (
          <WhatsAppManager
            onClose={() => setShowWhatsAppManager(false)}
            theme={theme}
          />
        )}

        {showTelegramManager && (
          <TelegramManager
            onClose={() => setShowTelegramManager(false)}
            theme={theme}
          />
        )}

        {showNeuralLinkModal && (
          <NeuralLinkModal
            onClose={() => setShowNeuralLinkModal(false)}
            localIp={localIp || window.location.hostname}
            theme={theme}
          />
        )}

        {/* PROFILE MANAGER */}
        {showProfileManager && (
          <ProfileManager
            onClose={() => setShowProfileManager(false)}
            onSave={handleSaveProfile}
            currentProfile={userProfile || undefined}
          />
        )}

        {/* HOLOGRAPHIC IDE OVERLAY */}
        {showCodeEditor && (
          <CodeEditor
            onClose={() => setShowCodeEditor(false)}
            initialCwd={currentCwd || "."}
            theme={theme}
          />
        )}

        {/* KNOWLEDGE INGESTION MODAL */}
        {showIngestionModal && (
          <IngestionModal
            onClose={() => setShowIngestionModal(false)}
            onIngest={handleIngest}
            theme={theme}
          />
        )}

        {/* INGESTION MATRIX OVERLAY */}
        {ingestionState.active && (
          <div className="absolute inset-0 z-[950] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[400px] border border-green-500/50 bg-black p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)] rounded-lg">
              {/* Rain Effect */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent,rgba(34,197,94,0.5)_50%,transparent)] animate-scan"></div>

              <div className="flex items-center gap-4 text-green-500 font-bold tracking-widest text-xl mb-6 border-b border-green-500/30 pb-4">
                <Dna className="animate-spin-slow w-8 h-8" />
                <div>
                  <div>NEURAL EVOLUTION PROTOCOL</div>
                  <div className="text-[10px] text-green-400/60 font-mono">
                    INTEGRATING AGENTIC CAPABILITIES...
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden text-xs font-mono text-green-400/80 space-y-2 pl-4 border-l-2 border-green-500/20">
                {/* Acquired Skills Showoff */}
                {ingestionState.skills.length > 0
                  ? ingestionState.skills.map((skill, i) => (
                      <div
                        key={`skill-${i}`}
                        className="animate-in zoom-in duration-500 flex items-center gap-2 text-white font-bold tracking-wider"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        ACQUIRED SKILL: {skill}
                      </div>
                    ))
                  : // Default Scanning Animation
                    (ingestionState.files.length > 0
                      ? ingestionState.files.slice(-8)
                      : [
                          "Initializing Deep Scan...",
                          "Parsing Jupyter Notebooks...",
                          "Extracting Algorithmic Logic...",
                          "Identifying Agent Architectures...",
                          "Synthesizing Neural Pathways...",
                        ]
                    ).map((file, i) => (
                      <div
                        key={i}
                        className="truncate animate-in slide-in-from-left-4 fade-in duration-500 flex items-center gap-2"
                      >
                        <span className="text-green-700">&gt;</span>
                        {file}
                      </div>
                    ))}
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-[10px] text-green-500 mb-1">
                  <span>INTEGRATION_PROGRESS</span>
                  <span>
                    {ingestionState.skills.length > 0
                      ? "100%"
                      : "PROCESSING..."}
                  </span>
                </div>
                <div className="h-1 w-full bg-green-900/30">
                  <div
                    className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ${theme.bg.replace(
                      "dim",
                      "500"
                    )}`}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOCKDOWN OVERLAY (Red Queen Style) */}
        {isLockdown && (
          <div className="absolute inset-0 z-[900] bg-red-950/90 flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
            <div className="border-4 border-red-500 p-12 rounded-lg bg-black flex flex-col items-center shadow-[0_0_100px_#ef4444] animate-pulse">
              <ShieldAlert size={128} className="text-red-500 mb-6" />
              <h1 className="text-6xl font-display font-bold text-red-500 tracking-[0.2em] mb-4">
                LOCKDOWN
              </h1>
              <div className="text-2xl font-mono text-red-400 tracking-widest mb-8">
                DEFENSE PROTOCOL ALPHA ACTIVE
              </div>
              <div className="flex gap-4">
                <div className="w-4 h-64 bg-red-500/20 overflow-hidden">
                  <div className="w-full h-full bg-red-500 animate-scan"></div>
                </div>
                <div className="w-64 h-4 bg-red-500/20 overflow-hidden">
                  <div className="w-full h-full bg-red-500 animate-[scan_2s_linear_infinite]"></div>
                </div>
                <div className="w-4 h-64 bg-red-500/20 overflow-hidden">
                  <div className="w-full h-full bg-red-500 animate-scan"></div>
                </div>
              </div>
              <div className="mt-8 text-xs text-red-500/50 font-mono pointer-events-auto">
                <button
                  onClick={() => {
                    setIsLockdown(false);
                    setSystemStatus(SystemStatus.NORMAL);
                    soundService.play("SUCCESS");
                  }}
                  className="border border-red-500 px-4 py-2 hover:bg-red-500 hover:text-black transition-colors"
                >
                  OVERRIDE AUTH CODE: OMEGA-9
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Autonomy Dashboard */}
        {showAutonomyDashboard && (
          <AutonomyDashboard onClose={() => setShowAutonomyDashboard(false)} />
        )}

        {/* Voice HUD Overlay */}
        {/* Voice HUD Overlay */}
        {/* BACKGROUND LISTENER */}
        <WakeWordListener
          isListening={isWakeWordActive}
          onWake={() => {
            console.log("[APP] WAKE WORD TRIGGERED!");
            // Turn on Voice Mode if not already on
            if (!isVoiceMode) {
              // We refer to toggleVoiceMode indirectly or logic here
              setIsVoiceMode(true);
              setShowVoiceHud(true);
              // Also optionally play a sound? WakeWordListener might do it?
            }
          }}
        />

        {/* VOICE HUD OVERLAY */}
        <VoiceHud
          isActive={isVoiceMode}
          isVisible={showVoiceHud}
          onClose={toggleVoiceMode}
          amplitude={voiceAmplitude}
          transcript={voiceTranscript}
          transcriptSource={voiceTranscriptSource}
          isVadActive={isVadActive}
          searchResults={voiceSearchResults}
          visualData={visualData}
          onClearVisualData={() => setVisualData(null)}
          isSpeaking={voiceTranscriptSource === "model"}
          paused={showCamera}
          persona={persona}
          theme={theme}
          statusMessage={voiceStatus}
          onTranscriptChange={(text) => {
            setVoiceTranscript(text);
            setVoiceTranscriptSource("user");
          }}
          onTranscriptComplete={(text) => {
            if (!text || text.trim().length === 0) return; // Ignore empty
            setVoiceTranscript(text);
            setVoiceTranscriptSource("user");

            // --- VOICE SECURITY GATE HANDLER ---
            if (approvalRequest) {
              const lower = text.toLowerCase().trim();
              const affirmative = [
                "yes",
                "confirm",
                "approve",
                "proceed",
                "execute",
                "do it",
                "affirmative",
              ];
              const negative = [
                "no",
                "abort",
                "cancel",
                "deny",
                "stop",
                "negative",
              ];

              if (affirmative.some((w) => lower.includes(w))) {
                approvalRequest.resolve(true);
                setApprovalRequest(null);
                soundService.play("SUCCESS");
                return;
              }
              if (negative.some((w) => lower.includes(w))) {
                approvalRequest.resolve(false);
                setApprovalRequest(null);
                soundService.play("ALERT");
                return;
              }
              // If ambiguous, do nothing (wait for clear confirmation)
              return;
            }

            // Check if command requires confirmation
            const analysis = voiceCommandService.analyzeCommand(text);

            if (analysis.requiresConfirmation) {
              // Show confirmation dialog
              setPendingCommand({
                original: text,
                interpreted: analysis.interpreted,
                confidence: analysis.confidence,
                isRisky: analysis.isRisky,
              });
            } else {
              // Queue command for execution (prevents blocking)
              taskQueue.add(text, 0).catch((err) => {
                console.error("[VOICE] Failed to queue command:", err);
              });
            }
          }}
        />

        {/* Voice Command Confirmation Modal */}
        {pendingCommand && (
          <VoiceCommandConfirmation
            originalTranscript={pendingCommand.original}
            interpretedCommand={pendingCommand.interpreted}
            confidence={pendingCommand.confidence}
            isRisky={pendingCommand.isRisky}
            onConfirm={() => {
              taskQueue
                .add(pendingCommand.original, pendingCommand.isRisky ? 1 : 0)
                .catch((err) => {
                  console.error(
                    "[VOICE] Failed to queue confirmed command:",
                    err
                  );
                });
              setPendingCommand(null);
            }}
            onCancel={() => {
              setPendingCommand(null);
              soundService.play("ALERT");
            }}
            theme={theme}
          />
        )}

        {/* Modals */}
        {showCamera && (
          <VisionCameraModal
            onClose={() => setShowCamera(false)}
            onCapture={(base64) => setAttachedImage(base64)}
            onLiveAnalyze={(base64) => lucaService.analyzeImageFast(base64)} // ASTRA MODE LINK
          />
        )}

        {showRemoteModal && (
          <RemoteAccessModal
            accessCode={remoteCode}
            onClose={() => setShowRemoteModal(false)}
            onSuccess={handleRemoteSuccess}
          />
        )}

        {showDesktopStream && (
          <DesktopStreamModal
            targetName={desktopTarget}
            onClose={() => setShowDesktopStream(false)}
            connected={isLocalCoreConnected}
            theme={theme}
          />
        )}

        {showGeoTactical && (
          <GeoTacticalView
            targetName={trackingTarget}
            markers={tacticalMarkers}
            onClose={() => setShowGeoTactical(false)}
          />
        )}

        {showCryptoTerminal && (
          <CryptoTerminal
            onClose={() => setShowCryptoTerminal(false)}
            theme={theme}
          />
        )}

        {showForexTerminal && (
          <ForexTerminal
            onClose={() => setShowForexTerminal(false)}
            theme={theme}
          />
        )}

        {showPredictionTerminal && (
          <PredictionTerminal
            positions={polyPositions}
            onBet={handlePlaceBet}
            onClose={() => setShowPredictionTerminal(false)}
            theme={theme}
          />
        )}
        {showOsintDossier && (
          <OsintDossier
            profile={osintProfile}
            onClose={() => setShowOsintDossier(false)}
            theme={theme}
          />
        )}

        {showTVRemote && (
          <SmartTVRemote
            device={activeTV}
            onClose={() => setShowTVRemote(false)}
            onCommand={(cmd, params) =>
              executeTool("controlSmartTV", {
                deviceId: activeTV?.id,
                action: cmd,
                ...params,
              })
            }
            theme={theme}
          />
        )}

        {showWirelessManager && (
          <WirelessManager
            onClose={() => setShowWirelessManager(false)}
            onConnect={handleWirelessConnect}
            activeTab={wirelessTab}
            theme={theme}
          />
        )}

        {showAppExplorer && (
          <AppExplorerModal
            isOpen={showAppExplorer}
            onClose={() => setShowAppExplorer(false)}
            theme={theme}
          />
        )}

        {showMobileFileBrowser && (
          <MobileFileBrowser
            onClose={() => setShowMobileFileBrowser(false)}
            serverUrl={apiUrl("")}
          />
        )}

        {showMobileManager && (
          <MobileManager
            device={activeMobileDevice}
            onClose={() => setShowMobileManager(false)}
          />
        )}

        {showNetworkMap && (
          <NetworkMap onClose={() => setShowNetworkMap(false)} />
        )}

        {/* ETHICAL HACKING TERMINAL */}
        {showHackingTerminal && (
          <HackingTerminal
            onClose={() => setShowHackingTerminal(false)}
            toolLogs={hackingLogs}
            theme={theme}
          />
        )}

        {/* SKILLS MATRIX */}
        {showSkillsMatrix && (
          <SkillsMatrix
            onClose={() => setShowSkillsMatrix(false)}
            theme={theme}
            onExecute={async (skillName, args) => {
              return await executeTool("executeCustomSkill", {
                skillName,
                args,
              });
            }}
          />
        )}

        {/* NEURAL RECORDER (IMPRINTING) */}
        {showNeuralRecorder && (
          <NeuralRecorder
            onClose={() => setShowNeuralRecorder(false)}
            theme={theme}
            onSave={async (blob, type, metadata, events) => {
              console.log(
                `[IMPRINT] Preparing to save imprint: ${metadata.name}`
              );

              try {
                const formData = new FormData();
                formData.append("video", blob, "imprint.webm");
                formData.append("name", metadata.name);
                formData.append("description", metadata.description);
                formData.append("mode", type);
                formData.append("events", JSON.stringify(events));

                const res = await fetch(apiUrl("/api/skills/imprint"), {
                  method: "POST",
                  body: formData,
                });

                if (!res.ok)
                  throw new Error("Failed to save imprint to server");

                const data = await res.json();
                console.log("[IMPRINT] Successfully saved:", data.path);

                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    text: `NEURAL IMPRINT [${metadata.name}] RECEIVED AND REGISTERED AS AGENT SKILL.`,
                    sender: Sender.SYSTEM,
                    timestamp: Date.now(),
                  },
                ]);
                soundService.play("SUCCESS");
                setShowNeuralRecorder(false);
              } catch (error: any) {
                console.error("[IMPRINT] Save failed:", error);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    text: `ERROR: NEURAL IMPRINT SAVING FAILED. ${error.message}`,
                    sender: Sender.SYSTEM,
                    timestamp: Date.now(),
                  },
                ]);
                soundService.play("ALERT");
              }
            }}
          />
        )}

        {/* STOCK TERMINAL */}
        {showStockTerminal && (
          <StockTerminal
            onClose={() => setShowStockTerminal(false)}
            initialSymbol={stockTerminalSymbol}
            theme={theme}
          />
        )}

        {showTradingTerminal && (
          <AdvancedTradingTerminal
            onClose={() => setShowTradingTerminal(false)}
            onOpenCompetition={() => {
              setShowTradingTerminal(false);
              setShowCompetitionPage(true);
            }}
            onOpenTraders={() => {
              setShowTradingTerminal(false);
              setShowAITradersPage(true);
            }}
            theme={theme}
          />
        )}

        {/* COMPETITION LEADERBOARD */}
        {showCompetitionPage && (
          <CompetitionPage
            onClose={() => setShowCompetitionPage(false)}
            theme={theme}
          />
        )}

        {/* AI TRADERS MANAGEMENT */}
        {showAITradersPage && (
          <AITradersPage
            onClose={() => setShowAITradersPage(false)}
            theme={theme}
          />
        )}

        {/* SUBSYSTEM DASHBOARD */}
        {showSubsystemDashboard && (
          <SubsystemDashboard
            onClose={() => setShowSubsystemDashboard(false)}
            onOpenWebview={(url, title) => setActiveWebview({ url, title })}
            theme={theme}
          />
        )}

        {/* GHOST BROWSER */}
        {activeWebview && (
          <GhostBrowser
            url={activeWebview.url}
            title={activeWebview.title}
            onClose={() => {
              setActiveWebview(null);
              setWebNavigatorSessionId(null);
            }}
            sessionId={activeWebview.sessionId}
          />
        )}

        {/* HUMAN INPUT MODAL (for credential prompts) */}
        {humanInputModal && (
          <HumanInputModal
            isOpen={humanInputModal.isOpen}
            prompt={humanInputModal.prompt}
            sessionId={humanInputModal.sessionId}
            onClose={() => setHumanInputModal(null)}
            onSubmit={handleHumanInputSubmit}
            isPassword={humanInputModal.prompt
              .toLowerCase()
              .includes("password")}
            isSavePrompt={
              humanInputModal.prompt.toLowerCase().includes("save") ||
              humanInputModal.prompt.toLowerCase().includes("store")
            }
          />
        )}

        {/* INVESTIGATION REPORTS */}
        {showInvestigationReports && (
          <InvestigationReports
            onClose={() => setShowInvestigationReports(false)}
            theme={theme}
          />
        )}

        {/* Header - J.A.R.V.I.S Style - DRAGGABLE REGION ADDED */}
        <header
          className={`${
            isMobile ? "h-24 pl-3 pr-2 pt-2" : "h-20 pl-6 pr-6"
          } glass-panel tech-border ${theme.primary} flex items-center ${
            isMobile ? "justify-between gap-2" : "justify-between"
          } z-50 shadow-lg transition-all duration-500 relative app-region-drag`}
          style={{ borderBottom: `1px solid ${theme.hex}33` }}
        >
          <div
            className={`flex items-center ${
              isMobile ? "gap-1" : "gap-3"
            } app-region-no-drag`}
          >
            {/* Holographic Face Icon - 3D with Theme Colors */}
            <div
              className={`relative ${
                isMobile ? "w-12 h-12" : "w-16 h-16"
              } group cursor-pointer`}
              onClick={() => soundService.play("HOVER")}
            >
              <HolographicFaceIcon themeColor={theme.hex ?? "#3b82f6"} />
            </div>

            <div className={isMobile ? "flex-1 min-w-0" : ""}>
              <h1
                className={`font-display ${
                  isMobile ? "text-xl" : "text-3xl"
                } font-black ${
                  isMobile ? "tracking-[0.1em]" : "tracking-[0.2em]"
                } uppercase italic transition-colors duration-500 ${
                  theme.primary
                } flex items-center gap-2 ${isMobile ? "flex-wrap" : "gap-4"}`}
              >
                LUCA OS
                {!isMobile && (
                  <>
                    {persona === "ENGINEER" && (
                      <Code2 size={24} className="animate-pulse" />
                    )}
                    {persona === "ASSISTANT" && (
                      <Sparkles size={24} className="animate-pulse" />
                    )}
                    {persona === "HACKER" && (
                      <ShieldAlert
                        size={24}
                        className="animate-pulse text-green-500"
                      />
                    )}
                  </>
                )}
              </h1>

              <div
                className={`flex items-center ${
                  isMobile ? "gap-0.5 flex-nowrap" : "gap-4"
                }`}
              >
                {/* CLICKABLE PERSONA SWITCHER */}
                <button
                  onClick={handleCyclePersona}
                  disabled={isRebooting}
                  onKeyDown={handleKeyDown}
                  className={`${
                    isMobile ? "text-[8px]" : "text-[9px]"
                  } font-bold ${
                    isMobile ? "tracking-[0.2em]" : "tracking-[0.3em]"
                  } flex items-center gap-1 ${
                    theme.primary
                  } hover:text-white transition-colors ${
                    isRebooting
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  } select-none group`}
                  title={
                    isRebooting
                      ? "Rebooting... Please wait"
                      : "Click to Switch Persona"
                  }
                >
                  <span
                    className={`${
                      isMobile
                        ? "group-hover:underline"
                        : "group-hover:underline"
                    }`}
                  >
                    <span className="hidden sm:inline">STATUS: </span>
                    {persona === "RUTHLESS"
                      ? isLockdown
                        ? "LOCKDOWN"
                        : "ONLINE"
                      : persona}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
                </button>

                {/* SETTINGS BUTTON */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={`flex items-center gap-2 ${
                    isMobile
                      ? "p-1 text-slate-400 hover:text-white"
                      : "px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white backdrop-blur-md"
                  } transition-all group`}
                  title="Open Settings"
                >
                  <Settings
                    size={isMobile ? 20 : 14}
                    className="group-hover:rotate-90 transition-transform"
                  />
                  {!isMobile && (
                    <span className="text-[10px] font-bold tracking-widest hidden group-hover:block">
                      CONFIG
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center ${isMobile ? "gap-1" : "gap-8"} ${
              isMobile ? "text-[9px]" : "text-[10px]"
            } font-bold ${
              isMobile ? "tracking-tight" : "tracking-widest"
            } opacity-80 app-region-no-drag ${isMobile ? "flex-nowrap" : ""}`}
          >
            {/* ADMIN INDICATOR */}
            {isAdminMode && (
              <div
                className={`flex items-center ${
                  isMobile ? "gap-0.5 px-1 py-0.5" : "gap-2 px-2 py-1"
                } text-red-500 animate-pulse font-bold border border-red-500 rounded bg-red-950/30 ${
                  isMobile ? "shadow-none" : "shadow-[0_0_10px_red]"
                }`}
              >
                <ShieldAlert size={isMobile ? 10 : 12} />{" "}
                {isMobile ? "ROOT" : "ROOT ACCESS"}
              </div>
            )}

            {/* HOST PLATFORM DISPLAY - Compact on mobile */}
            <div
              className={`flex items-center ${
                isMobile ? "gap-0.5" : "gap-2"
              } text-slate-400 uppercase ${isMobile ? "" : "hidden md:flex"}`}
            >
              <Monitor size={isMobile ? 12 : 14} />{" "}
              <span className="hidden sm:inline">HOST: </span>
              {
                hostPlatform
                  .replace(/\(.*\)/, "")
                  .trim()
                  .split(" ")[0]
              }
            </div>

            {isListeningAmbient && (
              <div
                className={`flex items-center ${
                  isMobile ? "gap-0.5" : "gap-2"
                } text-rq-red animate-pulse`}
              >
                <AudioWaveform size={isMobile ? 12 : 14} />{" "}
                <span className="hidden sm:inline">SENSORS_</span>
                <span className="sm:hidden">MIC</span>
                <span className="hidden sm:inline">ACTIVE</span>
              </div>
            )}

            {/* LOCAL CORE STATUS - Compact on mobile */}
            <div
              className={`flex items-center ${
                isMobile ? "gap-0.5" : "gap-2"
              } transition-colors ${
                isLocalCoreConnected ? "text-green-500" : "text-slate-600"
              }`}
            >
              {isLocalCoreConnected ? (
                <ServerIcon size={isMobile ? 12 : 14} />
              ) : (
                <Unplug size={isMobile ? 12 : 14} />
              )}
              <span className="hidden sm:inline">CORE: </span>
              {isLocalCoreConnected ? "LINKED" : "OFFLINE"}
            </div>

            {/* NEURAL_LOAD - Compact on mobile */}
            <div
              className={`flex items-center ${isMobile ? "gap-0.5" : "gap-2"} ${
                theme.primary
              }`}
            >
              <Cpu size={isMobile ? 10 : 14} />{" "}
              <span className="hidden sm:inline">NEURAL_LOAD: </span>
              {isProcessing ? "98%" : "12%"}
            </div>

            {/* Always-On Monitoring Controls */}
            {/* Always-On Monitoring Controls */}
            {/* Always-On Monitoring Controls */}
            <AlwaysOnControls
              onVisionToggle={(active) => setVisionMonitoringActive(active)}
              onAudioToggle={(active) => setAudioMonitoringActive(active)}
              isMobile={isMobile}
              theme={theme}
            />
          </div>
        </header>

        {/* Main Grid */}
        <main
          className={`flex-1 ${
            isMobile
              ? "relative w-full flex flex-col"
              : "grid grid-cols-1 md:grid-cols-12"
          } gap-0 overflow-hidden`}
        >
          {/* Decorative Background Elements - Hidden on mobile */}
          {!isMobile && (
            <div className="absolute inset-0 pointer-events-none z-0">
              <div
                className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-${theme.primary.replace(
                  "text-",
                  ""
                )} to-transparent opacity-20`}
              ></div>
              <div className="absolute top-1/2 left-0 w-32 h-32 border border-slate-800/30 rounded-full -translate-x-1/2"></div>
              <div className="absolute bottom-10 right-10 w-64 h-64 border border-slate-800/20 rounded-full border-dashed animate-spin-slow"></div>
            </div>
          )}

          {/* Left Panel: Operations & Devices */}
          <section
            className={`${
              isMobile
                ? activeMobileTab === "SYSTEM"
                  ? "flex w-full"
                  : "hidden"
                : "hidden md:flex md:col-span-4"
            } flex-col h-full overflow-hidden ${
              isMobile ? "bg-black" : "glass-panel tech-border " + theme.primary
            } ${isMobile ? "z-10" : "z-10"}`}
            style={!isMobile ? { borderRight: `1px solid ${theme.hex}33` } : {}}
          >
            {/* Mobile Header for System Panel */}
            {isMobile && (
              <div
                className={`flex items-center justify-between p-4 border-b ${theme.border}/50`}
              >
                <h2
                  className={`${theme.primary} font-bold tracking-widest text-sm`}
                >
                  SYSTEM CONTROL
                </h2>
              </div>
            )}

            {/* System Monitor Area */}
            <div
              className={`flex-none h-[33%] p-6 bg-black/20`}
              style={{ borderBottom: `1px solid ${theme.hex}33` }}
            >
              <SystemMonitor
                audioListenMode={isListeningAmbient}
                connected={isLocalCoreConnected}
                theme={theme}
              />
            </div>

            {/* Devices & Ops Grid */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Agent Operations */}
              <div
                className={`p-4 rounded-sm relative overflow-hidden group`}
                style={{
                  ...getGlassStyle(false),
                  background: "rgba(0, 0, 0, 0.25)",
                }}
              >
                <div className={`absolute top-0 right-0 p-1 ${theme.primary}`}>
                  <Activity size={12} />
                </div>
                <div
                  className={`flex items-center gap-2 mb-3 opacity-90 ${theme.primary}`}
                >
                  <Eye size={16} />
                  <h2 className="font-display font-bold tracking-widest text-sm">
                    TACTICAL OPS
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setWirelessTab("BLUETOOTH");
                      setShowWirelessManager(true);
                      soundService.play("KEYSTROKE");
                    }}
                    className={`p-2 sm:p-3 min-h-[60px] sm:min-h-[50px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation`}
                    style={{
                      ...getGlassStyle(false),
                      background: "rgba(0, 0, 0, 0.25)",
                    }}
                    onMouseEnter={(e) => {
                      const style = getGlassStyle(true);
                      e.currentTarget.style.borderColor = style.borderColor;
                      e.currentTarget.style.boxShadow = style.boxShadow;
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      const style = getGlassStyle(false);
                      e.currentTarget.style.borderColor = style.borderColor;
                      e.currentTarget.style.boxShadow = style.boxShadow;
                      e.currentTarget.style.color = "";
                    }}
                  >
                    <span
                      className={`text-[10px] tracking-wider group-hover/btn:${theme.primary} transition-colors text-slate-500`}
                    >
                      WIRELESS
                    </span>
                    <span className="text-xs font-bold text-white">
                      INTERCEPT
                    </span>
                    <div className="h-0.5 w-full bg-slate-800 mt-1 overflow-hidden">
                      <div
                        className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ${theme.bg.replace(
                          "dim",
                          "500"
                        )}`}
                      ></div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowNetworkMap(true);
                      soundService.play("KEYSTROKE");
                    }}
                    className={`p-2 sm:p-3 min-h-[60px] sm:min-h-[50px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation`}
                    style={{
                      ...getGlassStyle(false),
                      background: "rgba(0, 0, 0, 0.25)",
                    }}
                    onMouseEnter={(e) => {
                      const style = getGlassStyle(true);
                      e.currentTarget.style.borderColor = style.borderColor;
                      e.currentTarget.style.boxShadow = style.boxShadow;
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      const style = getGlassStyle(false);
                      e.currentTarget.style.borderColor = style.borderColor;
                      e.currentTarget.style.boxShadow = style.boxShadow;
                      e.currentTarget.style.color = "";
                    }}
                  >
                    <span
                      className={`text-[10px] tracking-wider group-hover/btn:${theme.primary} transition-colors text-slate-500`}
                    >
                      TOPOLOGY
                    </span>
                    <span className="text-xs font-bold text-white">
                      NET MAP
                    </span>
                    <div className="h-0.5 w-full bg-slate-800 mt-1 overflow-hidden">
                      <div
                        className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ${theme.bg.replace(
                          "dim",
                          "500"
                        )}`}
                      ></div>
                    </div>
                  </button>

                  {/* MANUAL LOCKDOWN TRIGGER */}
                  <button
                    onClick={() => executeTool("initiateLockdown", {})}
                    className={`col-span-2 p-2 flex items-center justify-center gap-2 transition-all group/btn`}
                    style={{
                      ...getGlassStyle(false, true), // isDanger = true
                      background: "rgba(0, 0, 0, 0.25)",
                    }}
                    onMouseEnter={(e) => {
                      const style = getGlassStyle(true, true);
                      e.currentTarget.style.borderColor = style.borderColor;
                      e.currentTarget.style.boxShadow = style.boxShadow;
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      const style = getGlassStyle(false, true);
                      e.currentTarget.style.borderColor = style.borderColor;
                      e.currentTarget.style.boxShadow = style.boxShadow;
                      e.currentTarget.style.color = "";
                    }}
                  >
                    <Lock
                      size={12}
                      className="text-red-500 group-hover/btn:animate-pulse"
                    />
                    <span className="text-xs font-bold text-red-500 tracking-widest">
                      INITIATE LOCKDOWN
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div
                  className={`flex items-center gap-2 mb-4 opacity-80 ${theme.primary}`}
                >
                  <Cpu size={16} />
                  <h2 className="font-display font-bold tracking-widest">
                    FACILITY CONTROL
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {devices.map((device) => (
                    <SmartDeviceCard
                      key={device.id}
                      device={device}
                      onControlClick={handleDeviceControlClick}
                      themeColor={theme.primary}
                      themeBorder={theme.border}
                      themeBg={theme.bg}
                    />
                  ))}
                </div>
              </div>

              {/* Neural Expansion Section */}
              {(installedModules.length > 0 ||
                cryptoWallet ||
                forexAccount ||
                osintProfile ||
                hackingLogs.length > 0 ||
                true) && (
                <div className="animate-in fade-in slide-in-from-left duration-500">
                  <div
                    className={`flex items-center gap-2 mb-4 opacity-80 ${theme.primary}`}
                  >
                    <Box size={16} />
                    <h2 className="font-display font-bold tracking-widest">
                      NEURAL EXPANSION
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* SKILLS MATRIX BUTTON */}
                    <button
                      onClick={() => {
                        setShowSkillsMatrix(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <BrainCircuit size={14} />
                      SKILLS
                    </button>
                    {/* APP EXPLORER BUTTON */}
                    <button
                      onClick={() => {
                        setShowAppExplorer(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Box size={14} />
                      APPS
                    </button>
                    {/* VISUAL CORE TRIGGER (SMART SCREEN) */}
                    <button
                      onClick={() => {
                        if (window.electron && window.electron.ipcRenderer) {
                          window.electron.ipcRenderer.send("open-visual-core");
                          // Also start the backend vision service
                          fetch(apiUrl("/api/vision/start"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ captureInterval: 1000 }), // Fast capture for live feel
                          }).catch((e) =>
                            console.error("Failed to start vision service:", e)
                          );
                          soundService.play("SUCCESS");
                        } else {
                          console.warn("Visual Core window requires Electron");
                        }
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Monitor size={14} />
                      SCREEN
                    </button>
                    {/* NEURAL IMPRINTING BUTTON */}
                    {/* NEURAL IMPRINTING BUTTON */}
                    {/* NEURAL IMPRINTING BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("TRAIN clicked");
                        try {
                          soundService.play("KEYSTROKE");
                        } catch (e) {
                          console.error(e);
                        }
                        setShowNeuralRecorder(true);
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Eye size={14} />
                      TRAIN
                    </button>
                    {/* STOCK TERMINAL BUTTON */}
                    <button
                      onClick={() => {
                        setStockTerminalSymbol(undefined);
                        setShowStockTerminal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <TrendingUp size={10} /> STOCK MARKET FEED
                    </button>
                    {/* AI TRADING TERMINAL BUTTON */}
                    <button
                      onClick={() => {
                        setShowTradingTerminal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Brain size={10} /> AI TRADING
                    </button>
                    {/* SUBSYSTEM DASHBOARD BUTTON */}
                    <button
                      onClick={() => {
                        setShowSubsystemDashboard(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Activity size={10} /> SUBSYSTEMS
                    </button>

                    {/* INVESTIGATION REPORTS BUTTON */}
                    <button
                      onClick={() => {
                        setShowInvestigationReports(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <FileText size={10} /> REPORTS
                    </button>

                    {/* NEW IMPORT BUTTON */}
                    <button
                      onClick={() => {
                        setShowIngestionModal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors animate-pulse`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Download size={10} /> IMPORT MODULE (GITHUB)
                    </button>

                    {/* NEW CODE EDITOR BUTTON */}
                    <button
                      onClick={() => {
                        setShowCodeEditor(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Code2 size={10} /> HOLOGRAPHIC_IDE
                    </button>

                    {/* NEW PREDICTION TERMINAL */}
                    <button
                      onClick={() => {
                        setShowPredictionTerminal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <BarChart3 size={10} /> PREDICTIONS (POLY)
                    </button>

                    {/* NEURAL LINK BUTTON */}
                    <button
                      onClick={() => {
                        setShowNeuralLinkModal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors animate-pulse`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Smartphone size={10} /> NEURAL_LINK_BRIDGE
                    </button>

                    {/* Always display DEFI_WALLET_V1 for testing */}
                    <button
                      onClick={() => {
                        setShowCryptoTerminal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Wallet size={10} /> DEFI_WALLET_V1
                    </button>

                    {/* Always display FX_DESK_ACCESS for testing */}
                    <button
                      onClick={() => {
                        setShowForexTerminal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Landmark size={10} /> FX_DESK_ACCESS
                    </button>

                    {/* Always display OSINT_AGGREGATOR for testing */}
                    <button
                      onClick={() => {
                        setShowOsintDossier(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <Search size={10} /> OSINT_AGGREGATOR
                    </button>

                    {/* Always display ETHICAL_HACKING for testing */}
                    <button
                      onClick={() => {
                        setShowHackingTerminal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                      }}
                    >
                      <ShieldAlert size={10} /> ETHICAL_HACKING
                    </button>

                    {/* Always display HACKING_LOGS for testing */}
                    <button
                      onClick={() => {
                        setShowHackingTerminal(true);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                      style={{
                        ...getGlassStyle(false),
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                      onMouseEnter={(e) => {
                        const style = getGlassStyle(true);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                      }}
                      onMouseLeave={(e) => {
                        const style = getGlassStyle(false);
                        e.currentTarget.style.borderColor = style.borderColor;
                        e.currentTarget.style.boxShadow = style.boxShadow;
                      }}
                    >
                      <TerminalIcon size={10} /> HACKING_LOGS
                    </button>

                    {installedModules.map((mod, i) => (
                      <div
                        key={i}
                        className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-sm text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                        style={{
                          ...getGlassStyle(false),
                          background: "rgba(0, 0, 0, 0.25)",
                        }}
                        onMouseEnter={(e) => {
                          const style = getGlassStyle(true);
                          e.currentTarget.style.borderColor = style.borderColor;
                          e.currentTarget.style.boxShadow = style.boxShadow;
                        }}
                        onMouseLeave={(e) => {
                          const style = getGlassStyle(false);
                          e.currentTarget.style.borderColor = style.borderColor;
                          e.currentTarget.style.boxShadow = style.boxShadow;
                        }}
                      >
                        <Download
                          size={10}
                          className="opacity-50 group-hover:opacity-100"
                        />
                        {mod}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Center Panel: Chat Interface */}
          <section
            className={`${
              isMobile
                ? activeMobileTab === "TERMINAL"
                  ? "flex w-full overflow-hidden"
                  : "hidden"
                : "col-span-1 md:col-span-5 overflow-hidden"
            } flex flex-col ${isMobile ? "h-full" : "h-full"} relative ${
              isMobile ? "z-10" : "z-20"
            } transition-all duration-500 glass-panel tech-border ${
              theme.primary
            } ${isMobile ? "" : "rounded-r-2xl"}`}
            style={{
              ...(() => {
                const { borderColor, border, ...s } = getGlassStyle(false);
                return {
                  ...s,
                  borderTop: `1px solid ${theme.hex}33`,
                  borderBottom: `1px solid ${theme.hex}33`,
                };
              })(),
              background: "rgba(0, 0, 0, 0.45)", // Standardized glass opacity
            }}
          >
            {/* Scanlines overlay for chat - Simplified */}
            <div
              className="absolute inset-0 pointer-events-none z-30"
              style={{
                background: `linear-gradient(rgba(0,0,0,0)_2px, rgba(0,0,0,0.1)_2px)`,
                backgroundSize: "100% 4px",
              }}
            ></div>

            {/* LUCA Background Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
              <h1
                className={`text-[9rem] lg:text-[11rem] font-black italic opacity-[0.04] select-none tracking-tighter ${theme.primary} transition-colors duration-500`}
              >
                LUCA
              </h1>
            </div>

            {/* Chat History */}
            <div
              className={`flex-1 ${
                isMobile ? "overflow-y-auto min-h-0" : "overflow-y-auto"
              } ${isMobile ? "p-2" : "p-3"} ${
                isMobile ? "space-y-4" : "space-y-6"
              } scroll-smooth z-10`}
            >
              {messages.map((msg, index) => (
                <ChatMessageBubble
                  key={msg.id || index}
                  text={msg.text}
                  sender={msg.sender === Sender.USER ? "user" : "luca"} // Assume Sender enum matches logic.
                  timestamp={msg.timestamp}
                  persona={persona}
                  primaryColor={
                    theme.primary.includes("cyan")
                      ? "#06b6d4"
                      : theme.primary.includes("blue")
                      ? "#3b82f6"
                      : theme.primary.includes("green")
                      ? "#10b981"
                      : theme.primary.includes("orange")
                      ? "#f97316"
                      : "#E0E0E0"
                  }
                  isProcessing={index === messages.length - 1 && isProcessing}
                  attachment={msg.attachment}
                  generatedImage={msg.generatedImage}
                  groundingMetadata={msg.groundingMetadata}
                  wasPruned={(msg as any)._wasPruned}
                  onEdit={(text) => {
                    setInput(text);
                    // Focus input after setting text
                    setTimeout(() => {
                      const textarea = document.querySelector("textarea");
                      if (textarea) textarea.focus();
                    }, 100);
                  }}
                />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div
              className={`${isMobile ? "bg-black/95" : "bg-transparent"} z-40`}
            >
              {/* Status Bar specific to Persona */}
              {persona === "ENGINEER" && (
                <div className="flex gap-2 mb-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-rq-green bg-rq-green-dim/20 p-1 px-2 rounded border border-rq-green/30 w-fit">
                    <FolderOpen size={10} />
                    <span className="opacity-70">CWD:</span>
                    <span className="font-bold">{currentCwd || "ROOT"}</span>
                  </div>
                  {/* KERNEL LOCK INDICATOR */}
                  <div
                    className={`flex items-center gap-2 text-[10px] font-mono p-1 px-2 rounded border w-fit ${
                      isKernelLocked
                        ? "text-slate-400 bg-slate-900/50 border-slate-700"
                        : "text-rq-red bg-rq-red-dim/20 border-rq-red/30 animate-pulse"
                    }`}
                  >
                    <Lock size={10} />
                    <span className="font-bold">
                      {isKernelLocked
                        ? "KERNEL: LOCKED (READ-ONLY)"
                        : "SOURCE_WRITE: ENABLED"}
                    </span>
                  </div>
                </div>
              )}
              {persona === "HACKER" && (
                <div className="mb-2 flex items-center gap-2 text-[10px] font-mono text-green-500 bg-green-950/20 p-1 px-2 rounded border border-green-500/30 w-fit">
                  <Shield size={10} />
                  <span className="opacity-70">OPSEC:</span>
                  <span className="font-bold">ACTIVE</span>
                </div>
              )}

              {attachedImage && (
                <div
                  className={`flex items-center gap-2 mb-2 border ${theme.border} p-2 w-fit bg-white/5`}
                >
                  <ImageIcon size={14} className={theme.primary} />
                  <span className="text-xs text-slate-300">
                    Visual_Input_Buffer_01.jpg
                  </span>
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div
                className={`flex ${isMobile ? "gap-2" : "gap-3"} items-center`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />

                <div className="flex-1">
                  <ChatWidgetInput
                    input={input}
                    setInput={setInput}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    isProcessing={isProcessing}
                    primaryColor={theme.hex}
                    attachment={attachedImage}
                    onClearAttachment={() => setAttachedImage(null)}
                    onAttachClick={() => fileInputRef.current?.click()}
                    isVoiceActive={isVoiceMode}
                    onToggleVoice={toggleVoiceMode}
                    isEyeActive={showCamera}
                    onToggleEye={() => setShowCamera(!showCamera)}
                    onScreenShare={!isMobile ? handleScreenShare : undefined}
                    onClearChat={handleClearChat}
                    onStop={handleStop}
                    isCompact={false}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right Panel */}
          <section
            className={`${
              isMobile
                ? activeMobileTab === "DATA"
                  ? "flex w-full"
                  : "hidden"
                : "hidden md:flex md:col-span-3"
            } flex-col h-full overflow-hidden transition-all duration-300 glass-panel tech-border ${
              theme.primary
            }`}
            style={{ borderLeft: `1px solid ${theme.hex}33` }}
          >
            <div
              className="flex"
              style={{ borderBottom: `1px solid ${theme.hex}33` }}
            >
              <button
                onClick={() => {
                  setRightPanelMode("MANAGE");
                  soundService.play("KEYSTROKE");
                }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                  rightPanelMode === "MANAGE"
                    ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}`
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                MANAGE
              </button>
              <button
                onClick={() => {
                  setRightPanelMode("LOGS");
                  soundService.play("KEYSTROKE");
                }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                  rightPanelMode === "LOGS"
                    ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}`
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                LOGS
              </button>
              <button
                onClick={() => {
                  setRightPanelMode("MEMORY");
                  soundService.play("KEYSTROKE");
                }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                  rightPanelMode === "MEMORY"
                    ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}`
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                MEMORY
              </button>
              <button
                onClick={() => {
                  setRightPanelMode("CLOUD");
                  soundService.play("KEYSTROKE");
                }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                  rightPanelMode === "CLOUD"
                    ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}`
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                <BrainCircuit size={14} className="mx-auto" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs relative">
              {rightPanelMode === "MANAGE" && (
                <div className="space-y-1">
                  <ManagementDashboard
                    onDeleteGoal={handleDeleteGoal}
                    theme={theme}
                  />
                </div>
              )}

              {rightPanelMode === "LOGS" && (
                <div className="space-y-1">
                  {toolLogs.length === 0 && (
                    <div className="text-slate-700 italic">System idle.</div>
                  )}
                  {toolLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`border-l border-slate-800 pl-2 py-1 hover:bg-white/5 transition-colors group font-mono text-[10px]`}
                    >
                      <div className="flex justify-between opacity-50 mb-0.5 text-slate-400">
                        <span
                          className={`font-bold group-hover:text-white transition-colors ${
                            log.toolName === "SENTINEL_LOOP"
                              ? "text-slate-500"
                              : theme.primary
                          }`}
                        >
                          {log.toolName}
                        </span>
                        <span>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        className={`font-bold ${
                          log.result.startsWith("ERROR") ||
                          log.result.startsWith("ACTION ABORTED")
                            ? "text-red-500"
                            : log.result.includes("SENTINEL")
                            ? "text-slate-500"
                            : "text-green-500"
                        }`}
                      >
                        {log.result.substring(0, 100)}
                        {log.result.length > 100 && "..."}
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {rightPanelMode === "MEMORY" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span
                      style={{ color: theme.hex }}
                      className="font-bold uppercase tracking-wider"
                    >
                      NEURAL ARCHIVE
                    </span>
                    <button
                      onClick={handleWipeMemory}
                      className="text-rq-red hover:text-white"
                      title="Format Memory"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {memories.length === 0 && (
                    <div className="text-slate-700 italic">
                      Memory banks empty.
                    </div>
                  )}
                  {memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 rounded transition-all group/mem relative bg-white/5 border"
                      style={{
                        borderColor: `${theme.hex}33`,
                        backgroundColor: `${theme.hex}05`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = theme.hex)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = `${theme.hex}33`)
                      }
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span
                          style={{ color: theme.hex }}
                          className="font-bold"
                        >
                          {mem.key}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[8px] px-1 rounded text-white/80"
                            style={{ backgroundColor: `${theme.hex}80` }}
                          >
                            {mem.category}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingleMemory(mem.id);
                            }}
                            className="hover:text-red-500 opacity-0 group-hover/mem:opacity-100 transition-opacity"
                            style={{ color: theme.hex }}
                            title="Delete Memory"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="text-slate-400 opacity-80 max-h-32 overflow-hidden text-ellipsis whitespace-pre-wrap">
                        {mem.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {rightPanelMode === "CLOUD" && (
                <NeuralCloud memories={memories} />
              )}
            </div>
          </section>
        </main>

        {/* Vision Touch Overlay */}
        <VisionHUD
          themeColor={theme.hex}
          onStreamReady={setVisionStream}
          isActive={false} // DISABLED coupling with Voice Mode (Fixing conflict)
        />

        {/* VISUAL CORE (Moved to Separate Window - Option B) */}
        <VisualCore
          isVisible={!!visualData || !!ghostBrowserUrl}
          browserUrl={ghostBrowserUrl || "about:blank"}
          visualData={visualData}
          videoStream={visionStream}
          onClose={() => {
            setVisualData(null);
            setGhostBrowserUrl("about:blank");
          }}
          onClearData={() => setVisualData(null)}
          sessionId={conversationService.getSessionId()}
          devices={devices}
          themeColor={theme.hex}
          persona={persona as any}
          onCast={(deviceId) => {
            executeTool("castToDevice", {
              deviceId: deviceId,
              content: visualData ? "VISUAL_DATA" : "BROWSER",
              payload: visualData || { url: ghostBrowserUrl },
            });
            soundService.play("SUCCESS");
          }}
          theme={theme}
        />

        {/* Voice Hub Overlay */}
        <VoiceHud
          isActive={isVoiceMode}
          isVisible={showVoiceHud} // Only show if explicitly requested (conflicts with Dictation Widget otherwise)
          onClose={toggleVoiceMode}
          amplitude={voiceAmplitude}
          transcript={voiceTranscript}
          transcriptSource={voiceTranscriptSource}
          isVadActive={isVadActive}
          searchResults={voiceSearchResults}
          visualData={visualData}
          onClearVisualData={() => setVisualData(null)}
          isSpeaking={isSpeaking}
          persona={persona}
          theme={theme}
          onTranscriptComplete={(text) => {
            if (!text) return;
            // Simple Command Parsing (Phase 3)
            const lower = text.toLowerCase();
            console.log("[VoiceCommand] Analyzed:", lower);

            if (lower.includes("remote") || lower.includes("cast")) {
              // Trigger Cast Mode (simulated by opening Visual Core if closed)
              // We can't easily open the picker from here without passing a new prop,
              // but we can switch mode to prompt user.
              soundService.play("SUCCESS");
            } else if (
              lower.includes("data room") ||
              lower.includes("war room")
            ) {
              setVisualData({ topic: "DATA_ROOM", type: "GENERAL", items: [] });
              soundService.play("SUCCESS");
            } else if (lower.includes("cinema") || lower.includes("movie")) {
              setVisualData({ topic: "CINEMA", type: "GENERAL", items: [] });
              soundService.play("SUCCESS");
            } else if (lower.includes("enhance") || lower.includes("scan")) {
              // Trigger Scan Animation
              soundService.play("PROCESSING");
            }
          }}
        />

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="h-20 pb-2 border-t border-slate-800 bg-black flex items-center justify-around z-50 shrink-0">
            <button
              onClick={() => {
                setActiveMobileTab("SYSTEM");
                soundService.play("KEYSTROKE");
              }}
              className={`flex flex-col items-center gap-1 p-2 ${
                activeMobileTab === "SYSTEM" ? theme.primary : "text-slate-600"
              }`}
            >
              <Cpu size={20} />
              <span className="text-[10px] font-bold tracking-wider">
                SYSTEM
              </span>
            </button>
            <button
              onClick={() => {
                setActiveMobileTab("TERMINAL");
                soundService.play("KEYSTROKE");
              }}
              className={`flex flex-col items-center gap-1 p-2 ${
                activeMobileTab === "TERMINAL"
                  ? theme.primary
                  : "text-slate-600"
              }`}
            >
              <TerminalIcon size={20} />
              <span className="text-[10px] font-bold tracking-wider">
                TERMINAL
              </span>
            </button>
            <button
              onClick={() => {
                setActiveMobileTab("DATA");
                soundService.play("KEYSTROKE");
              }}
              className={`flex flex-col items-center gap-1 p-2 ${
                activeMobileTab === "DATA" ? theme.primary : "text-slate-600"
              }`}
            >
              <Database size={20} />
              <span className="text-[10px] font-bold tracking-wider">DATA</span>
            </button>
          </div>
        )}
        {/* Onboarding Flow (V2) */}
        {bootSequence === "ONBOARDING" && (
          <OnboardingFlow
            theme={theme}
            onComplete={(onboardingProfile?: Partial<OperatorProfile>) => {
              // Mark setup as complete
              console.log("[ONBOARDING] Setup sequence finalized.");
              localStorage.setItem("LUCA_SETUP_COMPLETE", "true");

              // Transition to ready
              setBootSequence("READY");
              soundService.play("SUCCESS");

              // Save profile to memory if provided
              if (onboardingProfile) {
                console.log(
                  "[ONBOARDING] Persisting profile to memory core..."
                );

                // 1. Save Identity
                if (onboardingProfile.identity?.name) {
                  memoryService.saveMemory(
                    "OPERATOR_NAME",
                    onboardingProfile.identity.name,
                    "USER_STATE"
                  );
                }

                // 2. Save Personality/Preferences as detailed states
                if (onboardingProfile.personality) {
                  const { communicationStyle, traits, preferences } =
                    onboardingProfile.personality;

                  if (communicationStyle) {
                    memoryService.saveMemory(
                      "COMMUNICATION_STYLE",
                      communicationStyle,
                      "USER_STATE"
                    );
                  }

                  if (traits && traits.length > 0) {
                    memoryService.saveMemory(
                      "PERSONALITY_TRAITS",
                      traits.join(", "),
                      "USER_STATE"
                    );
                  }

                  if (preferences && preferences.length > 0) {
                    memoryService.saveMemory(
                      "OPERATOR_PREFERENCES",
                      preferences.join(", "),
                      "USER_STATE"
                    );
                  }
                }

                // 3. Save as a consolidated profile fact
                memoryService.saveMemory(
                  "OPERATOR_PROFILE_SUMMARY",
                  `Operator ${
                    onboardingProfile.identity?.name || "confirmed"
                  } has a ${
                    onboardingProfile.personality?.communicationStyle || "mixed"
                  } communication style and showed interest during the briefing.`,
                  "USER_STATE"
                );
              }

              // Initial Greeting (Personalized if profile exists)
              setMessages((prev) => {
                if (prev.length === 0) {
                  const operatorName = onboardingProfile?.identity?.name || "";
                  const greeting = operatorName
                    ? `LUCA OS ONLINE. WELCOME BACK, OPERATOR ${operatorName.toUpperCase()}. NEURAL LINK ESTABLISHED.`
                    : `LUCA OS ONLINE. NEURAL LINK ESTABLISHED.`;

                  return [
                    {
                      id: "0",
                      text:
                        greeting + "\n\nHow can I allow you to assist today?",
                      sender: Sender.LUCA,
                      timestamp: Date.now(),
                    },
                  ];
                }
                return prev;
              });
            }}
          />
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <SettingsModal
            onClose={() => setIsSettingsOpen(false)}
            theme={theme}
          />
        )}
      </div>
    </MobilePhoenix>
  );
}
