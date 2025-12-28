import React, { useEffect, useRef, useState } from "react";
import { Volume2, Radio, Zap, Eye, ShieldAlert, Terminal } from "lucide-react";
import { VoiceSettings } from "./VoiceSettings";

import { FULL_TOOL_SET, PersonaType } from "../services/lucaService";
import IntelligenceFeed from "./IntelligenceFeed";
import VisualDataPresenter from "./VisualDataPresenter";

// Import Refactored Components
import VoiceVisualizer from "./voice/VoiceVisualizer";
import VoiceControls from "./voice/VoiceControls";
import VoiceStatusOrb from "./voice/VoiceStatusOrb";

// --- HELPER COMPONENT: Typewriter Text ---
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText(""); // Reset on new text
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => text.substring(0, i + 1));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 45); // ~45ms per char = typewriter speed
    return () => clearInterval(interval);
  }, [text]);

  return <span>"{displayedText}"</span>;
};

// --- CANVAS THEME COLORS ---
const CANVAS_THEME_COLORS: Record<
  PersonaType,
  { primary: string; secondary: string; dark: string }
> = {
  DEFAULT: { primary: "#3b82f6", secondary: "#60a5fa", dark: "#1d4ed8" }, // Blue
  RUTHLESS: { primary: "#3b82f6", secondary: "#60a5fa", dark: "#1d4ed8" }, // Blue
  ENGINEER: { primary: "#C9763D", secondary: "#E09F70", dark: "#8B4513" }, // Terracotta
  ASSISTANT: { primary: "#E0E0E0", secondary: "#F5F5F5", dark: "#9E9E9E" }, // Light Grey
  HACKER: { primary: "#10b981", secondary: "#34d399", dark: "#047857" }, // Green
  DICTATION: { primary: "#a855f7", secondary: "#d8b4fe", dark: "#9333ea" }, // Purple
};

interface VoiceHudProps {
  isActive: boolean;
  isVisible?: boolean; // New prop for conditional visibility (Dictation mode)
  onClose: () => void;
  amplitude: number; // 0 to 1
  transcript: string;
  transcriptSource: "user" | "model";
  isVadActive: boolean;
  paused?: boolean;
  searchResults?: any;
  visualData?: any;
  onClearVisualData?: () => void;
  onTranscriptChange?: (text: string) => void;
  onTranscriptComplete?: (text: string) => void;
  isListening: boolean;
  onToggleListening: () => void;
  isSpeaking: boolean;
  persona: PersonaType;
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
    coreColor: string;
  };
  statusMessage?: string | null;
  hideDebugPanels?: boolean; // Hide ACTIVE PROTOCOLS and TELEMETRY panels
  hideControls?: boolean; // Hide settings and camera buttons (for onboarding)
}

const VoiceHud: React.FC<VoiceHudProps> = ({
  isListening, // Used dynamically by parent hooks
  onToggleListening, // Retained for prop compatibility
  transcript,
  isSpeaking,
  isActive,
  isVisible = true, // Default to true
  onClose,
  amplitude,
  transcriptSource,
  isVadActive,
  paused,
  searchResults,
  onTranscriptChange,
  onTranscriptComplete,
  persona,
  theme,
  statusMessage,
  visualData,
  onClearVisualData,
  hideDebugPanels = false, // Default to false (show panels in main app)
  hideControls = false, // Default to false (show controls in main app)
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dynamicProtocols, setDynamicProtocols] = useState<string[]>([]);
  const [latency, setLatency] = useState(14);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Audio Analysis Logic for Microphone Input (Visualizer)
  // Note: Actual speech recognition is handled by LiveService (parent)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [localAmplitude, setLocalAmplitude] = useState(0);

  // Initialize Audio Analysis
  useEffect(() => {
    // Only run visualizer if active AND visible
    if (!isActive || !isVisible) {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      return;
    }

    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((audioStream) => {
        stream = audioStream;
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;
        dataArrayRef.current = new Uint8Array(
          analyser.frequencyBinCount
        ) as any;

        const updateAmplitude = () => {
          if (
            !isActive ||
            !isVisible ||
            !analyserRef.current ||
            !dataArrayRef.current
          ) {
            animationFrameId = null;
            return;
          }
          analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          const amp = average / 128; // Normalize 0-2 (approx)
          setLocalAmplitude(amp);

          animationFrameId = requestAnimationFrame(updateAmplitude);
        };
        updateAmplitude();
      })
      .catch((err) => {
        console.error("Audio Visualizer Error:", err);
      });

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [isActive, isVisible]);

  // Initialize dynamic tool list
  useEffect(() => {
    if (isActive && isVisible) {
      const tools = FULL_TOOL_SET.map((t) =>
        (t.name || "UNKNOWN").replace(/([A-Z])/g, "_$1").toUpperCase()
      );
      setDynamicProtocols(tools.sort(() => 0.5 - Math.random()).slice(0, 6));
    } else {
      if (videoStream) {
        videoStream.getTracks().forEach((t) => t.stop());
        setVideoStream(null);
      }
      setIsVideoActive(false);
    }

    const interval = setInterval(() => {
      setLatency((prev) =>
        Math.max(5, Math.min(40, prev + (Math.random() - 0.5) * 10))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isVisible]);

  const toggleVideo = async () => {
    if (isVideoActive) {
      if (videoStream) {
        videoStream.getTracks().forEach((t) => t.stop());
        setVideoStream(null);
      }
      setIsVideoActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "environment" },
        });
        setVideoStream(stream);
        setIsVideoActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error("Failed to access camera", e);
      }
    }
  };

  if (!isActive || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
      {/* Video Stream Element */}
      <div
        className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
          isVideoActive ? "opacity-40" : "opacity-0"
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Scanner Overlay */}
        {isVideoActive && (
          <div
            className="absolute inset-0 bg-[size:100%_4px]"
            style={{
              backgroundImage: `linear-gradient(${CANVAS_THEME_COLORS[persona].primary}1A 1px, transparent 1px)`,
            }}
          >
            <div
              className={`absolute top-10 left-10 border-t-2 border-l-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute top-10 right-10 border-t-2 border-r-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute bottom-10 left-10 border-b-2 border-l-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute bottom-10 right-10 border-b-2 border-r-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border ${theme.border} opacity-50 w-64 h-64 rounded-full animate-pulse`}
            ></div>
            <div
              className={`absolute top-20 left-1/2 -translate-x-1/2 ${theme.bg} px-4 py-1 ${theme.primary} text-xs font-bold font-mono tracking-widest`}
            >
              LIVE VISION FEED ACTIVE
            </div>
          </div>
        )}
      </div>

      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Main Visualizer Area */}
      <VoiceVisualizer
        amplitude={localAmplitude}
        isVadActive={isVadActive}
        transcriptSource={transcriptSource}
        persona={persona}
      />

      <VoiceStatusOrb
        isVadActive={isVadActive}
        transcriptSource={transcriptSource}
        amplitude={amplitude}
        persona={persona}
        canvasThemeColor={CANVAS_THEME_COLORS[persona].primary}
      />

      {/* CENTRAL DISPLAY      {/* Transcript Display (Center Bottom) */}
      <div className="absolute bottom-20 sm:bottom-32 w-full px-4 sm:px-8 md:max-w-4xl flex flex-col items-center justify-center z-30">
        {/* Main Transcript */}
        <div
          className="
            text-center 
            px-4 sm:px-6 md:px-8 
            py-3 sm:py-4
            bg-black/40 
            backdrop-blur-md 
            rounded-2xl 
            border 
            border-white/10
            min-h-[60px] sm:min-h-[80px]
            w-full
            max-w-[90vw] sm:max-w-full
          "
          style={{
            borderColor: `${theme.primary}30`,
            boxShadow: `0 0 20px ${theme.glow}`,
          }}
        >
          <div className="mb-2 sm:mb-3 flex items-center justify-center gap-2">
            <Radio
              size={14}
              className="animate-pulse"
              style={{ color: theme.primary }}
            />
            <span
              className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase"
              style={{ color: theme.primary }}
            >
              {transcriptSource === "model" ? "LUCA" : "INPUT"}
            </span>
          </div>
          {transcript ? (
            <div
              className={`
                font-display 
                text-base sm:text-xl md:text-2xl 
                tracking-wide 
                font-bold 
                leading-relaxed 
                transition-all 
                duration-300 
                drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]
                line-clamp-3
                overflow-hidden
                text-ellipsis
                ${transcriptSource === "model" ? theme.primary : "text-white"}
              `}
            >
              {transcriptSource === "model" ? (
                <TypewriterText text={transcript} />
              ) : (
                `"${transcript}"`
              )}
            </div>
          ) : (
            <div className="text-slate-600 font-mono text-[10px] sm:text-xs animate-pulse">
              WAITING FOR AUDIO INPUT...
            </div>
          )}

          {/* SYSTEM STATUS LOG (Underground) */}
          {statusMessage && (
            <div
              className="mt-3 sm:mt-4 font-mono text-[10px] sm:text-xs tracking-widest opacity-70 animate-pulse"
              style={{ color: CANVAS_THEME_COLORS[persona].primary }}
            >
              [SYSTEM_LOG]: {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* Left Panel: Dynamic Active Protocols - Hidden in onboarding */}
      {!hideDebugPanels && (
        <div className="absolute left-12 bottom-1/3 hidden md:flex flex-col gap-4 w-64 font-mono text-xs z-10 pointer-events-none">
          <div
            className="flex items-center gap-2 font-bold border-b pb-2 mb-2"
            style={{
              color: CANVAS_THEME_COLORS[persona].primary,
              borderColor: `${CANVAS_THEME_COLORS[persona].primary}4D`,
            }}
          >
            <Terminal size={14} /> ACTIVE PROTOCOLS
          </div>
          <div className="space-y-3 text-slate-400">
            {dynamicProtocols.map((proto, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div
                  className="w-1 h-1 rounded-full animate-pulse"
                  style={{
                    backgroundColor: CANVAS_THEME_COLORS[persona].primary,
                  }}
                ></div>
                <span>"{proto}"</span>
              </div>
            ))}
            <div className="text-[8px] opacity-30 pt-2">
              ...AND {FULL_TOOL_SET.length - 6} MORE MODULES
            </div>
          </div>
        </div>
      )}

      {/* Right Panel: Telemetry ONLY - Hidden in onboarding */}
      {!hideDebugPanels && (
        <div className="absolute right-12 bottom-24 hidden md:flex flex-col gap-2 w-80 font-mono text-[10px] text-right z-30 pointer-events-auto">
          <div
            className="font-bold mb-2"
            style={{ color: CANVAS_THEME_COLORS[persona].primary }}
          >
            TELEMETRY STREAM
          </div>

          <div className="flex justify-end items-center gap-2 text-slate-400">
            <span>LATENCY</span>
            <span className="text-white font-bold">{latency.toFixed(0)}ms</span>
          </div>

          <div className="flex justify-end items-center gap-2 text-slate-400">
            <span>AUDIO_INPUT_DB</span>
            <div className="w-16 h-1 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${amplitude * 100}%`,
                  backgroundColor: CANVAS_THEME_COLORS[persona].primary,
                }}
              ></div>
            </div>
          </div>

          {isVideoActive && (
            <div
              className={`flex justify-end items-center gap-2 ${theme.primary}`}
            >
              <span>VIDEO_FEED</span>
              <div
                className={`w-2 h-2 rounded-full ${theme.bg.replace(
                  "/40",
                  ""
                )} animate-pulse`}
              ></div>
            </div>
          )}

          <div className="flex justify-end items-center gap-2 text-slate-400">
            <span>SPECTRUM_SHFT</span>
            <span className="text-white font-bold">
              {(amplitude * 1000).toFixed(0)}Hz
            </span>
          </div>

          <div className="mt-4 p-2 border border-red-500/30 bg-red-900/10 text-red-400 flex items-center justify-center gap-2">
            <ShieldAlert size={12} /> FIREWALL: ACTIVE
          </div>
        </div>
      )}

      <VoiceControls
        onSettingsClick={() => setIsSettingsOpen(true)}
        onToggleVideo={toggleVideo}
        isVideoActive={isVideoActive}
        onClose={onClose}
        persona={persona}
        theme={theme}
        canvasThemeColor={CANVAS_THEME_COLORS[persona].primary}
        hideControls={hideControls}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <VoiceSettings onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Footer Status */}
      <div className="absolute bottom-4 md:bottom-8 flex flex-wrap items-center justify-center gap-3 md:gap-12 text-[8px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest z-[60] pointer-events-none px-4 w-full text-center">
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Volume2
            size={10}
            className={`md:w-3 md:h-3 ${amplitude > 0.5 ? "text-white" : ""}`}
          />
          VOL: {(amplitude * 100).toFixed(0)}%
        </div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Radio
            size={10}
            className="animate-pulse md:w-3 md:h-3"
            style={{ color: CANVAS_THEME_COLORS[persona].primary }}
          />
          LOW_LATENCY
        </div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Eye
            size={10}
            className={`md:w-3 md:h-3 ${isVideoActive ? theme.primary : ""}`}
          />
          VISION: {isVideoActive ? "ON" : "OFF"}
        </div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Zap size={10} className="md:w-3 md:h-3" />
          CORE: OK
        </div>
      </div>
    </div>
  );
};

export default VoiceHud;
