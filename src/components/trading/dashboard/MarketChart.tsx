import React, { useState } from "react";
import { BarChart, Activity, Minimize2, Maximize2 } from "lucide-react";

interface MarketChartProps {
  symbol?: string;
  themeCardBg?: string;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function MarketChart({
  symbol = "BTCUSDT",
  themeCardBg = "bg-black/40 border border-slate-800/60 backdrop-blur-sm",
  theme,
}: MarketChartProps) {
  const [viewMode, setViewMode] = useState<"market" | "equity">("market");
  const [timeframe, setTimeframe] = useState("1H");

  return (
    <div
      className={`${themeCardBg} rounded-lg flex flex-col h-full overflow-hidden`}
    >
      {/* Chart Header */}
      <div className="p-3 border-b border-slate-800/60 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-900/50 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode("equity")}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors`}
              style={
                viewMode === "equity"
                  ? {
                      backgroundColor: theme
                        ? `${theme.hex}33`
                        : "rgba(79,70,229,0.2)",
                      color: theme?.hex || "#818cf8",
                    }
                  : {
                      color: "#64748b",
                    }
              }
            >
              Account Equity
            </button>
            <button
              onClick={() => setViewMode("market")}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors`}
              style={
                viewMode === "market"
                  ? {
                      backgroundColor: theme
                        ? `${theme.hex}33`
                        : "rgba(234,179,8,0.2)",
                      color: theme?.hex || "#fbbf24",
                    }
                  : {
                      color: "#64748b",
                    }
              }
            >
              Market Chart
            </button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1">
          {["1m", "5m", "15m", "1H", "4H", "1D"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                timeframe === tf
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]">
        {viewMode === "market" ? (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <BarChart size={48} className="text-slate-700" />
            </div>
            <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">
              TradingView Widget Placeholder
            </p>
            <p className="text-[10px] text-slate-600 mt-2">
              Symbol: {symbol} • Timeframe: {timeframe}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Activity
                size={48}
                style={{ color: theme?.hex || "#4f46e5", opacity: 0.5 }}
              />
            </div>
            <p
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: theme?.hex || "#4f46e5", opacity: 0.5 }}
            >
              Equity Curve Visualization
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
