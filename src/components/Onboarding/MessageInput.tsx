import React, { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";
import { ConversationMode } from "./ModeSelect";
import VoiceHud from "../VoiceHud";
import { liveService } from "../../services/liveService";
import { voiceService } from "../../services/voiceService";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
  mode: ConversationMode;
  theme?: { primary: string; hex: string };
  lucaMessage?: string | null; // Latest message from Luca to speak
  onLucaMessageSpoken?: () => void; // Callback when Luca finishes speaking
  onModeChange?: () => void; // Callback to return to mode selection
  onActivity?: () => void; // New callback for silence reset
}

/**
 * Message input component for text/voice conversation
 */
const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  mode,
  theme = { primary: "cyan", hex: "#06b6d4" },
  lucaMessage,
  onLucaMessageSpoken,
  onModeChange, // Back to mode selection
  onActivity,
}) => {
  // Voice state using liveService
  const [isListening, setIsListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [vadActive, setVadActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TTS and transcript state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<"user" | "model">(
    "user"
  );

  // Prevent duplicate TTS calls
  const speakingRef = useRef(false);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const isConnectedRef = useRef(false);

  // Track if user manually stopped (to prevent auto-restart)
  const userStoppedRef = useRef(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSend(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Connect to liveService when voice mode starts
  useEffect(() => {
    if (mode === "voice" && !isConnectedRef.current) {
      console.log("[Onboarding Voice] Connecting to liveService...");
      isConnectedRef.current = true;
      setIsListening(false); // Validating connection...

      liveService.connect({
        onToolCall: async () => ({ result: "Tools disabled in onboarding" }),
        onAudioData: (amp) => setAmplitude(amp),
        onTranscript: (text, type) => {
          console.log(`[Voice] Transcript (${type}):`, text);
          setCurrentTranscript(text);
          setTranscriptSource(type);

          // Auto-send user transcript when they finish speaking
          if (type === "user" && text.trim()) {
            onSend(text.trim());
          }
        },
        onVadChange: (active) => {
          setVadActive(active);
          if (active) onActivity?.(); // Reset silence timer when VAD activates
        },
        onStatusUpdate: (msg) => {
          console.log("[Voice Status]:", msg);
          if (msg.includes("Failed") || msg.includes("Error")) {
            setError(msg);
          } else {
            setError(null);
          }
        },

        // NEW: Handle connection state changes
        onConnectionChange: (connected) => {
          console.log("[Voice] Connection state changed:", connected);
          setIsListening(connected);
          if (!connected) {
            // If disconnected unexpectedly, update ref
            // But don't auto-reconnect if it was a failure
          }
        },

        persona: "ASSISTANT",
        suppressOutput: true, // IMPORTANT: We only want STT, not the model's voice/replies
        systemInstruction:
          "You are a precise transcriber. LISTEN to the user and REPEAT EXACTLY what they say effectively acting as Speech-to-Text. Do not answer questions. Do not add commentary. just Repeat.", // Force STT behavior
      });
    } // Close if statement
  }, [mode, onSend]);

  // Handle Luca's spoken responses (for text-based messages in onboarding)
  useEffect(() => {
    if (
      mode === "voice" &&
      lucaMessage &&
      !isSpeaking &&
      !speakingRef.current
    ) {
      // Check if this message was already spoken
      if (lastSpokenMessageRef.current === lucaMessage) {
        console.log(
          "[TTS] ⚠️ Skipping duplicate message:",
          lucaMessage.substring(0, 30)
        );
        return;
      }

      const speakLucaMessage = async () => {
        speakingRef.current = true;
        lastSpokenMessageRef.current = lucaMessage;
        setIsSpeaking(true);

        // Get API key for Google TTS
        const apiKey = localStorage.getItem("GEMINI_API_KEY") || "";
        console.log("[TTS] 🎤 Speaking:", lucaMessage.substring(0, 50));

        // Show transcript AFTER a brief delay
        setTimeout(() => {
          setCurrentTranscript(lucaMessage);
          setTranscriptSource("model");
        }, 300);

        // Speak the message via TTS
        await voiceService.speak(lucaMessage, apiKey);

        speakingRef.current = false;
        setIsSpeaking(false);
        setCurrentTranscript("");
        onLucaMessageSpoken?.();
      };

      speakLucaMessage();
    }
  }, [mode, lucaMessage, onLucaMessageSpoken]);

  // Cleanup on unmount - disconnect liveService
  // Cleanup on unmount - disconnect liveService
  useEffect(() => {
    return () => {
      // Unmount cleanup
      if (isConnectedRef.current) {
        liveService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, []);

  // Cleanup when mode changes (e.g. forced exit)
  useEffect(() => {
    if (mode !== "voice" && isConnectedRef.current) {
      console.log("[Voice] Mode changed, forcing disconnect");
      liveService.disconnect();
      isConnectedRef.current = false;
    }
  }, [mode]);

  // Voice mode: Show VoiceHud (FULL SCREEN)
  if (mode === "voice") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VoiceHud
          isActive={true}
          isVisible={true}
          isListening={isListening}
          onToggleListening={() => {
            // LiveService handles listening automatically via VAD
            console.log("[Voice] Toggle listening (managed by liveService)");
          }}
          transcript={currentTranscript}
          transcriptSource={transcriptSource}
          amplitude={amplitude}
          isSpeaking={isSpeaking}
          isVadActive={vadActive}
          paused={false}
          persona="ASSISTANT"
          theme={{
            primary: theme.primary,
            border: `${theme.hex}40`,
            bg: `${theme.hex}10`,
            glow: `${theme.hex}20`,
            coreColor: theme.hex,
          }}
          hideDebugPanels={true}
          hideControls={true}
          onClose={() => {
            console.log("[Voice] User closed voice mode");
            // Disconnect liveService
            liveService.disconnect();
            isConnectedRef.current = false;
            // Go back to mode selection
            if (onModeChange) {
              onModeChange();
            }
          }}
          onTranscriptChange={(text) => {
            // Live transcript updates (optional)
          }}
          onTranscriptComplete={(text) => {
            // When speech recognition finalizes
            if (text.trim() && !disabled) {
              onSend(text.trim());
            }
          }}
        />

        {/* Error message overlay */}
        {error && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center">
            <div className="bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-lg text-xs text-red-300 backdrop-blur-xl">
              {error}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Text mode: Show text input
  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 sm:p-4 border-t border-white/10 backdrop-blur-xl"
    >
      <div
        className="
        flex items-center gap-2 sm:gap-3
        bg-white/5 
        border border-white/20
        rounded-xl sm:rounded-2xl 
        px-3 sm:px-4 py-2 sm:py-3
        backdrop-blur-xl
        focus-within:border-white/40
        focus-within:bg-white/10
        transition-all
      "
      >
        {/* Text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onActivity?.(); // Reset silence timer on typing
          }}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          placeholder="Type your message..."
          autoFocus
          className="
            flex-1 
            bg-transparent 
            text-white 
            text-sm
            placeholder-gray-500
            outline-none
          "
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="
            p-2 
            rounded-lg
            bg-white/10
            hover:bg-white/20
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-all
            active:scale-95
          "
        >
          <Send size={18} className="text-white" />
        </button>
      </div>

      {/* Helper text - hidden on very small screens */}
      <div className="hidden sm:block text-[10px] text-white/40 text-center mt-2">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  );
};

export default MessageInput;
