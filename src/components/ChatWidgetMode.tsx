import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import ChatWidgetHeader from "./ChatWidgetHeader";
import ChatWidgetHistory from "./ChatWidgetHistory";
import ChatWidgetInput from "./ChatWidgetInput";
import { ScreenShare, ScreenShareHandle } from "./ScreenShare";
import { THEME_COLORS } from "./WidgetVisualizer";
import VoiceVisualizer from "./voice/VoiceVisualizer";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { PERSONA_UI_CONFIG, PersonaType } from "../services/lucaService";

interface ChatWidgetState {
  history: { sender: "user" | "luca"; text: string }[];
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

  // IPC Listener for Dictation Toggle (Alt+Space / Tray)
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.history]);

  // IPC Listeners
  useEffect(() => {
    // @ts-ignore
    if (window.electron && window.electron.ipcRenderer) {
      // @ts-ignore
      const remove = window.electron.ipcRenderer.on(
        "chat-widget-reply",
        (response: string) => {
          setState((prev) => ({
            ...prev,
            history: [...prev.history, { sender: "luca", text: response }],
            isProcessing: false,
          }));
        }
      );
      // @ts-ignore
      return () => remove && remove();
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
        history: [...prev.history, { sender: "user", text: cmd }],
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
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
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
