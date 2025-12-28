import React, { useState, useEffect } from "react";
import HologramWidget from "./Hologram/HologramWidget";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { PersonaType } from "../services/lucaService";
import { settingsService } from "../services/settingsService";

/**
 * Dedicated Mode for the Holographic Overlay
 * Renders ONLY the hologram in a transparent window.
 */
const HologramMode: React.FC = () => {
  const {
    transcript,
    status,
    volume,
    isListening,
    startListening,
    stopListening,
  } = useVoiceInput();

  // Theme Management
  const [persona, setPersona] = useState<PersonaType>(
    (settingsService.get("general")?.theme as PersonaType) || "ASSISTANT"
  );

  // --- LOCAL VOICE TOGGLE ---
  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      // Start listening (Gemini Live with Strict Wake Word Protocol)
      startListening();
    }
  };

  // --- IPC LISTENERS (Hotkeys) ---
  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      // Listen for Global Hotkey (F4 / Opt+Space)
      const cleanup = window.electron.ipcRenderer.on(
        "trigger-voice-toggle",
        () => {
          console.log("[Hologram] Hotkey Triggered Voice");
          handleToggleVoice();
        }
      );
      return cleanup;
    }
  }, [isListening, startListening, stopListening]);

  // Sync Persona via Widget State
  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      console.log("[Hologram] IPC Listener Attached");
      const cleanup = window.electron.ipcRenderer.on(
        "sync-widget-state",
        (state: any) => {
          if (state.persona) {
            console.log("[Hologram] Received persona update:", state.persona);
            setPersona(state.persona as PersonaType);
          }
        }
      );
      return cleanup;
    }
  }, []);

  // Theme Mapping
  const THEME_COLORS: Record<string, string> = {
    DEFAULT: "#3b82f6", // Blue (Brand Default)
    RUTHLESS: "#3b82f6", // Blue
    ENGINEER: "#C9763D", // Terracotta/Copper
    ASSISTANT: "#FFFFFF", // White
    HACKER: "#10b981", // Green
  };

  const primaryColor = THEME_COLORS[persona] || THEME_COLORS.RUTHLESS;

  useEffect(() => {
    // No need for interval if hook provides volume updates via state re-renders.
    // But to force animation if hook updates are throttled:
    // actually hook updates state on animation frame if volume changes > 0.01
  }, [status]);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex items-end justify-end p-0">
      <HologramWidget
        isVoiceActive={true} // Always visible in Hologram Mode
        isMicOpen={isListening} // Visual Feedback for Mic Status
        transcript={transcript}
        isSpeaking={status === "SPEAKING"}
        audioLevel={volume}
        primaryColor={isListening ? "#22c55e" : primaryColor} // Use dynamic theme color
        onClick={handleToggleVoice}
      />
    </div>
  );
};

export default HologramMode;
