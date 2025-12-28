import React from "react";

interface ModeCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

/**
 * Glassmorphic mode selection card
 * Matches ASSISTANT theme with white/glass aesthetic
 */
const ModeCard: React.FC<ModeCardProps> = ({
  icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="
        group
        relative
        w-full
        bg-white/5 
        border border-white/20 
        rounded-2xl 
        p-6 sm:p-8
        hover:bg-white/10 
        hover:border-white/50
        active:scale-95
        transition-all 
        duration-300
        backdrop-blur-xl
        text-center
        space-y-3 sm:space-y-4
        touch-manipulation
        overflow-hidden
      "
    >
      {/* Glow effect on hover */}
      <div
        className="
          absolute inset-0 
          opacity-0 
          group-hover:opacity-20 
          transition-opacity 
          duration-300
          pointer-events-none
        "
        style={{
          background:
            "radial-gradient(circle at center, rgba(255, 255, 255, 0.3), transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="text-4xl sm:text-6xl mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
          {description}
        </p>

        {/* Call to action button */}
        <div
          className="
          mt-3 sm:mt-4 
          px-4 sm:px-6 py-2 
          bg-white/10 
          border border-white/20
          rounded-lg 
          group-hover:bg-white/20
          group-hover:border-white/40
          transition-all
          inline-block
          text-xs sm:text-sm
          font-medium
          tracking-wide
        "
        >
          Choose
        </div>
      </div>
    </button>
  );
};

export default ModeCard;
