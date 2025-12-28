import React from "react";
import { Activity, BarChart, TrendingUp, Settings2 } from "lucide-react";
import { IndicatorConfig } from "../../../types/trading";

interface IndicatorEditorProps {
  config: IndicatorConfig;
  onChange: (config: IndicatorConfig) => void;
}

export function IndicatorEditor({ config, onChange }: IndicatorEditorProps) {
  const updateRSI = (updates: Partial<typeof config.rsi>) => {
    onChange({ ...config, rsi: { ...config.rsi, ...updates } });
  };

  const updateMACD = (updates: Partial<typeof config.macd>) => {
    onChange({ ...config, macd: { ...config.macd, ...updates } });
  };

  const updateEMA = (updates: Partial<typeof config.ema>) => {
    onChange({ ...config, ema: { ...config.ema, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* RSI Section */}
      <div
        className={`rounded-xl border transition-colors ${
          config.rsi.enabled
            ? "bg-[#1e2329] border-white/5"
            : "bg-[#0b0e14] border-slate-800/50 opacity-80"
        }`}
      >
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              onClick={() => updateRSI({ enabled: !config.rsi.enabled })}
              className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                config.rsi.enabled
                  ? "bg-indigo-500 border-indigo-500"
                  : "border-slate-600"
              }`}
            >
              {config.rsi.enabled && (
                <div className="w-2 h-2 bg-white rounded-sm" />
              )}
            </div>
            <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Activity size={16} className="text-pink-400" /> RSI
            </div>
          </div>
          {config.rsi.enabled && (
            <span className="text-[10px] text-slate-500 font-mono">
              Relative Strength Index
            </span>
          )}
        </div>

        {config.rsi.enabled && (
          <div className="p-3 pt-0 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Period
              </label>
              <input
                type="number"
                value={config.rsi.period}
                onChange={(e) =>
                  updateRSI({ period: parseInt(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Overbought
              </label>
              <input
                type="number"
                value={config.rsi.overbought}
                onChange={(e) =>
                  updateRSI({ overbought: parseInt(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Oversold
              </label>
              <input
                type="number"
                value={config.rsi.oversold}
                onChange={(e) =>
                  updateRSI({ oversold: parseInt(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center"
              />
            </div>
          </div>
        )}
      </div>

      {/* MACD Section */}
      <div
        className={`rounded-xl border transition-colors ${
          config.macd.enabled
            ? "bg-[#1e2329] border-white/5"
            : "bg-[#0b0e14] border-slate-800/50 opacity-80"
        }`}
      >
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              onClick={() => updateMACD({ enabled: !config.macd.enabled })}
              className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                config.macd.enabled
                  ? "bg-indigo-500 border-indigo-500"
                  : "border-slate-600"
              }`}
            >
              {config.macd.enabled && (
                <div className="w-2 h-2 bg-white rounded-sm" />
              )}
            </div>
            <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart size={16} className="text-emerald-400" /> MACD
            </div>
          </div>
          {config.macd.enabled && (
            <span className="text-[10px] text-slate-500 font-mono">
              Moving Avg Convergence Div
            </span>
          )}
        </div>

        {config.macd.enabled && (
          <div className="p-3 pt-0 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Fast
              </label>
              <input
                type="number"
                value={config.macd.fastPeriod}
                onChange={(e) =>
                  updateMACD({ fastPeriod: parseInt(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Slow
              </label>
              <input
                type="number"
                value={config.macd.slowPeriod}
                onChange={(e) =>
                  updateMACD({ slowPeriod: parseInt(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Signal
              </label>
              <input
                type="number"
                value={config.macd.signalPeriod}
                onChange={(e) =>
                  updateMACD({ signalPeriod: parseInt(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center"
              />
            </div>
          </div>
        )}
      </div>

      {/* EMA Section */}
      <div
        className={`rounded-xl border transition-colors ${
          config.ema.enabled
            ? "bg-[#1e2329] border-white/5"
            : "bg-[#0b0e14] border-slate-800/50 opacity-80"
        }`}
      >
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              onClick={() => updateEMA({ enabled: !config.ema.enabled })}
              className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                config.ema.enabled
                  ? "bg-indigo-500 border-indigo-500"
                  : "border-slate-600"
              }`}
            >
              {config.ema.enabled && (
                <div className="w-2 h-2 bg-white rounded-sm" />
              )}
            </div>
            <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-400" /> EMA
            </div>
          </div>
          {config.ema.enabled && (
            <span className="text-[10px] text-slate-500 font-mono">
              Exponential Moving Average
            </span>
          )}
        </div>

        {config.ema.enabled && (
          <div className="p-3 pt-0 animate-in fade-in slide-in-from-top-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Periods (Comma Separated)
            </label>
            <input
              type="text"
              value={config.ema.periods.join(", ")}
              onChange={(e) =>
                updateEMA({
                  periods: e.target.value
                    .split(",")
                    .map((s) => parseInt(s.trim()))
                    .filter((n) => !isNaN(n)),
                })
              }
              className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-xs"
              placeholder="e.g. 20, 50, 200"
            />
          </div>
        )}
      </div>

      <div className="p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 flex items-center justify-center gap-2 text-slate-500 cursor-not-allowed hover:bg-slate-900/50 transition-colors">
        <Settings2 size={14} />
        <span className="text-xs font-bold">Add Custom Indicator</span>
      </div>
    </div>
  );
}
