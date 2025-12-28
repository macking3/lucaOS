import React from "react";
import { renderMarkdown } from "../utils/markdownUtils";

interface ChatMessage {
  sender: "user" | "luca";
  text: string;
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
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {history.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${
            msg.sender === "user" ? "justify-end" : "justify-start"
          } relative z-10`}
        >
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
              msg.sender === "user" ? "text-white" : "text-slate-200"
            }`}
            style={{
              backgroundColor:
                msg.sender === "user"
                  ? `${primaryColor}20`
                  : "rgba(30, 41, 59, 0.5)",
              borderColor:
                msg.sender === "user"
                  ? `${primaryColor}40`
                  : "rgba(255, 255, 255, 0.1)",
              borderWidth: "1px",
              color: msg.sender === "user" ? "#fff" : "#cbd5e1",
            }}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(msg.text, "RUTHLESS"),
            }}
          />
        </div>
      ))}
      {isProcessing && (
        <div className="flex justify-start">
          <div className="flex gap-1 items-center bg-slate-800/50 rounded-lg px-3 py-2 border border-white/10 relative z-10">
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: primaryColor }}
            ></span>
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce delay-75"
              style={{ backgroundColor: primaryColor }}
            ></span>
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce delay-150"
              style={{ backgroundColor: primaryColor }}
            ></span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWidgetHistory;
