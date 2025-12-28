import React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Pause,
  Trash2,
  Calendar,
} from "lucide-react";

interface BacktestRun {
  id: string;
  status: "running" | "completed" | "failed" | "paused";
  symbol: string;
  model: string;
  roi: number;
  date: string;
}

interface BacktestSidebarProps {
  runs: BacktestRun[];
  selectedRunId?: string;
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => void;
  onNewBacktest: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function BacktestSidebar({
  runs,
  selectedRunId,
  onSelectRun,
  onDeleteRun,
  onNewBacktest,
  theme,
}: BacktestSidebarProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Activity size={14} className="text-yellow-500 animate-pulse" />;
      case "completed":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "failed":
        return <XCircle size={14} className="text-rose-500" />;
      case "paused":
        return <Pause size={14} className="text-slate-500" />;
      default:
        return <Clock size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] border-r border-slate-800 w-72 flex-shrink-0">
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={onNewBacktest}
          className="w-full py-2.5 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          style={{ backgroundColor: theme?.hex || "#eab308" }}
        >
          + New Simulation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {runs.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            No history available
          </div>
        )}
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => onSelectRun(run.id)}
            className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
              selectedRunId === run.id
                ? "bg-[#1e2329]"
                : "bg-transparent border-transparent hover:bg-[#1e2329] hover:border-slate-800"
            }`}
            style={
              selectedRunId === run.id
                ? { borderColor: `${theme?.hex}80` || "rgba(234, 179, 8, 0.5)" }
                : {}
            }
          >
            <div className="flex justify-between items-start mb-1">
              <span
                className={`text-xs font-bold font-mono`}
                style={
                  selectedRunId === run.id
                    ? { color: theme?.hex || "#eab308" }
                    : { color: "#cbd5e1" }
                }
              >
                {run.id.slice(0, 12)}...
              </span>
              {getStatusIcon(run.status)}
            </div>

            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] text-slate-500 font-mono mb-0.5">
                  {run.model}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {run.symbol}
                </div>
              </div>
              <div
                className={`text-xs font-bold font-mono ${
                  run.roi >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {run.roi >= 0 ? "+" : ""}
                {run.roi}%
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRun(run.id);
              }}
              className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
