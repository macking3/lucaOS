import React, { useRef, useEffect, KeyboardEvent } from "react";
import {
  Send,
  Paperclip,
  Camera,
  X,
  Mic,
  MicOff,
  Monitor,
  MessageSquareX,
  Square,
} from "lucide-react";

interface ChatWidgetInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  primaryColor: string;
  onCapture?: () => void;
  attachment?: string | null;
  onClearAttachment?: () => void;
  isEyeActive?: boolean;
  onToggleEye?: () => void;
  isCompact?: boolean;
  onToggleVoice?: () => void;
  isVoiceActive?: boolean;
  onAttachClick?: () => void;
  onScreenShare?: () => void;
  onClearChat?: () => void;
  onHeightChange?: (height: number) => void;
  onStop?: () => void;
}

const ChatWidgetInput: React.FC<ChatWidgetInputProps> = ({
  input,
  setInput,
  onSubmit,
  isProcessing,
  primaryColor,

  attachment,
  onClearAttachment,
  isEyeActive,
  onToggleEye,

  onToggleVoice,
  isVoiceActive,
  onAttachClick,
  onScreenShare,
  onClearChat,
  onHeightChange,
  onStop,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = "auto";

    // Calculate new height (min 60px to account for icons, max 200px)
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(80, Math.min(scrollHeight, 200));

    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = scrollHeight > 200 ? "auto" : "hidden";

    if (onHeightChange) {
      onHeightChange(newHeight);
    }
  };

  // Adjust height when input changes
  useEffect(() => {
    adjustHeight();
  }, [input]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift = Send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || attachment) {
        onSubmit(e as any);
      }
    }
    // Shift + Enter = New line (default behavior, do nothing)
  };

  return (
    <div className="relative">
      {/* Attachment Preview (Above Input) */}
      {attachment && (
        <div className="mb-3 flex">
          <div className="relative group">
            <img
              src={attachment}
              alt="Attachment"
              className="h-20 sm:h-24 w-auto rounded-xl border border-white/20 shadow-lg"
            />
            <button
              type="button"
              onClick={onClearAttachment}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-all active:scale-90"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Input Container (Draggable Wrapper) */}
      <div
        className="relative pt-2 border-t bg-transparent transition-all duration-200"
        style={
          {
            borderColor: `${primaryColor}30`,
            WebkitAppRegion: "drag", // DRAGGABLE AREA
          } as any
        }
        onClick={() => textareaRef.current?.focus()} // Click padding -> Focus input
      >
        {/* Textarea (No Drag, minimal padding) */}
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? "Discuss this image..." : "Message Luca..."}
          rows={1}
          enterKeyHint="enter"
          className={`
            w-full
            bg-transparent
            text-white placeholder-slate-500
            text-[13px]
            px-3 sm:px-4
            pb-7
            focus:outline-none
            resize-none
            font-mono
            leading-relaxed
            block
          `}
          style={
            {
              caretColor: primaryColor,
              WebkitAppRegion: "no-drag", // TEXT INPUT IS NOT DRAGGABLE
            } as any
          }
          autoFocus
        />

        {/* Bottom Icons Row - Anchored to bottom */}
        <div className="absolute bottom-1 left-0 right-0 flex items-center justify-between px-3 sm:px-4 pointer-events-none z-20">
          {/* Left Icons */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Clear Chat Button */}
            {onClearChat && (
              <button
                type="button"
                onClick={onClearChat}
                className="p-1 sm:p-1.5 hover:text-red-400 transition-all rounded-md border hover:bg-white/5 active:scale-90"
                style={{
                  borderColor: `${primaryColor}60`,
                  color: `${primaryColor}99`,
                }}
                title="Clear Chat"
              >
                <MessageSquareX size={15} className="sm:w-[13px] sm:h-[13px]" />
              </button>
            )}

            {/* Attachment Button */}
            <button
              type="button"
              className="p-1 sm:p-1.5 hover:text-slate-300 transition-all rounded-md border hover:bg-white/5 active:scale-90"
              style={{
                borderColor: `${primaryColor}60`,
                color: `${primaryColor}99`,
              }}
              title="Attach file"
              onClick={onAttachClick}
            >
              <Paperclip size={15} className="sm:w-[13px] sm:h-[13px]" />
            </button>

            {/* Camera/Vision Toggle */}
            <button
              type="button"
              onClick={onToggleEye}
              className={`
                p-1 sm:p-1.5 rounded-md border transition-all
                ${
                  isEyeActive
                    ? "text-white bg-white/10 shadow-lg"
                    : "hover:text-white hover:bg-white/5"
                }
                active:scale-90
                relative
              `}
              style={{
                color: isEyeActive ? primaryColor : `${primaryColor}99`,
                borderColor: isEyeActive
                  ? `${primaryColor}90`
                  : `${primaryColor}60`,
              }}
              title={
                isEyeActive ? "Disable Vision" : "Enable Vision (Luca Eye)"
              }
            >
              <Camera
                size={15}
                className={`sm:w-[13px] sm:h-[13px] ${
                  isEyeActive ? "animate-pulse" : ""
                }`}
              />
              {/* Active indicator */}
              {isEyeActive && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </button>

            {/* Screen Share (Monitor) */}
            {onScreenShare && (
              <button
                type="button"
                onClick={onScreenShare}
                className="p-1 sm:p-1.5 hover:text-slate-300 transition-all rounded-md border hover:bg-white/5 active:scale-90"
                style={{
                  borderColor: `${primaryColor}60`,
                  color: `${primaryColor}99`,
                }}
                title="Share Screen"
              >
                <Monitor size={15} className="sm:w-[13px] sm:h-[13px]" />
              </button>
            )}
          </div>

          {/* Right: Voice & Send */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Voice Toggle */}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`
                 p-1 sm:p-1.5 rounded-md border transition-all
                 ${
                   isVoiceActive
                     ? "text-white bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                     : "hover:text-white hover:bg-white/5"
                 }
                 active:scale-90
               `}
              style={{
                borderColor: isVoiceActive
                  ? "rgba(239, 68, 68, 0.5)"
                  : `${primaryColor}60`,
                color: isVoiceActive ? undefined : `${primaryColor}99`,
              }}
              title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {isVoiceActive ? (
                <Mic
                  size={15}
                  className="sm:w-[13px] sm:h-[13px] animate-pulse text-red-400"
                />
              ) : (
                <MicOff size={15} className="sm:w-[13px] sm:h-[13px]" />
              )}
            </button>

            {/* Send / Stop Button */}
            <button
              type="button"
              onClick={(e) => {
                if (isProcessing) {
                  onStop?.();
                  return;
                }
                if (input.trim() || attachment) {
                  onSubmit(e as any);
                }
              }}
              disabled={!input.trim() && !attachment && !isProcessing}
              className={`
              pointer-events-auto
              p-1 sm:p-1.5
              rounded-md border
              transition-all duration-200
              ${
                isProcessing
                  ? "bg-red-500 border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse hover:bg-red-600 active:scale-95"
                  : input.trim() || attachment
                  ? "text-white hover:text-white/80 hover:bg-white/5 active:scale-90"
                  : "text-slate-600 cursor-not-allowed"
              }
            `}
              style={
                (!isProcessing
                  ? {
                      WebkitAppRegion: "no-drag",
                      borderColor: `${primaryColor}${
                        input.trim() || attachment ? "90" : "60"
                      }`,
                      color:
                        input.trim() || attachment
                          ? primaryColor
                          : `${primaryColor}99`,
                    }
                  : { WebkitAppRegion: "no-drag" }) as any
              }
              title={
                isProcessing
                  ? "Stop generation"
                  : input.trim() || attachment
                  ? "Send message (Enter)"
                  : "Type a message"
              }
            >
              {isProcessing ? (
                <Square
                  size={15}
                  className="sm:w-[13px] sm:h-[13px] fill-current"
                />
              ) : (
                <Send size={15} className="sm:w-[13px] sm:h-[13px]" />
              )}
            </button>
          </div>
        </div>

        {/* Focus Glow Effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none -z-10"
          style={{
            boxShadow: `0 0 0 1px ${primaryColor}33, 0 0 20px ${primaryColor}22`,
          }}
        />
      </div>
    </div>
  );
};

export default ChatWidgetInput;
