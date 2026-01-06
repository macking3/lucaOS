import React from "react";
import { Copy, ImageIcon } from "lucide-react";
import { renderMarkdown } from "../utils/markdownUtils";

interface ChatMessage {
  sender: "user" | "luca";
  text: string;
  attachment?: string | null;
  generatedImage?: string | null;
  isStreaming?: boolean;
}

interface ChatWidgetHistoryProps {
  history: ChatMessage[];
  isProcessing: boolean;
  primaryColor: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatWidgetHistory: React.FC<ChatWidgetHistoryProps> = ({
  history,
  isProcessing,
  primaryColor,
  messagesEndRef,
}) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {history.map((msg, idx) => {
        const isUser = msg.sender === "user";

        return (
          <div
            key={idx}
            className={`flex ${
              isUser ? "justify-end" : "justify-start"
            } relative z-10 group`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2.5 text-[13px] transition-all duration-300 relative overflow-hidden ${
                isUser ? "rounded-tr-sm" : "rounded-tl-sm"
              }`}
              style={{
                backgroundColor: isUser
                  ? `${primaryColor}1A`
                  : "rgba(30, 41, 59, 0.6)",
                border: `1px solid ${
                  isUser ? `${primaryColor}33` : "rgba(255, 255, 255, 0.08)"
                }`,
              }}
            >
              {/* User Attachment Preview */}
              {msg.attachment && isUser && (
                <div className="mb-2 overflow-hidden rounded-lg border border-white/10">
                  <img
                    src={
                      msg.attachment.startsWith("data:")
                        ? msg.attachment
                        : `data:image/jpeg;base64,${msg.attachment}`
                    }
                    alt="Attachment"
                    className="max-h-32 w-auto rounded-lg object-cover"
                  />
                </div>
              )}

              {/* AI Generated Image */}
              {msg.generatedImage && !isUser && (
                <div className="mb-3 overflow-hidden rounded-lg border border-slate-700/50 bg-black/20">
                  <div className="px-2 py-1 bg-white/5 text-[9px] text-slate-400 font-bold tracking-widest border-b border-white/5 flex items-center gap-1.5">
                    <ImageIcon size={10} style={{ color: primaryColor }} />
                    GENERATED
                  </div>
                  <img
                    src={
                      msg.generatedImage.startsWith("data:")
                        ? msg.generatedImage
                        : `data:image/jpeg;base64,${msg.generatedImage}`
                    }
                    alt="AI Generated"
                    className="max-h-40 w-auto object-contain"
                  />
                </div>
              )}

              {/* Text Content with Rich Markdown */}
              <div
                className={`prose prose-invert prose-sm max-w-none leading-relaxed font-mono
                  prose-headings:text-slate-200 prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-3
                  prose-p:my-1.5 prose-p:text-slate-300
                  prose-code:text-[11px] prose-code:bg-black/40 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-emerald-400
                  prose-pre:bg-black/60 prose-pre:border prose-pre:border-slate-700/50 prose-pre:rounded-lg prose-pre:p-2 prose-pre:overflow-x-auto prose-pre:my-2
                  prose-table:border-collapse prose-table:w-full prose-table:my-2
                  prose-th:bg-slate-800/80 prose-th:text-[10px] prose-th:font-bold prose-th:px-2 prose-th:py-1 prose-th:text-left prose-th:border prose-th:border-slate-700/50
                  prose-td:text-[11px] prose-td:px-2 prose-td:py-1 prose-td:border prose-td:border-slate-700/30
                  prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5
                  prose-ol:my-1 prose-ol:pl-4
                  prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-slate-400
                  prose-a:text-blue-400 prose-a:underline prose-a:underline-offset-2
                  prose-strong:text-white
                `}
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  color: isUser ? "#fff" : "#cbd5e1",
                  // Custom code block border color
                  ["--tw-prose-pre-border" as any]: `${primaryColor}40`,
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    renderMarkdown(msg.text, "RUTHLESS") +
                    (msg.isStreaming
                      ? '<span class="inline-block w-1.5 h-3.5 ml-1 bg-white animate-pulse rounded-sm align-middle" style="background-color: var(--primary-color, #fff)"></span>'
                      : ""),
                }}
              />

              {/* Copy Button (AI messages only) */}
              {!isUser && (
                <button
                  onClick={() => handleCopy(msg.text)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300"
                  title="Copy"
                >
                  <Copy size={11} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex justify-start">
          <div className="flex gap-1 items-center bg-slate-800/50 rounded-lg px-3 py-2 border border-white/10 relative z-10">
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor, animationDelay: "75ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor, animationDelay: "150ms" }}
            />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWidgetHistory;
