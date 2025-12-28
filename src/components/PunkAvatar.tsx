import React from "react";

interface PunkAvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function PunkAvatar({
  seed,
  size = 40,
  className = "",
}: PunkAvatarProps) {
  // Simple deterministic color generator
  const getGradient = (seed: string) => {
    const hash = seed
      .split("")
      .reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      "from-pink-500 to-rose-500",
      "from-purple-500 to-indigo-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-amber-500 to-orange-500",
    ];
    return colors[hash % colors.length];
  };

  const gradient = getGradient(seed);

  return (
    <div
      className={`rounded overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center shadow-inner ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="text-white font-bold opacity-80 select-none pb-0.5"
        style={{ fontSize: size * 0.5 }}
      >
        {seed.substring(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

export function getTraderAvatar(traderId: string, traderName?: string): string {
  return traderName || traderId || "UNK";
}
