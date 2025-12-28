import React from "react";
import { Terminal, X } from "lucide-react";

interface ChatWidgetHeaderProps {
  primaryColor: string;
  onClose: () => void;
}

const ChatWidgetHeader: React.FC<ChatWidgetHeaderProps> = ({
  primaryColor,
  onClose,
}) => {
  return (
    <div
      className="flex justify-between items-center px-4 py-2 border-b select-none text-[10px] font-mono transition-colors duration-500"
      style={{ borderColor: `${primaryColor}20` }}
    >
      <div className="flex items-center gap-2">
        <Terminal size={10} color={primaryColor} />
        <span
          style={{ color: primaryColor }}
          className="tracking-widest font-bold opacity-80"
        >
          LUCA MINI
        </span>
      </div>
      <button
        onClick={onClose}
        className="hover:text-white transition-colors cursor-pointer z-[60]"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <X size={12} />
      </button>
    </div>
  );
};

export default ChatWidgetHeader;
