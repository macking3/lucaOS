import React from "react";
import { Plus, Zap, Trash2, Play, Users } from "lucide-react";
import { DebateSession, TraderInfo } from "../../../types/trading";
import { PunkAvatar } from "../../PunkAvatar";

interface DebateSidebarProps {
  sessions: DebateSession[];
  traders: TraderInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onStart: (id: string) => void;
  onDelete: (id: string) => void;
  selectedTraderId?: string;
  onTraderSelect?: (id: string) => void;
}

export default function DebateSidebar({
  sessions,
  traders,
  selectedId,
  onSelect,
  onCreate,
  onStart,
  onDelete,
  selectedTraderId,
  onTraderSelect,
}: DebateSidebarProps) {
  const onlineTraders = traders.filter((t) => t.is_running);
  const offlineTraders = traders.filter((t) => !t.is_running);

  return (
    <div className="w-64 bg-[#0d1017] border-r border-slate-800/60 flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* 1. New Debate Button */}
      <div className="p-3">
        <button
          onClick={onCreate}
          className="w-full py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/10 active:transform active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> New Debate
        </button>
      </div>

      {/* 2. Debate Sessions List */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Active Sessions</span>
          <span className="bg-slate-800 text-slate-400 px-1.5 rounded-sm">
            {sessions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-2 custom-scrollbar">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`p-3 rounded-lg cursor-pointer border transition-all group relative ${
                selectedId === session.id
                  ? "bg-yellow-500/10 border-yellow-500/50 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${getStatusColor(
                    session.status
                  )}`}
                />
                <span
                  className={`text-sm font-bold truncate flex-1 ${
                    selectedId === session.id ? "text-white" : "text-slate-400"
                  }`}
                >
                  {session.name}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pl-4">
                <span
                  className={
                    selectedId === session.id ? "text-yellow-500/80" : ""
                  }
                >
                  {session.symbol}
                </span>
                <span className="bg-slate-800/50 px-1 rounded">
                  R{session.currentRound}/{session.maxRounds}
                </span>
              </div>

              {/* Actions for Pending State */}
              {session.status === "pending" && selectedId === session.id && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-white/5 animate-in fade-in duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(session.id);
                    }}
                    className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-500/20 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Play size={10} /> START
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    className="flex-1 py-1.5 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded hover:bg-rose-500/20 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 size={10} /> DELETE
                  </button>
                </div>
              )}
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-xs italic flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
                <Play size={16} className="opacity-50" />
              </div>
              No active debates
            </div>
          )}
        </div>
      </div>

      {/* 3. Online Traders List (Bottom - Fixed Height) */}
      <div className="h-[35%] min-h-[180px] border-t border-slate-800/60 flex flex-col bg-[#0b0e14]">
        <div className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 bg-[#0b0e14]">
          <Zap size={12} className="text-emerald-500" />
          <span>Network Agents</span>
          <span className="ml-auto bg-emerald-500/10 text-emerald-500 px-1.5 rounded">
            {onlineTraders.length} Online
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
          {onlineTraders.map((trader) => (
            <TraderRow
              key={trader.trader_id}
              trader={trader}
              isSelected={selectedTraderId === trader.trader_id}
              onClick={() => onTraderSelect?.(trader.trader_id)}
            />
          ))}

          {offlineTraders.length > 0 && (
            <div className="pt-2 mt-2 border-t border-slate-800/40">
              <div className="px-2 mb-2 text-[10px] font-bold text-slate-600 uppercase">
                Offline
              </div>
              {offlineTraders.map((trader) => (
                <TraderRow
                  key={trader.trader_id}
                  trader={trader}
                  isSelected={selectedTraderId === trader.trader_id}
                  onClick={() => onTraderSelect?.(trader.trader_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TraderRow({
  trader,
  isSelected,
  onClick,
}: {
  trader: TraderInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-2 rounded-lg cursor-pointer border transition-all flex items-center gap-3 group ${
        isSelected
          ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm shadow-emerald-500/10"
          : "bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700"
      } ${
        !trader.is_running
          ? "opacity-50 grayscale hover:grayscale-0 hover:opacity-80"
          : ""
      }`}
    >
      <div className="relative">
        <PunkAvatar seed={trader.trader_id} size={32} />
        {trader.is_running && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0b0e14] rounded-full animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={`text-xs font-bold truncate ${
            isSelected
              ? "text-emerald-400"
              : "text-slate-200 group-hover:text-white"
          }`}
        >
          {trader.trader_name}
        </div>
        <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
          {trader.ai_model}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-slate-500";
    case "running":
    case "in_progress":
      return "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]";
    case "voting":
      return "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]";
    case "completed":
      return "bg-emerald-500";
    default:
      return "bg-slate-700";
  }
}
