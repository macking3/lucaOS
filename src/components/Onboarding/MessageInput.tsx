import React, { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";
import { ConversationMode } from "./ModeSelect";
import VoiceHud from "../VoiceHud";
import { liveService } from "../../services/liveService";
// Note: voiceService not needed - Gemini speaks natively in voice-to-voice mode

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
  mode: ConversationMode;
  theme?: { primary: string; hex: string };
  // Note: lucaMessage/onLucaMessageSpoken removed - Gemini speaks natively in voice-to-voice mode
  onModeChange?: () => void; // Callback to return to mode selection
  onActivity?: () => void; // Callback for silence reset
  onVoiceComplete?: () => void; // Callback when voice conversation completes
  onLucaResponse?: (text: string) => void; // Callback when Luca speaks (for profile extraction)
  onUserResponse?: (text: string) => void; // NEW: Callback when user speaks (for profile extraction)
  userName?: string; // NEW: User's name for personalized greeting
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
  onModeChange,
  onActivity,
  onVoiceComplete,
  onLucaResponse,
  onUserResponse,
  userName = "Operator", // Default if not provided
}) => {
  // Voice state using liveService
  const [amplitude, setAmplitude] = useState(0);
  const [vadActive, setVadActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transcript state (TTS handled natively by Gemini in voice-to-voice mode)
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<"user" | "model">(
    "model"
  );

  // Connection state tracking
  const isConnectedRef = useRef(false);
  const isCompletingRef = useRef(false); // NEW: Guard against double completion triggers

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

  // Connect to liveService when voice mode starts - VOICE-TO-VOICE MODE
  useEffect(() => {
    if (mode === "voice" && !isConnectedRef.current) {
      console.log(
        "[Onboarding Voice] Connecting to liveService (Voice-to-Voice)..."
      );
      isConnectedRef.current = true;
      // setIsListening(false); // Validating connection...

      // Onboarding-specific voice conversation instruction
      const ONBOARDING_VOICE_INSTRUCTION = `You are Luca, an AI assistant meeting your new operator for the first time in a VOICE conversation.

**CRITICAL FORMAT RULE - READ THIS FIRST:**
- Output ONLY the words you will speak aloud
- Do NOT include any asterisks (**), markdown, or formatting
- Do NOT include any thinking, reasoning, or stage directions
- Do NOT say things like "Begin Interacting" or describe what you're doing
- Just speak naturally as if talking to a person

**YOUR GOAL:** Get to know them through natural conversation and summarize their profile.

**STEP 1: GATHER INFORMATION (one at a time):**
1. Preferred name - What should I call you?
2. Communication style - Direct/casual or formal?
3. Role - What do you do?
4. Needs - What do you need help with?
5. AI preferences - Proactive or wait for commands?

**RULES for Step 1:**
- Ask ONE question at a time
- Keep responses SHORT (2-3 sentences)
- Acknowledge answers warmly, then ask next question

**STEP 2: SUMMARY & CONFIRMATION**
Once you have gathered all 5 points, provide a warm summary of their profile.
"So, to recap: You are [Name], a [Occupation] who prefers a [Style] assistant. You're looking for help with [Needs] and you'd like me to be [Proactive/Reactive]. Does that sound correct?"
- You MUST wait for them to confirm.

**STEP 3: EXIT**
- If they confirm (e.g., "Yes", "Exactly", "That's it"), say: "Excellent! I've saved your profile. Let's get started!"
- If they want to change something, go back to Step 1 for that specific item.

**START:** Say "Hi! I'm Luca, your AI assistant. What preferred name can i call you?"

**SKIP:** If they say "skip" or "let's start", say "Got it! Let's jump right in."
`;

      liveService.connect({
        persona: "ASSISTANT",
        // NO suppressOutput - we want Gemini to speak!
        systemInstruction: ONBOARDING_VOICE_INSTRUCTION,
        onToolCall: async () => ({ result: "Tools disabled in onboarding" }), // Keep tools disabled for safety
        onAudioData: (amp) => setAmplitude(amp),
        onTranscript: (text, type) => {
          // STRIP INTERNAL REASONING: Remove text between ** and other formatting
          // This is a tactical cleanup in case Gemini ignores the system instruction
          let processedText = text;
          if (type === "model" && text) {
            // Filter out internal reasoning and metadata
            let filteredText = text;

            // 1. Remove text between ** or * (common internal monologue/stage directions)
            filteredText = filteredText.replace(/\*\*.*?\*\*/g, "");
            filteredText = filteredText.replace(/\*.*?\*/g, "");

            // 2. Remove common "thinking" prefixes that shouldn't be spoken
            // These are phrases seen in reasoning models that often leak to transcript
            const thoughts = [
              /^I see the user.*?\./i,
              /^I'm interpreting.*?\./i,
              /^My next step.*?\./i,
              /^I will start by.*?\./i,
              /^The user said.*?\./i,
            ];

            thoughts.forEach((regex) => {
              filteredText = filteredText.replace(regex, "");
            });

            processedText = filteredText.trim();

            // Remove leading/trailing quotes if Gemini added them
            processedText = processedText.replace(/^["']|["']$/g, "").trim();

            // Log for debugging if we stripped something
            if (processedText !== text) {
              console.log(
                "[Onboarding Voice] Cleaned model transcript:",
                processedText
              );
            }

            // Skip empty transcripts after cleaning
            if (!processedText) return;
          }

          if (type === "user" && processedText) {
            // Pass user response to parent for message history
            onUserResponse?.(processedText);
          }

          console.log(
            `[Onboarding Voice] Transcript (${type}):`,
            processedText
          );
          setCurrentTranscript(processedText);
          setTranscriptSource(type);

          // Notify parent of activity (for silence detection)
          onActivity?.();

          // COMPLETION DETECTION: Check if Gemini said the completion phrase
          if (type === "model" && processedText) {
            // Pass Luca's response to parent for message history and profile extraction
            onLucaResponse?.(processedText);

            const lowerText = processedText.toLowerCase();
            const completionPhrases = [
              "let's get started",
              "i'm ready to help",
              "ready to assist",
              "jump right in",
              "let's jump right in",
              "ready to go",
            ];

            const isComplete = completionPhrases.some((phrase) =>
              lowerText.includes(phrase)
            );
            if (isComplete && !isCompletingRef.current) {
              console.log(
                "[Onboarding Voice] Completion phrase detected - ending onboarding"
              );
              isCompletingRef.current = true; // Set guard
              // Small delay to let Gemini finish speaking
              setTimeout(() => {
                liveService.disconnect();
                isConnectedRef.current = false;
                onVoiceComplete?.();
              }, 2000);
            }
          }
        },
        onVadChange: (active) => {
          setVadActive(active);
          if (active) onActivity?.(); // Reset silence timer when VAD activates
        },
        onStatusUpdate: (msg) => {
          console.log("[Onboarding Voice Status]:", msg);
          if (msg.includes("Failed") || msg.includes("Error")) {
            setError(msg);
          } else {
            setError(null);
          }
        },
        onConnectionChange: (connected) => {
          console.log("[Onboarding Voice] Connection state:", connected);
          // setIsListening(connected);
          isConnectedRef.current = connected; // Update ref immediately

          if (connected) {
            // KICKSTART: Trigger Luca to start speaking immediately
            // Using a more natural prompt to avoid triggering robotic reasoning
            setTimeout(() => {
              if (isConnectedRef.current) {
                // Check ref before sending
                console.log(
                  "[Onboarding Voice] Triggering initial greeting..."
                );
                liveService.sendText(
                  "Hi Luca, I'm ready to begin the onboarding. Please introduce yourself and let's get started with the first few questions."
                );
              }
            }, 1000);
          }
        },
      });
    }
  }, [
    mode,
    onActivity,
    onLucaResponse,
    onUserResponse,
    onVoiceComplete,
    userName,
  ]);

  // Combined Cleanup Effect: Unmount OR Mode change
  useEffect(() => {
    return () => {
      if (isConnectedRef.current) {
        console.log("[Onboarding Voice] Cleaning up voice session...");
        liveService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [mode]);

  // Voice mode: Show VoiceHud (FULL SCREEN)
  if (mode === "voice") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VoiceHud
          isActive={true}
          isVisible={true}
          transcript={currentTranscript}
          transcriptSource={transcriptSource}
          amplitude={amplitude}
          isSpeaking={transcriptSource === "model"}
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
          transparentTranscript={true}
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
          onTranscriptChange={() => {
            // Live transcript updates handled by liveService onTranscript callback
          }}
          onTranscriptComplete={(text) => {
            // In voice-to-voice mode, liveService handles the full conversation
            // We just log the transcript for message history (parent's handleSend handles this)
            if (text.trim()) {
              console.log(
                "[Onboarding Voice] User finished speaking:",
                text.trim()
              );
              onSend(text.trim()); // Parent's handleSend is mode-aware - won't make API call
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
