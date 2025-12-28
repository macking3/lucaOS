import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  X,
  Target,
} from "lucide-react";
import {
  DebateMessage,
  DebatePersonality,
  TradeAction,
} from "../../../types/trading";
import { PERSONALITY_COLORS, PERSONALITY_EMOJIS } from "../../../types/trading";

interface MessageCardProps {
  message: DebateMessage;
  participantName: string;
  participantPersonality: DebatePersonality;
  aiModelName: string;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ElementType; label: string }
> = {
  [TradeAction.OPEN_LONG]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: TrendingUp,
    label: "LONG",
  },
  [TradeAction.OPEN_SHORT]: {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    icon: TrendingDown,
    label: "SHORT",
  },
  [TradeAction.HOLD]: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    icon: Minus,
    label: "HOLD",
  },
  [TradeAction.WAIT]: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    icon: Clock,
    label: "WAIT",
  },
  [TradeAction.CLOSE_LONG]: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: X,
    label: "CLOSE",
  },
  [TradeAction.CLOSE_SHORT]: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: X,
    label: "CLOSE",
  },
};

function AIAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const letter = name[0]?.toUpperCase() || "?";
  // Simple deterministic color based on name length
  const colors = [
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-blue-500",
    "bg-emerald-500",
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

export default function MessageCard({
  message,
  participantName,
  participantPersonality,
  aiModelName,
}: MessageCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Use first decision for summary (if multiple, we show all in expanded view)
  const primaryDecision = message.decisions?.[0];
  const actionConfig = primaryDecision
    ? ACTION_CONFIG[primaryDecision.action] || ACTION_CONFIG[TradeAction.WAIT]
    : ACTION_CONFIG[TradeAction.WAIT];

  const personalityColor =
    PERSONALITY_COLORS[participantPersonality] || "#94a3b8";
  const personalityEmoji = PERSONALITY_EMOJIS[participantPersonality] || "🤖";

  return (
    <div
      className="rounded-lg border border-slate-800/60 bg-slate-900/30 overflow-hidden transition-all hover:bg-slate-800/40"
      style={{ borderLeft: `3px solid ${personalityColor}` }}
    >
      {/* Header Summary */}
      <div
        className="p-3 flex items-center gap-3 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <AIAvatar name={aiModelName} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-200 truncate">
              {aiModelName}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-700/50"
              style={{ color: personalityColor }}
            >
              {personalityEmoji} {participantPersonality.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Decision Badge */}
        {primaryDecision && (
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${actionConfig.bg} ${actionConfig.color} border border-white/5`}
          >
            <actionConfig.icon size={12} />
            {primaryDecision.symbol && (
              <span className="text-white/80">{primaryDecision.symbol}</span>
            )}
            <span>{actionConfig.label}</span>
          </div>
        )}

        {/* Confidence (if available) */}
        {primaryDecision && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-mono uppercase">
              Conf.
            </span>
            <span className="text-xs font-bold text-amber-400">
              {primaryDecision.confidence}%
            </span>
          </div>
        )}

        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* 1. Reasoning Block (Blue) */}
          <div className="bg-black/20 rounded p-3 border border-indigo-500/10">
            <div className="text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Chain of Thought
            </div>
            <div className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
              {message.reasoning}
            </div>
          </div>

          {/* 2. Decision Block (Green/Red) */}
          {message.decisions && message.decisions.length > 0 && (
            <div className="bg-black/20 rounded p-3 border border-emerald-500/10">
              <div className="text-[10px] font-bold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <Target size={12} />
                Trade Execution Plan
              </div>

              <div className="space-y-2">
                {message.decisions.map((decision, idx) => {
                  const dConfig =
                    ACTION_CONFIG[decision.action] ||
                    ACTION_CONFIG[TradeAction.WAIT];
                  return (
                    <div
                      key={idx}
                      className="bg-slate-800/50 rounded p-2 text-xs flex items-center justify-between border border-slate-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">
                          {decision.symbol}
                        </span>
                        <span
                          className={`flex items-center gap-1 font-bold ${dConfig.color}`}
                        >
                          <dConfig.icon size={12} /> {dConfig.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-slate-400 font-mono text-[10px]">
                        {decision.leverage && (
                          <span>
                            Lev:{" "}
                            <span className="text-amber-400">
                              {decision.leverage}x
                            </span>
                          </span>
                        )}
                        {decision.positionPct && (
                          <span>
                            Pos:{" "}
                            <span className="text-slate-200">
                              {decision.positionPct * 100}%
                            </span>
                          </span>
                        )}
                        {decision.stopLoss && (
                          <span>
                            SL:{" "}
                            <span className="text-rose-400">
                              {decision.stopLoss * 100}%
                            </span>
                          </span>
                        )}
                        {decision.takeProfit && (
                          <span>
                            TP:{" "}
                            <span className="text-emerald-400">
                              {decision.takeProfit * 100}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview (if closed) */}
      {!isOpen && message.reasoning && (
        <div className="px-3 pb-3 text-xs text-slate-500 line-clamp-1 font-mono pl-11">
          {message.reasoning.substring(0, 120)}...
        </div>
      )}
    </div>
  );
}
