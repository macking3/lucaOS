import React, { useState } from "react";
import DebateArena from "./DebateArena";
import BacktestPage from "./BacktestPage";
import StrategyBuilder from "./StrategyBuilder";
import TradingDashboard from "./TradingDashboard";
import AITradersPage from "./AITradersPage"; // Use the new Config Page
import {
  Activity,
  X,
  Terminal,
  LayoutDashboard,
  Settings,
  Cpu,
  Trophy,
  Bot,
  Wrench,
} from "lucide-react";

// Use Tailwind classes directly, removing generic CSS dependency
// mimicking StockTerminal.tsx design system

interface AdvancedTradingTerminalProps {
  onClose?: () => void;
  onOpenCompetition?: () => void;
  onOpenTraders?: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function AdvancedTradingTerminal({
  onClose,
  onOpenCompetition,
  onOpenTraders,
  theme,
}: AdvancedTradingTerminalProps) {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "debate" | "backtest" | "strategy" | "config"
  >("dashboard"); // Updated settings -> config

  // Theme constants matching Luca/StockTerminal
  const currentThemeBorder = theme?.border || "border-indigo-500";
  const currentThemePrimary = theme?.primary || "text-indigo-400";
  const currentThemeHex = theme?.hex || "#818cf8";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-300 font-mono p-0 sm:p-4 overflow-hidden">
      <div
        className={`relative w-full h-full sm:h-[85vh] sm:w-[95%] max-w-sm sm:max-w-2xl lg:max-w-6xl bg-black/60 backdrop-blur-xl border-none sm:border ${currentThemeBorder}/30 rounded-none sm:rounded-lg flex flex-col overflow-hidden shadow-2xl`}
        style={{ boxShadow: `0 0 50px ${currentThemeHex}1a` }}
      >
        {/* 1. Header Bar - Matches StockTerminal Header */}
        <div
          className={`h-16 flex-shrink-0 border-b ${currentThemeBorder}/30 flex items-center justify-between px-4 sm:px-6 bg-black/40`}
        >
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div
              className={`p-1.5 sm:p-2 rounded border transition-colors flex-shrink-0`}
              style={{
                borderColor: `${currentThemeHex}66`,
                backgroundColor: `${currentThemeHex}1a`,
                color: currentThemeHex,
              }}
            >
              <Activity size={18} className="sm:size-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-base sm:text-xl tracking-widest text-white uppercase font-display truncate">
                CORTEX <span style={{ color: currentThemeHex }}>AI</span>
              </h2>
              <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-slate-500 font-bold tracking-wider font-mono mt-0.5 truncate">
                <span>ONLINE</span>
                <span className="text-emerald-500 hidden sm:inline">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>

          {/* Close Button Only on Header Right for Mobile */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="relative z-50 p-2 text-slate-500 hover:text-white transition-all cursor-pointer active:scale-95 rounded-lg hover:bg-white/5 flex-shrink-0"
            >
              <X size={20} className="sm:size-6" />
            </button>
          </div>
        </div>

        {/* 1.5 Tab Switcher Bar - Dedicated row for mobile, integrated for Desktop */}
        <div
          className={`flex items-center justify-start sm:justify-center border-b ${currentThemeBorder}/10 bg-black/20 p-1 overflow-x-auto no-scrollbar`}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 sm:px-4 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "bg-slate-100 text-black shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              COMMAND
            </button>
            <button
              onClick={() => setActiveTab("debate")}
              className={`px-3 sm:px-4 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                activeTab === "debate"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              DEBATE
            </button>
            <button
              onClick={() => setActiveTab("backtest")}
              className={`px-3 sm:px-4 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                activeTab === "backtest"
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              BACKTEST
            </button>
            <button
              onClick={() => setActiveTab("strategy")}
              className={`px-3 sm:px-4 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                activeTab === "strategy"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              STRATEGY
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-3 sm:px-4 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "config"
                  ? "bg-slate-700 text-white shadow-lg"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Wrench size={10} className="sm:size-3.5" /> CONFIG
            </button>
            {onOpenCompetition && (
              <button
                onClick={onOpenCompetition}
                className="px-3 sm:px-4 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <Trophy size={10} className="sm:size-3.5" /> RANK
              </button>
            )}
          </div>
        </div>

        {/* 2. Main Content Area - Grid Layout */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
            <div className="h-full">
              {/* Note: Removed wrapper padding for Config page to allow full width */}
              {activeTab === "dashboard" && (
                <div className="p-4 sm:p-6">
                  <TradingDashboard theme={theme} />
                </div>
              )}
              {activeTab === "debate" && (
                <div className="p-4 sm:p-6">
                  <DebateArena theme={theme} />
                </div>
              )}
              {activeTab === "backtest" && (
                <div className="p-4 sm:p-6">
                  <BacktestPage theme={theme} />
                </div>
              )}
              {activeTab === "strategy" && (
                <div className="p-4 sm:p-6">
                  <StrategyBuilder theme={theme} />
                </div>
              )}
              {activeTab === "config" && (
                <AITradersPage onClose={() => setActiveTab("dashboard")} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
