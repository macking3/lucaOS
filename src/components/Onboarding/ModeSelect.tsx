import React from "react";
import ModeCard from "./ModeCard";
import { MessageCircle, Mic } from "lucide-react";

export type ConversationMode = "text" | "voice";

interface ModeSelectProps {
  onSelect: (mode: ConversationMode) => void;
}

/**
 * Communication mode selection screen
 * Lets user choose between text or voice conversation
 */
const ModeSelect: React.FC<ModeSelectProps> = ({ onSelect }) => {
  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in-up w-full max-w-2xl px-4 sm:px-0">
      {/* Luca's message */}
      <div className="text-center space-y-2 sm:space-y-3">
        {/* Icon - Hidden on mobile for more compact view */}
        <div className="hidden sm:flex justify-center mb-4">
          <div
            className="
            w-16 h-16 
            rounded-full 
            bg-white/10 
            border border-white/20
            backdrop-blur-xl
            flex items-center justify-center
          "
          >
            <MessageCircle className="w-8 h-8 text-white/80" />
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-widest uppercase text-white">
          How would you like to talk?
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm">
          Let's get to know each other. Choose your preferred way to
          communicate.
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <ModeCard
          icon="💬"
          title="TEXT"
          description="Type your thoughts"
          onClick={() => onSelect("text")}
        />
        <ModeCard
          icon="🎙️"
          title="VOICE"
          description="Speak naturally"
          onClick={() => onSelect("voice")}
        />
      </div>

      {/* Helper text */}
      <div
        className="
        text-center 
        text-xs 
        text-gray-500 
        bg-white/5 
        border border-white/10
        rounded-lg 
        px-4 py-2
        backdrop-blur-xl
      "
      >
        💡 You can switch between text and voice anytime during our conversation
      </div>
    </div>
  );
};

export default ModeSelect;
