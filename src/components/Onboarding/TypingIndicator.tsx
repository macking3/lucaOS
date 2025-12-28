import React from "react";

/**
 * Typing indicator for when Luca is processing
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className="
        bg-white/10 
        border border-white/20 
        rounded-2xl 
        px-5 py-3 
        backdrop-blur-xl
        flex items-center gap-2
      "
      >
        <span className="text-xs text-white/60 font-medium">
          Luca is typing
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
