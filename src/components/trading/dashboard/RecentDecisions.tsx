import React, { useState } from "react";
import { Brain, ChevronDown, ChevronRight, Check } from "lucide-react";

export interface DecisionCycle {
  id: string;
  cycleNumber: number;
  timestamp: string;
  status: "success" | "pending" | "failed";
  decisions: {
    symbol: string;
    action: "HOLD" | "BUY" | "SELL" | "Short" | "Long";
    reasoning?: string;
  }[];
  chainOfThought: string[];
}

interface RecentDecisionsProps {
  themeCardBg?: string;
  cycles: DecisionCycle[];
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function RecentDecisions({
  themeCardBg = "bg-black/40 border border-slate-800/60 backdrop-blur-sm",
  cycles = [],
  theme,
}: RecentDecisionsProps) {
  const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>(
    {}
  );

  const toggleCycle = (id: string) => {
    setExpandedCycles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className={`${themeCardBg} rounded-lg flex flex-col h-full max-h-[calc(100vh-140px)] overflow-hidden`}
    >
      <div
        className="p-3 border-b border-slate-800/60 flex-shrink-0"
        style={{
          background: theme
            ? `linear-gradient(to r, ${theme.hex}1a, transparent)`
            : "linear-gradient(to r, rgba(99,102,241,0.1), transparent)",
        }}
      >
        <h3
          className="font-bold text-sm flex items-center gap-2"
          style={{ color: theme?.hex || "#c7d2fe" }}
        >
          <Brain size={16} style={{ color: theme?.hex || "#818cf8" }} />
          Recent Decisions
        </h3>
        <p
          className="text-[10px] mt-0.5"
          style={{ color: theme ? `${theme.hex}99` : "rgba(129,140,248,0.6)" }}
        >
          Real-time AI Reasoning Log
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-indigo-500/20">
        {cycles.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            No active decision cycles recorded.
          </div>
        )}
        {cycles.map((cycle) => (
          <div
            key={cycle.id}
            className="border border-slate-800/80 rounded bg-black/20 overflow-hidden flex-shrink-0"
          >
            {/* Header */}
            <div
              className="p-2 flex justify-between items-center bg-slate-900/30 cursor-pointer hover:bg-slate-800/30 transition-colors"
              onClick={() => toggleCycle(cycle.id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    Cycle #{cycle.cycleNumber}
                  </span>
                  {cycle.status === "success" && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Success
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                  {cycle.timestamp}
                </div>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform ${
                  expandedCycles[cycle.id] ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Content */}
            {expandedCycles[cycle.id] && (
              <div className="p-3 space-y-3 bg-black/20 text-left">
                {/* Reasoning Steps */}
                <div className="space-y-1">
                  {cycle.chainOfThought.map((thought, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 text-[10px] text-slate-400 font-mono items-start"
                    >
                      <ChevronRight
                        size={12}
                        className="mt-0.5 shrink-0"
                        style={{
                          color: theme
                            ? `${theme.hex}80`
                            : "rgba(99,102,241,0.5)",
                        }}
                      />
                      <span>{thought}</span>
                    </div>
                  ))}
                </div>

                {/* Decisions List */}
                <div className="space-y-1 pt-2 border-t border-slate-800/50">
                  {cycle.decisions.map((decision, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-slate-900/50 p-1.5 rounded border border-slate-800/50"
                    >
                      <span className="font-bold text-slate-300">
                        {decision.symbol}
                      </span>
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {decision.action.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* AI Performance Stats */}
                <div className="pt-2 flex items-center gap-2 text-[10px] text-slate-500">
                  <Check size={12} className="text-emerald-500" />
                  <span>260ms</span>
                  <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                  <span>Safety Checks OK</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
