import React from "react";
import { User, Activity, TrendingUp, TrendingDown } from "lucide-react";

interface TraderDetailsProps {
  themeCardBg?: string;
}

export default function TraderDetails({
  themeCardBg = "bg-black/40 border border-slate-800/60 backdrop-blur-sm",
}: TraderDetailsProps) {
  return (
    <div
      className={`${themeCardBg} rounded-lg flex flex-col h-full overflow-hidden`}
    >
      <div className="p-3 border-b border-slate-800/60 bg-indigo-500/5 flex justify-between items-center">
        <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
          <User size={16} />
          Trader Details
        </h3>
        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
          Rank #1
        </span>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3 border-2 border-indigo-500/30">
          <User size={32} className="text-slate-500" />
        </div>
        <h4 className="text-sm font-bold text-white">Select a Trader</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
          Click on a position or leaderboard entry to view detailed performance
          metrics.
        </p>
      </div>
    </div>
  );
}
