import React from "react";
import {
  Copy,
  Terminal,
  ImageIcon,
  Globe,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { renderMarkdown } from "../utils/markdownUtils";
import { PersonaType } from "../services/lucaService";

interface ChatMessageBubbleProps {
  text: string;
  sender: "user" | "luca" | "system";
  timestamp: number;
  persona: PersonaType;
  primaryColor: string;
  isProcessing?: boolean;
  attachment?: string | null;
  generatedImage?: string | null;
  groundingMetadata?: any;
  wasPruned?: boolean;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  text,
  sender,
  timestamp,
  persona,
  primaryColor,
  isProcessing,
  attachment,
  generatedImage,
  groundingMetadata,
  wasPruned,
}) => {
  const isUser = sender === "user";
  const isSystem = sender === "system";

  // System messages (errors, status updates)
  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in zoom-in duration-300">
        <div className="text-[10px] font-mono text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
          <Terminal size={10} />
          {text}
        </div>
      </div>
    );
  }

  // User Messages (Right Aligned)
  if (isUser) {
    return (
      <div className="flex justify-end mb-4 group animate-in slide-in-from-right-2 duration-300">
        <div className="max-w-[85%] sm:max-w-[75%] relative flex flex-col items-end">
          {/* User Attachment */}
          {attachment && (
            <div className="mb-2 overflow-hidden rounded-xl border border-white/10 shadow-lg">
              {wasPruned ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/40 p-3 backdrop-blur-md">
                  <ImageIcon size={14} /> [IMAGE_DATA_PRUNED]
                </div>
              ) : (
                <img
                  src={`data:image/jpeg;base64,${attachment}`}
                  alt="User Attachment"
                  className="max-h-48 rounded-lg object-cover bg-black/20"
                />
              )}
            </div>
          )}

          <div
            className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-white shadow-lg backdrop-blur-sm transition-all text-[13px] leading-relaxed relative overflow-hidden"
            style={{
              backgroundColor: `${primaryColor}1A`, // 10% opacity
              border: `1px solid ${primaryColor}33`, // 20% opacity
            }}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div
              className="whitespace-pre-wrap font-mono relative z-10"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(text, persona),
              }}
            />
          </div>

          <div className="text-[10px] text-slate-500 text-right mt-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity select-none font-medium">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }

  // AI Messages (Left Aligned)
  // Check if this is just the loading indicator
  const isLoadingState = isProcessing && text === "...";

  return (
    <div className="flex justify-start mb-4 group w-full animate-in slide-in-from-left-2 duration-300">
      <div className="flex flex-col gap-2 w-full max-w-full">
        {/* Avatar row - with loading dots next to it when processing */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white/10 bg-black/40 backdrop-blur-sm">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 0 10px ${primaryColor}`,
              }}
            />
          </div>
          {/* Loading dots next to avatar */}
          {isLoadingState && (
            <div className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: primaryColor, animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: "150ms",
                }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: "300ms",
                }}
              />
            </div>
          )}
        </div>

        {/* Content area - only shown when NOT in loading state */}
        {!isLoadingState && (
          <div className="flex-1 min-w-0 w-full">
            <div
              className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-xl backdrop-blur-md transition-all relative overflow-hidden"
              style={{
                backgroundColor: `${primaryColor}1A`, // 10% opacity primary color
                border: `1px solid ${primaryColor}33`, // 20% opacity primary color
              }}
            >
              {/* Generated Image inside bubble */}
              {generatedImage && (
                <div className="mb-4 overflow-hidden rounded-xl border border-slate-700/50 bg-black/20 shadow-lg inline-block max-w-full">
                  <div className="px-3 py-1.5 bg-white/5 text-[10px] text-slate-400 font-bold tracking-widest border-b border-white/5 flex items-center gap-2">
                    <Sparkles size={10} style={{ color: primaryColor }} />
                    GENERATED ASSET
                  </div>
                  {wasPruned ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-mono bg-slate-900/50">
                      [GENERATED_IMAGE_EXPIRED_FROM_CACHE]
                    </div>
                  ) : (
                    <img
                      src={`data:image/jpeg;base64,${generatedImage}`}
                      alt="AI Generated"
                      className="max-h-80 w-auto object-contain bg-black/50"
                    />
                  )}
                </div>
              )}

              {/* Text Content */}
              <div
                className="prose prose-invert prose-slate max-w-none leading-relaxed text-[13px] font-mono"
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(text, persona),
                  }}
                />
              </div>

              {/* Grounding / Sources inside bubble */}
              {groundingMetadata?.groundingChunks &&
                groundingMetadata.groundingChunks.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-700/30">
                    {groundingMetadata.groundingChunks.map(
                      (chunk: any, i: number) => {
                        if (!chunk.web?.uri) return null;
                        return (
                          <a
                            key={i}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 bg-slate-800/20 border border-slate-700/50 hover:border-slate-500 text-[10px] px-2.5 py-1.5 rounded-md transition-all text-slate-400 hover:text-white hover:bg-slate-800/40"
                          >
                            <Globe size={10} />
                            <span className="truncate max-w-[150px]">
                              {chunk.web.title || "Source"}
                            </span>
                            <ExternalLink size={8} className="opacity-50" />
                          </a>
                        );
                      }
                    )}
                  </div>
                )}

              {/* Footer Actions inside bubble */}
              {!isProcessing && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/20">
                  <span className="text-[10px] text-slate-500 select-none font-medium">
                    {new Date(timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(text)}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-md hover:bg-white/5 active:bg-white/10"
                      title="Copy to clipboard"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageBubble;
