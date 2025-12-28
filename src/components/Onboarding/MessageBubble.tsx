import React from "react";
import { Message } from "../../types/conversation";

interface MessageBubbleProps {
  message: Message;
}

/**
 * Message bubble component for conversation
 * Displays messages from Luca or User with glassmorphic styling
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isLuca = message.role === "luca";

  // Format timestamp
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div
      className={`flex ${
        isLuca
          ? "justify-start lg:justify-center"
          : "justify-end lg:justify-center"
      } animate-fade-in-up`}
    >
      <div
        className={`
        max-w-[85%] lg:max-w-none lg:w-full
        rounded-2xl 
        p-3 sm:p-4 lg:p-5
        backdrop-blur-xl
        ${
          isLuca
            ? "bg-white/10 border border-white/20"
            : "bg-blue-500/20 border border-blue-400/30"
        }
      `}
      >
        {/* Role label */}
        <div
          className={`text-xs font-bold uppercase tracking-wider mb-2 ${
            isLuca ? "text-white/60" : "text-blue-300/80"
          }`}
        >
          {isLuca ? "Luca" : "You"}
        </div>

        {/* Message content */}
        <div className="text-white text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Timestamp */}
        <div className="text-[10px] text-white/40 mt-2">
          {getTimeAgo(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
