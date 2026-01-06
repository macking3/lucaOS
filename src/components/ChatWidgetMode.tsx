/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import ChatWidgetHeader from "./ChatWidgetHeader";
import ChatWidgetHistory from "./ChatWidgetHistory";
import ChatWidgetInput from "./ChatWidgetInput";
import { ScreenShare, ScreenShareHandle } from "./ScreenShare";
import { THEME_COLORS } from "./WidgetVisualizer";
import VoiceVisualizer from "./voice/VoiceVisualizer";
import { useVoiceInput } from "../hooks/useVoiceInput";
import {
  lucaService,
  PERSONA_UI_CONFIG,
  PersonaType,
} from "../services/lucaService";
import { useNeuralLinkDelegation } from "../hooks/useNeuralLinkDelegation";
import { neuralLinkManager } from "../services/neuralLink/manager";
import { ToolRegistry } from "../services/toolRegistry";
import conversationService from "../services/conversationService";

interface ChatWidgetState {
  history: {
    id?: string;
    sender: "user" | "luca";
    text: string;
    attachment?: string | null;
    generatedImage?: string | null;
    isStreaming?: boolean;
  }[];
  isProcessing: boolean;
  persona?: string;
}

const ChatWidgetMode: React.FC = () => {
  const [input, setInput] = useState("");
  const [state, setState] = useState<ChatWidgetState>({
    history: [],
    isProcessing: false,
    persona: "ASSISTANT",
  });
  const [inputHeight, setInputHeight] = useState(44); // Base input height
  const [isEyeActive, setIsEyeActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<ScreenShareHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DICTATION MODE STATE ---
  const [isDictationMode, setIsDictationMode] = useState(false);
  const {
    isListening,
    transcript,
    status: voiceStatus,
    volume,
    startListening,
    stopListening,
  } = useVoiceInput();

  // Track transcript to inject on stop (since hook clears it on stop)
  const transcriptRef = useRef("");
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // --- ONE OS: NEURAL LINK DELEGATION ---
  // This enables this widget (mobile or desktop) to receive commands from other devices
  useNeuralLinkDelegation(
    (neuralLinkManager as any).myDeviceId,
    undefined, // Use default ToolRegistry.execute
    {
      currentDeviceId: (neuralLinkManager as any).myDeviceId,
      currentDeviceType: "android", // We assume widget mode on mobile is Android for now, or use a hook to detect
      neuralLinkManager: neuralLinkManager,
      lucaService: lucaService,
      sessionId: conversationService.getSessionId(),
    },
    {
      onCommandReceived: (command) => {
        // Trigger Neural Pulse for vision/automation commands
        if (
          command.includes("android_") ||
          command === "readScreen" ||
          command === "proofreadText"
        ) {
          setIsScanning(true);
        }
      },
      onCommandComplete: () => {
        // Delay clearing pulses for a "fade out" effect
        setTimeout(() => setIsScanning(false), 1500);
      },
    }
  );

  // IPC Listener for Dictation Toggle (Alt+Space / Tray)
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      // @ts-ignore
      const remove = window.electron.ipcRenderer.on(
        "trigger-voice-toggle",
        () => {
          console.log("[ChatWidget] Toggling Dictation Mode");
          setIsDictationMode((prev) => {
            const nextMode = !prev;
            if (nextMode) {
              console.log(
                "[ChatWidget] Starting Dictation... Calling startListening()"
              );
              // START LISTENING
              startListening();
            } else {
              console.log(
                "[ChatWidget] Stopping Dictation... Calling stopListening()"
              );
              // STOP LISTENING & INJECT
              const textToType = transcriptRef.current;
              stopListening();

              if (textToType && textToType.trim()) {
                console.log("[ChatWidget] Injecting text:", textToType);
                // @ts-ignore
                window.electron.ipcRenderer.send("type-text", {
                  text: textToType,
                });
              }
            }
            return nextMode;
          });
        }
      );
      // @ts-ignore
      return () => remove && remove();
    }
  }, [startListening, stopListening]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setAttachment(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Focus input on mount
  useEffect(() => {
    const inputEl = document.getElementById("chat-input");
    if (inputEl) inputEl.focus();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    const isStreaming = state.history.some((m) => m.isStreaming);
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [state.history]);

  // IPC Listeners
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      // @ts-ignore
      const remove = window.electron.ipcRenderer.on(
        "chat-widget-reply",
        (reply: any) => {
          // ... (keep existing logic for non-streaming fallback if needed, or minimal update) ...
          // For now, we assume App.tsx sends chunks, so this might not be hit for streaming messages
          // OR it might be hit at the end as a duplicate.
          // Let's modify App.tsx to ONLY send stream chunks if streaming, or handle both.
          // BUT: App.tsx sends 'broadcast-stream-chunk'.
          // So we should just ADD the new listener.
          let fullText = "";
          let generatedImage: string | null = null;
          if (typeof reply === "object" && reply !== null) {
            fullText = reply.text || "";
            generatedImage = reply.generatedImage || null;
          } else {
            fullText = String(reply);
          }
          // Fallback legacy handler (if needed)
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            history: [
              ...prev.history,
              {
                sender: "luca",
                text: fullText,
                generatedImage,
                isStreaming: false,
              },
            ],
          }));
        }
      );

      // NEW: Streaming Listener
      // @ts-ignore
      const removeStream = window.electron.ipcRenderer.on(
        "chat-widget-stream-chunk",
        (data: {
          id: string;
          text?: string;
          isComplete?: boolean;
          generatedImage?: string;
        }) => {
          setState((prev) => {
            const history = [...prev.history];
            const existingIdx = history.findIndex((m) => m.id === data.id); // Assuming message has ID now

            // If message doesn't exist yet, create it (streaming start)
            if (existingIdx === -1) {
              // Ensure we don't have a "typing..." placeholder stuck?
              // Ideally App.tsx handles the start.
              return {
                ...prev,
                isProcessing: true, // Keep processing until complete
                history: [
                  ...history,
                  {
                    id: data.id,
                    sender: "luca",
                    text: data.text || "",
                    isStreaming: !data.isComplete,
                    generatedImage: data.generatedImage,
                  },
                ],
              };
            }

            // Update existing message
            const currentMsg = history[existingIdx];
            history[existingIdx] = {
              ...currentMsg,
              text: data.isComplete
                ? data.text || currentMsg.text
                : currentMsg.text + (data.text || ""),
              isStreaming: !data.isComplete,
              generatedImage: data.generatedImage || currentMsg.generatedImage,
            };

            return {
              ...prev,
              isProcessing: !data.isComplete,
              history,
            };
          });
        }
      );

      // @ts-ignore
      return () => {
        if (remove) remove();
        if (removeStream) removeStream();
      };
    }
  }, []);

  // Update State from Main (Persona Sync)
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      // @ts-ignore
      const remove = window.electron.ipcRenderer.on(
        "widget-update",
        (data: any) => {
          if (data.persona) {
            setState((prev) => ({ ...prev, persona: data.persona }));
          }
        }
      );
      // @ts-ignore
      return () => remove && remove();
    }
  }, []);

  // Dynamic Resizing Logic
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      if (isDictationMode) {
        // DICTATION MODE: Fixed larger size for Visualizer
        // @ts-ignore
        window.electron.ipcRenderer.send("chat-widget-resize", {
          height: 200,
          resizable: false,
        });
        return;
      }

      const isCompact = state.history.length === 0;

      if (isCompact) {
        // Compact mode: minimal height for input only
        const height = 16 + inputHeight;
        // @ts-ignore
        window.electron.ipcRenderer.send("chat-widget-resize", {
          height,
          resizable: true,
        });
      } else {
        // Expanded mode: calculate based on content
        // Header: ~40px, Input area: ~60px, Processing indicator: ~40px
        const baseHeight = 40 + 60;

        // Estimate message height: ~25px per message (short) to ~80px (long)
        const avgMessageHeight = state.history.reduce((sum, msg) => {
          const charCount = msg.text.length;
          // Short message (<50 chars): 30px, Medium (<150): 50px, Long: 80px+
          if (charCount < 50) return sum + 35;
          if (charCount < 150) return sum + 60;
          return sum + Math.min(100, 60 + (charCount - 150) / 5);
        }, 0);

        // Add extra space if processing (for the loading dots)
        const processingSpace = state.isProcessing ? 50 : 0;

        // Calculate total: base + messages + processing, with min/max
        const calculatedHeight =
          baseHeight + avgMessageHeight + processingSpace + inputHeight;
        const height = Math.min(Math.max(calculatedHeight, 180), 550);

        // @ts-ignore
        window.electron.ipcRenderer.send("chat-widget-resize", {
          height,
          resizable: true,
        });
      }
    }
  }, [state.history.length, inputHeight, isDictationMode]);

  // Theme Helpers
  const currentTheme =
    PERSONA_UI_CONFIG[state.persona as PersonaType] ||
    PERSONA_UI_CONFIG.RUTHLESS;
  const primaryColor = currentTheme.hex;

  // Attachment Logic
  const [attachment, setAttachment] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const handleSend = async () => {
      if (!input.trim() || state.isProcessing) return;

      const cmd = input.trim();
      const lowerCmd = cmd.toLowerCase();

      // COMMAND: Clear Chat (Client-Side)
      if (
        lowerCmd === "clear chat" ||
        lowerCmd === "clear history" ||
        lowerCmd === "/clear"
      ) {
        setState((prev) => ({ ...prev, history: [] }));
        setInput("");
        setAttachment(null);
        return; // Stop here, don't send to backend
      }

      if (!cmd || state.isProcessing) return;

      let finalAttachment = attachment;

      // EYE LOGIC: If Eye is active, capture screen context immediately
      if (isEyeActive && screenShareRef.current) {
        const capturedFrame = screenShareRef.current.captureFrame();
        if (capturedFrame) {
          finalAttachment = capturedFrame;
        }
      }

      setInput("");
      setAttachment(null); // Clear manual attachment

      // Optimistic update
      setState((prev) => ({
        ...prev,
        history: [
          ...prev.history,
          { sender: "user", text: cmd, attachment: finalAttachment },
        ],
        isProcessing: true,
      }));

      // Send to Main -> App
      // @ts-ignore
      if (window.electron) {
        // @ts-ignore
        const displayId = await window.electron.ipcRenderer.invoke(
          "get-current-display-id"
        );
        // @ts-ignore
        window.electron.ipcRenderer.send("chat-widget-message", {
          text: cmd,
          image: finalAttachment, // Send the image (from Eye or Upload)
          displayId,
        });
      }
    };
    handleSend();
  };

  const handleClose = () => {
    // @ts-ignore
    if (window.electron) window.electron.ipcRenderer.send("chat-widget-close");
  };

  const handleCapture = async () => {
    // @ts-ignore
    if (window.electron) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const screenshotDataUrl = await window.electron.ipcRenderer.invoke(
          "capture-screen"
        );
        if (screenshotDataUrl) {
          setAttachment(screenshotDataUrl);
        }
      } catch (e) {
        console.error("Capture failed:", e);
      }
    }
  };

  const clearAttachment = () => setAttachment(null);

  return (
    <div
      className="h-full w-screen flex flex-col bg-transparent overflow-hidden rounded-xl border shadow-2xl relative transition-colors duration-500"
      style={
        {
          borderColor: `${primaryColor}40`,
          WebkitAppRegion: "drag", // Enable dragging for the whole window
        } as any
      }
    >
      {/* Drag Handle & Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-xl -z-10"></div>
      {/* LUCA SYMBOL OVERLAY (Visible only when expanded) */}
      {state.history.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.08]">
          <span
            className="font-mono italic font-black tracking-tighter"
            style={{ color: primaryColor, fontSize: "55px" }}
          >
            LUCA OS
          </span>
        </div>
      )}

      {/* NEURAL SCAN PULSE */}
      {isScanning && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="w-full h-full absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(6,182,212,0.4)_1px,transparent_1px)] bg-[size:10px_10px] animate-pulse"></div>
          <div className="w-48 h-48 rounded-full border border-rq-blue/30 animate-ping opacity-40"></div>
          <div className="w-32 h-32 rounded-full border border-rq-blue/20 animate-ping delay-700 opacity-20"></div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rq-blue animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-[8px] font-mono text-rq-blue tracking-[0.2em] font-bold uppercase animate-pulse">
              Neural Link Synchronization Active
            </span>
          </div>
        </div>
      )}

      {/* COMPACT CLOSE BUTTON (Visible only when history is empty) */}
      {state.history.length === 0 && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-[100] text-slate-500 hover:text-white transition-colors cursor-pointer"
          style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as any}
        >
          <X size={14} />
        </button>
      )}

      {/* COMPONENTIZED UI */}
      {/* DICTATION VISUALIZER OVERLAY */}
      {isDictationMode && (
        <div
          className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center cursor-pointer"
          style={{ WebkitAppRegion: "no-drag" } as any}
          onClick={(e) => {
            e.stopPropagation();
            // Just shield the click. Do nothing else.
          }}
        >
          <VoiceVisualizer
            amplitude={volume}
            isVadActive={isListening}
            transcriptSource="user"
            persona="DICTATION"
          />
          {transcript && (
            <div className="absolute bottom-10 px-6 text-center">
              <p className="text-xl font-mono text-purple-300 drop-shadow-md">
                {transcript}
              </p>
            </div>
          )}
          <div className="absolute top-4 text-xs font-mono text-purple-500/50 uppercase tracking-widest">
            Dictation Mode Active
          </div>
        </div>
      )}

      <div
        className={`transition-all duration-300 ${
          state.history.length === 0 ? "opacity-0 h-0 hidden" : "opacity-100"
        }`}
      >
        <ChatWidgetHeader primaryColor={primaryColor} onClose={handleClose} />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      <div
        className={`flex-1 min-h-0 transition-all duration-300 ${
          state.history.length === 0 ? "opacity-0 h-0 hidden" : "opacity-100"
        }`}
      >
        <ChatWidgetHistory
          history={state.history}
          isProcessing={state.isProcessing}
          primaryColor={primaryColor}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* LUCA EYE LOGIC (Hidden UI, controlled by Input Button) */}
      <div className="absolute bottom-0 right-0 z-0 pointer-events-none opacity-0">
        <ScreenShare
          ref={screenShareRef}
          isActive={isEyeActive}
          onToggle={setIsEyeActive}
          onFrameCapture={(base64) => {}}
          theme={{
            hex: primaryColor,
            bg: "transparent",
            border: primaryColor,
            primary: primaryColor,
          }}
          showUI={false} // Hidden UI, controlled by Camera Button
          isMobile={false}
        />
      </div>

      <ChatWidgetInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        onAttachClick={() => fileInputRef.current?.click()}
        isProcessing={state.isProcessing}
        primaryColor={primaryColor}
        attachment={attachment}
        onClearAttachment={clearAttachment}
        isEyeActive={isEyeActive}
        onToggleEye={() => setIsEyeActive(!isEyeActive)}
        isCompact={state.history.length === 0}
        onHeightChange={setInputHeight}
        onClearChat={() => setState((prev) => ({ ...prev, history: [] }))}
      />
    </div>
  );
};

export default ChatWidgetMode;
