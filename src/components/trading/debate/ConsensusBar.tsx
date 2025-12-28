import React from "react";
import {
  Trophy,
  Clock,
  Zap,
  Target,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { DebateConsensus, TradeAction } from "../../../types/trading";

interface ConsensusBarProps {
  consensus?: DebateConsensus | null;
  onExecute: () => void;
  isExecuting: boolean;
  isExecuted: boolean;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ElementType; label: string }
> = {
  [TradeAction.OPEN_LONG]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    icon: Zap,
    label: "LONG",
  },
  [TradeAction.OPEN_SHORT]: {
    color: "text-rose-400",
    bg: "bg-rose-500/20",
    icon: Zap,
    label: "SHORT",
  },
  [TradeAction.HOLD]: {
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    icon: Target,
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
    icon: Target,
    label: "CLOSE",
  },
  [TradeAction.CLOSE_SHORT]: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    icon: Target,
    label: "CLOSE",
  },
};

export default function ConsensusBar({
  consensus,
  onExecute,
  isExecuting,
  isExecuted,
}: ConsensusBarProps) {
  // If no consensus yet or voting in progress
  if (!consensus) {
    return (
      <div className="p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Clock className="text-amber-500" size={20} />
            <div className="absolute inset-0 bg-amber-500 blur-sm opacity-20 animate-pulse" />
          </div>
          <span className="text-slate-300 font-bold tracking-wider text-sm animate-pulse">
            AWAITING FINAL CONSENSUS...
          </span>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-slate-800/50 px-2 py-1 rounded">
          DEBATE_IN_PROGRESS
        </div>
      </div>
    );
  }

  const actionConfig =
    ACTION_CONFIG[consensus.action] || ACTION_CONFIG[TradeAction.WAIT];
  const canExecute =
    (consensus.action === TradeAction.OPEN_LONG ||
      consensus.action === TradeAction.OPEN_SHORT ||
      consensus.action === TradeAction.CLOSE_LONG ||
      consensus.action === TradeAction.CLOSE_SHORT) &&
    !isExecuted;

  return (
    <div className="p-4 border-t border-white/5 bg-[#161b22] flex items-center gap-6 sticky bottom-0 z-20 shadow-[-10px_-10px_30px_rgba(0,0,0,0.5)]">
      {/* Label */}
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500/20 p-2 rounded-lg border border-yellow-500/30">
          <Trophy size={20} className="text-yellow-500" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            AI Consensus
          </div>
          <div className="text-sm font-bold text-white uppercase flex items-center gap-2">
            {consensus.hasConsensus ? "Agreed" : "Divided"}
          </div>
        </div>
      </div>

      {/* Decision Summary */}
      <div className="flex-1 flex items-center gap-6 px-6 border-l border-white/5 border-r border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-white font-mono tracking-tight">
            {consensus.symbol}
          </span>
          <span
            className={`px-3 py-1 rounded text-sm font-bold flex items-center gap-2 ${actionConfig.bg} ${actionConfig.color}`}
          >
            <actionConfig.icon size={16} />
            {actionConfig.label}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="flex gap-6 text-xs font-mono ml-auto mr-4">
          <Metric
            label="CONFIDENCE"
            value={`${consensus.confidence}%`}
            color="text-amber-400"
          />

          {consensus.leverage > 0 && (
            <Metric
              label="LEVERAGE"
              value={`${consensus.leverage}x`}
              color="text-white"
            />
          )}

          {consensus.positionPct > 0 && (
            <Metric
              label="SIZE"
              value={`${(consensus.positionPct * 100).toFixed(0)}%`}
              color="text-white"
            />
          )}

          {/* Spread Metric (New) */}
          <Metric
            label="SPREAD"
            value={consensus.spread ? `${consensus.spread}%` : "0.08%"}
            color="text-slate-400" // Spread is usually neutral
          />

          {(consensus.stopLoss > 0 || consensus.takeProfit > 0) && (
            <div className="w-px h-8 bg-slate-800 mx-2" />
          )}

          {consensus.stopLoss > 0 && (
            <Metric
              label="SL"
              value={`${(consensus.stopLoss * 100).toFixed(1)}%`}
              color="text-rose-400"
            />
          )}

          {consensus.takeProfit > 0 && (
            <Metric
              label="TP"
              value={`${(consensus.takeProfit * 100).toFixed(1)}%`}
              color="text-emerald-400"
            />
          )}
        </div>
      </div>

      {/* Action Button */}
      <div>
        {isExecuted ? (
          <div className="px-6 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg font-bold border border-emerald-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <CheckCircle2 size={18} />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-extrabold tracking-wider">
                EXECUTED
              </span>
              <span className="text-[10px] opacity-70">CONFIRMED ON-CHAIN</span>
            </div>
          </div>
        ) : canExecute ? (
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold rounded-lg shadow-lg shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isExecuting ? (
              <Clock className="animate-spin" size={18} />
            ) : (
              <Zap size={18} fill="currentColor" />
            )}
            EXECUTE TRADE
          </button>
        ) : (
          <div className="px-6 py-3 bg-slate-800 text-slate-500 rounded-lg font-bold border border-slate-700 cursor-not-allowed opacity-50">
            AWAITING SIGNAL
          </div>
        )}
      </div>
    </div>
  );
}

const Metric = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <div className="flex flex-col">
    <span className="text-slate-600 text-[9px] font-bold uppercase mb-0.5">
      {label}
    </span>
    <span className={`font-bold ${color}`}>{value}</span>
  </div>
);
