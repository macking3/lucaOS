import React, { useState, useEffect } from "react";
import GhostBrowser from "./GhostBrowser";
import VisualDataPresenter from "./VisualDataPresenter";
import CinemaPlayer from "./CinemaPlayer";
import CastPicker from "./CastPicker";
import { X, Activity, Cast } from "lucide-react";
import { SmartDevice } from "../types";
import AutonomyTile from "./visual/AutonomyTile";
import SecurityHUD from "./visual/SecurityHUD";
import SovereigntyDashboard from "./visual/SovereigntyDashboard";
import OsintDossier from "./OsintDossier";
import StockTerminal from "./StockTerminal";
import { AutonomyDashboard } from "./AutonomyDashboard";
import SubsystemDashboard from "./SubsystemDashboard";
import CodeEditor from "./CodeEditor";
import SkillsMatrix from "./SkillsMatrix";
import CryptoTerminal from "./CryptoTerminal";
import ForexTerminal from "./ForexTerminal";
import PredictionTerminal from "./PredictionTerminal";
import NetworkMap from "./NetworkMap";
import HackingTerminal from "./HackingTerminal";
import InvestigationReports from "./InvestigationReports";
import GeoTacticalView from "./GeoTacticalView";
import LiveContentDisplay from "./LiveContentDisplay";
import MobileFileBrowser from "./MobileFileBrowser";
import VisionHUD from "./VisionHUD";
import { NeuralRecorder } from "./NeuralRecorder";
import TelegramManager from "./TelegramManager";
import WhatsAppManager from "./WhatsAppManager";
import WirelessManager from "./WirelessManager";
import IngestionModal from "./IngestionModal";

export type VisualCoreMode =
  | "IDLE"
  | "BROWSER"
  | "DATA"
  | "CINEMA"
  | "DATA_ROOM"
  | "SECURITY"
  | "SOVEREIGNTY"
  | "OSINT"
  | "STOCKS"
  | "AUTONOMY"
  | "SUBSYSTEMS"
  | "CODE_EDITOR"
  | "SKILLS"
  | "CRYPTO"
  | "FOREX"
  | "PREDICTIONS"
  | "NETWORK"
  | "HACKING"
  | "REPORTS"
  | "GEO"
  | "LIVE"
  | "FILES"
  | "VISION"
  | "RECORDER"
  | "TELEGRAM"
  | "WHATSAPP"
  | "WIRELESS"
  | "INGESTION";

interface VisualCoreProps {
  isVisible: boolean;
  onClose: () => void;
  // Browser Props
  browserUrl: string;
  // Data Props
  visualData: any;
  onClearData: () => void;
  // Session
  // Casting Props
  devices?: SmartDevice[];
  onCast?: (deviceId: string) => void;
  sessionId: string;
  themeColor?: string;
  videoStream?: MediaStream | null;
  persona?: "RUTHLESS" | "ENGINEER" | "HACKER" | "ASSISTANT";
  // Cinema Casting
  cinemaUrl?: string;
  cinemaSourceType?:
    | "youtube"
    | "local"
    | "stream"
    | "file"
    | "webview"
    | "mirror";
  cinemaTitle?: string;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const VisualCore: React.FC<VisualCoreProps> = ({
  isVisible,
  onClose,
  browserUrl,
  visualData,
  onClearData,
  sessionId,
  devices = [],
  onCast,
  themeColor: propThemeColor,
  videoStream,
  persona = "RUTHLESS",
  cinemaUrl,
  cinemaSourceType = "stream",
  cinemaTitle = "Now Streaming",
  theme,
}) => {
  const [mode, setMode] = useState<VisualCoreMode>("IDLE");
  const [showCastPicker, setShowCastPicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Derive theme color from persona if not explicitly provided
  const getPersonaColor = (p: string) => {
    switch (p) {
      case "RUTHLESS":
        return "#3b82f6"; // Blue (System Original)
      case "HACKER":
        return "#10b981"; // Green (System Original)
      case "ENGINEER":
        return "#d97706"; // Terracotta (System Original)
      case "ASSISTANT":
      default:
        return "#e2e8f0"; // Platinum Gray (System Original)
    }
  };

  const themeColor = theme?.hex || propThemeColor || getPersonaColor(persona);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-switch modes based on props updates
  useEffect(() => {
    if (visualData) {
      if (visualData.topic === "DATA_ROOM") {
        setMode("DATA");
      } else if (visualData.topic === "SECURITY") {
        setMode("SECURITY");
      } else if (visualData.topic === "GLOBAL_SOVEREIGNTY") {
        setMode("SOVEREIGNTY");
      } else if (visualData.type === "OSINT") {
        setMode("OSINT");
      } else if (visualData.type === "STOCKS") {
        setMode("STOCKS");
      } else if (visualData.type === "AUTONOMY") {
        setMode("AUTONOMY");
      } else if (visualData.type === "SUBSYSTEMS") {
        setMode("SUBSYSTEMS");
      } else if (visualData.type === "CODE_EDITOR") {
        setMode("CODE_EDITOR");
      } else if (visualData.type === "SKILLS") {
        setMode("SKILLS");
      } else if (visualData.type === "CRYPTO") {
        setMode("CRYPTO");
      } else if (visualData.type === "FOREX") {
        setMode("FOREX");
      } else if (visualData.type === "PREDICTIONS") {
        setMode("PREDICTIONS");
      } else if (visualData.type === "NETWORK") {
        setMode("NETWORK");
      } else if (visualData.type === "HACKING") {
        setMode("HACKING");
      } else if (visualData.type === "REPORTS") {
        setMode("REPORTS");
      } else if (visualData.type === "GEO") {
        setMode("GEO");
      } else if (visualData.type === "LIVE") {
        setMode("LIVE");
      } else if (visualData.type === "FILES") {
        setMode("FILES");
      } else if (visualData.type === "VISION") {
        setMode("VISION");
      } else if (visualData.type === "RECORDER") {
        setMode("RECORDER");
      } else if (visualData.type === "TELEGRAM") {
        setMode("TELEGRAM");
      } else if (visualData.type === "WHATSAPP") {
        setMode("WHATSAPP");
      } else if (visualData.type === "WIRELESS") {
        setMode("WIRELESS");
      } else if (visualData.type === "INGESTION") {
        setMode("INGESTION");
      } else {
        setMode("DATA");
      }
      return;
    }
    // Auto-switch to CINEMA when a cinema URL or videoStream is provided
    if (cinemaUrl || videoStream) {
      setMode("CINEMA");
      return;
    }
    if (browserUrl && browserUrl !== "about:blank") {
      setMode("BROWSER");
      return;
    }
    if (isVisible && mode === "IDLE") {
      // Default to Browser if nothing specific, or remain IDLE
      setMode("IDLE");
    }
  }, [visualData, browserUrl, isVisible, cinemaUrl, videoStream]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/90 flex flex-col animate-in fade-in duration-300 border border-white/20 shadow-2xl rounded-lg overflow-hidden"
      style={{
        boxShadow: `0 0 40px -10px ${themeColor}40`, // Subtle glow only
      }}
    >
      {/* Visual Core Header / Status Bar - DRAGGABLE AREA */}
      <div
        className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-white/5 backdrop-blur-xl cursor-move"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Activity
              size={16}
              className={mode !== "IDLE" ? "animate-pulse" : ""}
              style={{ color: mode !== "IDLE" ? themeColor : "#64748b" }}
            />
            <span className="text-xs font-mono font-bold tracking-widest text-white/90">
              {mode === "BROWSER" ? "LUCA BROWSER" : "LUCA SCREEN"}
            </span>
          </div>
          {/* Mode Tabs - NON-DRAGGABLE */}
          <div
            className="flex gap-2 ml-8"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <button
              onClick={() => setMode("DATA")}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all`}
              style={
                mode === "DATA"
                  ? {
                      backgroundColor: `${themeColor}33`,
                      color: themeColor,
                      borderColor: `${themeColor}80`,
                    }
                  : {
                      color: "#64748b",
                    }
              }
            >
              Data
            </button>
            <button
              onClick={() => setMode("CINEMA")}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all`}
              style={
                mode === "CINEMA"
                  ? {
                      backgroundColor: `${themeColor}33`,
                      color: themeColor,
                      borderColor: `${themeColor}80`,
                    }
                  : {
                      color: "#64748b",
                    }
              }
            >
              Cinema
            </button>
            <button
              onClick={() => setMode("SECURITY")}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all`}
              style={
                mode === "SECURITY"
                  ? {
                      backgroundColor: "#ef4444",
                      color: "white",
                      borderColor: "#f87171",
                      boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)",
                    }
                  : {
                      color: "rgba(239, 68, 68, 0.6)",
                    }
              }
            >
              Security
            </button>
            <button
              onClick={() => setMode("SOVEREIGNTY")}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all`}
              style={
                mode === "SOVEREIGNTY"
                  ? {
                      backgroundColor: themeColor,
                      color: "white",
                      borderColor: `${themeColor}cc`,
                      boxShadow: `0 0 15px ${themeColor}80`,
                    }
                  : {
                      color: `${themeColor}99`,
                    }
              }
            >
              Sovereignty
            </button>

            {/* CAST BUTTON */}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <button
              onClick={() => setShowCastPicker(true)}
              className="p-1.5 rounded-full text-slate-400 transition-colors"
              style={
                {
                  ":hover": {
                    color: themeColor,
                    backgroundColor: `${themeColor}33`,
                  },
                } as any
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.color = themeColor;
                e.currentTarget.style.backgroundColor = `${themeColor}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Cast to IoT Device"
            >
              <Cast size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
        {/* IDLE SCREEN - Minimalist Clock / Status */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${
            mode === "IDLE" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Subtle Background Pulse */}
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-black to-black animate-pulse-slow"
            style={
              {
                "--tw-gradient-from": `${themeColor}33`, // 20% opacity
                "--tw-gradient-stops": `var(--tw-gradient-from), var(--tw-gradient-to, rgba(0, 0, 0, 0))`,
              } as React.CSSProperties
            }
          />

          <div className="text-center z-10">
            <h1 className="text-6xl font-thin tracking-widest text-white/80 font-mono mb-4">
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </h1>
            <div
              className="flex items-center justify-center gap-3 font-mono text-xs tracking-[0.3em]"
              style={{ color: themeColor }}
            >
              <Activity size={12} />
              <span>SYSTEM ONLINE</span>
            </div>
          </div>
        </div>

        {/* DATA LAYER (Visual Data Stream) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center bg-black/80 backdrop-blur-md ${
            mode === "DATA" || mode === "DATA_ROOM"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {visualData ? (
            <VisualDataPresenter
              data={visualData}
              theme={{
                primary: themeColor,
                border: themeColor,
                bg: `${themeColor}20`,
                glow: `0 0 20px ${themeColor}50`,
              }}
              onClose={onClearData}
            />
          ) : (
            <div className="text-slate-500 font-mono text-sm tracking-widest">
              WAITING FOR VISUAL DATA...
            </div>
          )}
        </div>

        {/* CINEMA LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "CINEMA"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "CINEMA" && (
            <CinemaPlayer
              onClose={() => setMode("IDLE")}
              videoUrl={cinemaUrl}
              videoStream={videoStream}
              sourceType={videoStream ? "mirror" : cinemaSourceType}
              title={videoStream ? "Ghost Mirror Active" : cinemaTitle}
              themeColor={themeColor}
            />
          )}
        </div>

        {/* SECURITY LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "SECURITY"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "SECURITY" && (
            <SecurityHUD
              status={visualData?.status || "IDLE"}
              target={visualData?.target || "0x..."}
              profit={visualData?.profit || "0.00"}
              steps={
                visualData?.steps || [
                  "A1_RECON",
                  "POCO_SYNTHESIS",
                  "QUIMERA_VAL",
                  "REALIZE",
                ]
              }
              metrics={
                visualData?.metrics || {
                  cost: "$0.05",
                  successRate: "94%",
                  threatLevel: 10,
                }
              }
              themeColor={themeColor}
            />
          )}
        </div>

        {/* SOVEREIGNTY LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "SOVEREIGNTY"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "SOVEREIGNTY" && visualData && (
            <SovereigntyDashboard
              data={
                visualData.data || {
                  totalProfit: 0,
                  leadsFound: 0,
                  chainsScanned: 0,
                  activeChains: [],
                }
              }
              themeColor={themeColor}
            />
          )}
        </div>

        {/* OSINT LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "OSINT"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "OSINT" && visualData?.profile && (
            <OsintDossier
              profile={visualData.profile}
              onClose={() => setMode("IDLE")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* STOCKS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "STOCKS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "STOCKS" && (
            <StockTerminal
              onClose={() => setMode("IDLE")}
              initialSymbol={visualData?.symbol}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* AUTONOMY LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "AUTONOMY"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "AUTONOMY" && (
            <AutonomyDashboard onClose={() => setMode("IDLE")} />
          )}
        </div>

        {/* SUBSYSTEMS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "SUBSYSTEMS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "SUBSYSTEMS" && (
            <SubsystemDashboard
              onClose={() => setMode("IDLE")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>
        {/* CODE EDITOR LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "CODE_EDITOR"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "CODE_EDITOR" && (
            <CodeEditor
              onClose={() => setMode("IDLE")}
              initialCwd={visualData?.cwd || "/"}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* SKILLS MATRIX LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "SKILLS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "SKILLS" && (
            <SkillsMatrix
              onClose={() => setMode("IDLE")}
              onExecute={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* CRYPTO TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "CRYPTO"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "CRYPTO" && (
            <CryptoTerminal
              onClose={() => setMode("IDLE")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* FOREX TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "FOREX"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "FOREX" && (
            <ForexTerminal
              onClose={() => setMode("IDLE")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* PREDICTION TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "PREDICTIONS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "PREDICTIONS" && (
            <PredictionTerminal
              onClose={() => setMode("IDLE")}
              positions={[]}
              onBet={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* NETWORK MAP LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "NETWORK"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "NETWORK" && <NetworkMap onClose={() => setMode("IDLE")} />}
        </div>

        {/* HACKING TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "HACKING"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "HACKING" && (
            <HackingTerminal
              onClose={() => setMode("IDLE")}
              toolLogs={[]}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>
        {/* REPORTS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "REPORTS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "REPORTS" && (
            <InvestigationReports
              onClose={() => setMode("IDLE")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* GEO TACTICAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "GEO"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "GEO" && (
            <GeoTacticalView
              onClose={() => setMode("IDLE")}
              targetName={visualData?.targetName || "Unknown"}
              markers={visualData?.markers || []}
            />
          )}
        </div>

        {/* LIVE CONTENT LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "LIVE"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "LIVE" && (
            <LiveContentDisplay
              onClose={() => setMode("IDLE")}
              content={visualData?.content || {}}
            />
          )}
        </div>

        {/* FILES LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "FILES"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "FILES" && (
            <MobileFileBrowser onClose={() => setMode("IDLE")} />
          )}
        </div>

        {/* VISION HUD LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "VISION"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "VISION" && (
            <VisionHUD themeColor={themeColor} isActive={true} />
          )}
        </div>

        {/* NEURAL RECORDER LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "RECORDER"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "RECORDER" && (
            <NeuralRecorder
              onClose={() => setMode("IDLE")}
              onSave={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* TELEGRAM LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "TELEGRAM"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "TELEGRAM" && (
            <TelegramManager
              onClose={() => setMode("IDLE")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/20`,
              }}
            />
          )}
        </div>

        {/* WHATSAPP LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "WHATSAPP"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "WHATSAPP" && (
            <WhatsAppManager
              onClose={() => setMode("IDLE")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* WIRELESS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "WIRELESS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "WIRELESS" && (
            <WirelessManager
              onClose={() => setMode("IDLE")}
              activeTab="WIFI"
              onConnect={() => {}}
            />
          )}
        </div>

        {/* INGESTION LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "INGESTION"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "INGESTION" && (
            <IngestionModal
              onClose={() => setMode("IDLE")}
              onIngest={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* BROWSER LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "BROWSER"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "BROWSER" && (
            <GhostBrowser
              url={browserUrl || "https://google.com"}
              onClose={() => setMode("IDLE")}
              mode="EMBEDDED"
            />
          )}
        </div>
      </div>

      {/* CAST PICKER OVERLAY */}
      {showCastPicker && (
        <CastPicker
          devices={devices || []}
          onCancel={() => setShowCastPicker(false)}
          onSelect={(deviceId) => {
            if (onCast) onCast(deviceId);
            setShowCastPicker(false);
          }}
        />
      )}
    </div>
  );
};

export default VisualCore;
