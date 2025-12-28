import React, { useState } from "react";
import {
  Play,
  Loader2,
  Brain,
  CheckCircle,
  AlertCircle,
  Terminal,
  Eye,
} from "lucide-react";
import { FullDecision, TradeAction } from "../../../types/trading";
import ReactJson from "react-json-view";

interface AITestRunnerProps {
  onRunTest: () => Promise<FullDecision>;
}

export function AITestRunner({ onRunTest }: AITestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<FullDecision | null>(null);
  const [viewMode, setViewMode] = useState<"visual" | "raw">("visual");

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const decision = await onRunTest();
      setResult(decision);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Control Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs"
        >
          {isRunning ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
          <span className="hidden xs:inline">RUN AI SIMULATION</span>
          <span className="xs:hidden">RUN SIM</span>
        </button>

        <div className="flex bg-slate-800/50 rounded-lg p-0.5 sm:p-1">
          <button
            onClick={() => setViewMode("visual")}
            className={`p-1 sm:p-1.5 rounded-md transition-all ${
              viewMode === "visual"
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Eye size={14} className="sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => setViewMode("raw")}
            className={`p-1 sm:p-1.5 rounded-md transition-all ${
              viewMode === "raw"
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Terminal size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 bg-[#0b0e14] rounded-xl border border-slate-800/60 overflow-hidden relative">
        {!result && !isRunning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
            <Brain size={48} className="mb-4" />
            <p className="font-mono text-sm">Waiting for simulation...</p>
          </div>
        )}

        {isRunning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
            <p className="font-bold text-indigo-400 animate-pulse">
              ANALYZING MARKET DATA...
            </p>
            <p className="text-xs text-slate-500 mt-2 font-mono">
              Running Chain of Thought Inference
            </p>
          </div>
        )}

        {result && (
          <div className="h-full overflow-y-auto custom-scrollbar p-0">
            {viewMode === "visual" ? (
              <div className="p-4 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800">
                  <Brain className="text-purple-400" />
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase">
                      Model Reasoning Time
                    </div>
                    <div className="text-lg font-mono text-white">
                      {result.aiRequestDurationMs}ms
                    </div>
                  </div>
                </div>

                {/* Decisions */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Trade Decisions ({result.decisions.length})
                  </h3>
                  <div className="space-y-3">
                    {result.decisions.map((d, idx) => (
                      <div
                        key={idx}
                        className="bg-[#1e2329] p-4 rounded-lg border border-white/5 relative overflow-hidden group"
                      >
                        <div
                          className={`absolute top-0 left-0 w-1 h-full ${getActionColor(
                            d.action
                          )}`}
                        />
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">
                              {d.symbol}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getActionBadge(
                                d.action
                              )}`}
                            >
                              {d.action.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-2xl font-bold text-white">
                              {d.confidence}%
                            </span>
                            <span className="text-[10px] text-slate-500">
                              CONFIDENCE
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-mono">
                          {d.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CoT */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Chain of Thought
                  </h3>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 text-xs font-mono text-indigo-300 whitespace-pre-wrap leading-relaxed">
                    {result.cotTrace || "No Chain of Thought trace available."}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <ReactJson
                  src={result}
                  theme="ocean"
                  displayDataTypes={false}
                  collapsed={false}
                  style={{ backgroundColor: "transparent" }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getActionColor(action: string) {
  if (action.includes("long")) return "bg-emerald-500";
  if (action.includes("short")) return "bg-rose-500";
  return "bg-slate-500";
}

function getActionBadge(action: string) {
  if (action.includes("long")) return "bg-emerald-500/20 text-emerald-400";
  if (action.includes("short")) return "bg-rose-500/20 text-rose-400";
  return "bg-slate-500/20 text-slate-400";
}
