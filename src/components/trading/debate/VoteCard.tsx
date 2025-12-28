import React from "react";
import { TrendingUp, TrendingDown, Minus, Clock, X } from "lucide-react";
import { DebateVote, TradeAction } from "../../../types/trading";

interface VoteCardProps {
  vote: DebateVote;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ElementType; label: string }
> = {
  [TradeAction.OPEN_LONG]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    icon: TrendingUp,
    label: "LONG",
  },
  [TradeAction.OPEN_SHORT]: {
    color: "text-rose-400",
    bg: "bg-rose-500/20",
    icon: TrendingDown,
    label: "SHORT",
  },
  [TradeAction.HOLD]: {
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    icon: Minus,
    label: "HOLD",
  },
  [TradeAction.WAIT]: {
    color: "text-slate-400",
    bg: "bg-slate-500/20",
    icon: Clock,
    label: "WAIT",
  },
  [TradeAction.CLOSE_LONG]: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    icon: X,
    label: "CLOSE",
  },
  [TradeAction.CLOSE_SHORT]: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    icon: X,
    label: "CLOSE",
  },
};

function AIAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const letter = name[0]?.toUpperCase() || "?";
  const colors = [
    "bg-indigo-600",
    "bg-purple-600",
    "bg-pink-600",
    "bg-blue-600",
    "bg-emerald-600",
  ];
  const bg = colors[name.length % colors.length];

  return (
    <div
      className={`${bg} text-white rounded-md flex items-center justify-center font-bold shadow-sm`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {letter}
    </div>
  );
}

export default function VoteCard({ vote }: VoteCardProps) {
  // Use first decision as primary vote representation
  const decision = vote.decisions?.[0];
  if (!decision) return null;

  const actionConfig =
    ACTION_CONFIG[decision.action] || ACTION_CONFIG[TradeAction.WAIT];

  // Confidence Color Logic
  const confColor =
    decision.confidence >= 70
      ? "bg-emerald-500"
      : decision.confidence >= 50
      ? "bg-amber-500"
      : "bg-slate-500";

  return (
    <div className="bg-[#1e2329] rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all shadow-lg">
      {/* Header: Avatar + Name + Action Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <AIAvatar name={vote.aiModelName} size={32} />
          <div>
            <span className="text-slate-200 font-bold block text-sm">
              {vote.aiModelName}
            </span>
            {decision.symbol && (
              <span className="text-[10px] text-slate-500 font-mono">
                {decision.symbol}
              </span>
            )}
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-white/5 ${actionConfig.bg} ${actionConfig.color}`}
        >
          <actionConfig.icon size={14} />
          {actionConfig.label}
        </span>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500 font-medium">Confidence</span>
          <span className="text-white font-bold">{decision.confidence}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${confColor} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${decision.confidence}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-slate-800/50 pt-3 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Leverage</span>
          <span className="text-slate-200 font-mono font-bold">
            {decision.leverage ? `${decision.leverage}x` : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Position</span>
          <span className="text-slate-200 font-mono font-bold">
            {decision.positionPct
              ? `${(decision.positionPct * 100).toFixed(0)}%`
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Stop Loss</span>
          <span className="text-rose-400 font-mono font-bold">
            {decision.stopLoss
              ? `${(decision.stopLoss * 100).toFixed(1)}%`
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Take Profit</span>
          <span className="text-emerald-400 font-mono font-bold">
            {decision.takeProfit
              ? `${(decision.takeProfit * 100).toFixed(1)}%`
              : "-"}
          </span>
        </div>
      </div>

      {/* Reasoning Snippet */}
      {decision.reasoning && (
        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 bg-black/20 p-2 rounded border border-white/5 font-mono">
          {decision.reasoning}
        </p>
      )}
    </div>
  );
}
