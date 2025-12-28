import React, { useEffect, useState } from "react";
import WidgetVisualizer, { THEME_COLORS } from "./WidgetVisualizer";
import WidgetControls from "./WidgetControls";

// Simplified type for what we expect from IPC
interface WidgetState {
  isVadActive: boolean;
  isSpeaking: boolean;
  transcript: string;
  amplitude: number;
  persona?: string; // Add Persona for theming
}

import { useDictation } from "../hooks/useDictation";
import { settingsService } from "../services/settingsService";
import { apiUrl } from "../config/api";

const WidgetMode: React.FC = () => {
  const { isDictating, toggleDictation, setDictationState } = useDictation();

  const [state, setState] = useState<WidgetState>({
    isVadActive: false,
    isSpeaking: false,
    transcript: "",
    amplitude: 0,
    persona: settingsService.get("general")?.theme || "ASSISTANT",
  });

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // IPCS Listeners
    // @ts-ignore
    if (window.electron?.ipcRenderer) {
      // 1. Data Update Listener
      // @ts-ignore
      const removeUpdateListener = window.electron.ipcRenderer.on(
        "widget-update",
        (data: any) => {
          setState((prev) => ({ ...prev, ...data }));
        }
      );

      // 2. Theme Change Listener
      // @ts-ignore
      const removeThemeListener = window.electron.ipcRenderer.on(
        "switch-persona",
        (newPersona: string) => {
          setState((prev) => ({ ...prev, persona: newPersona }));
        }
      );

      // 3. Dictation Trigger Listener (Ctrl+D)
      // @ts-ignore
      const removeDictationListener = window.electron.ipcRenderer.on(
        "trigger-voice-toggle",
        (payload: any) => {
          console.log("[Widget] Received trigger-voice-toggle", payload);
          // Loop Fix: Use setDictationState (silent) instead of toggleDictation (emits IPC)
          if (payload?.mode === "DICTATION") {
            setDictationState(true);
          } else if (payload?.mode === "OFF") {
            setDictationState(false);
          } else {
            // Toggle logic if no mode provided?
            setDictationState(!isDictating);
          }
        }
      );

      return () => {
        // @ts-ignore
        if (removeUpdateListener) removeUpdateListener();
        // @ts-ignore
        if (removeThemeListener) removeThemeListener();
        // @ts-ignore
        if (removeDictationListener) removeDictationListener();
      };
    }
  }, [toggleDictation, isDictating, setDictationState]); // Re-bind if state changes to avoid stale validation

  // --- GOD MODE LOGIC ---
  const [isGodMode, setIsGodMode] = useState(false);

  const checkGodMode = async () => {
    try {
      // Try 3001 first (Server), then fallback if needed (though we know it's 3002)
      const res = await fetch(apiUrl("/api/autonomy/status"));
      if (res.ok) {
        const data = await res.json();
        setIsGodMode(data.enabled);
      } else {
        // Endpoint returns 404, silently disable
        setIsGodMode(false);
      }
    } catch (e) {
      // Silent fail (server might be down or endpoint missing)
      setIsGodMode(false);
    }
  };

  useEffect(() => {
    checkGodMode();
    const interval = setInterval(checkGodMode, 2000); // Fast poll for safety visibility
    return () => clearInterval(interval);
  }, []);

  const handleExpand = () => {
    // @ts-ignore
    if (window.electron)
      window.electron.ipcRenderer.send("restore-main-window");
  };

  const currentTheme =
    THEME_COLORS[state.persona as keyof typeof THEME_COLORS] ||
    THEME_COLORS.RUTHLESS;

  // User requested original Blue glow, so we stick to currentTheme.primary
  const primaryColor = currentTheme.primary;

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-transparent"
      style={{ WebkitAppRegion: "drag" } as any} // Allow dragging the window
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* CANVAS ORB VISUALIZER */}
      <WidgetVisualizer
        amplitude={state.amplitude}
        isVadActive={isDictating ? true : state.isVadActive}
        isSpeaking={false}
        persona={state.persona} // Keep original persona (Blue)
        onClick={toggleDictation}
      />

      {/* Transcript / Status Text */}
      <div className="mt-2 px-4 py-2 bg-black/80 backdrop-blur-xl rounded-full border border-white/10 text-center max-w-[180px] transition-all shadow-lg">
        <span
          className="text-xs font-mono whitespace-nowrap overflow-hidden text-ellipsis block tracking-wider font-bold transition-colors duration-500"
          style={{ color: primaryColor }}
        >
          {state.transcript ||
            (isDictating ? "LISTENING (TYPE)..." : "DICTATION MODE")}
        </span>
      </div>

      {/* CONTROLS (EXPAND, ETC) */}
      <WidgetControls isHovered={isHovered} onExpand={handleExpand} />
    </div>
  );
};

export default WidgetMode;
