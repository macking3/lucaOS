import React, { useState } from "react";
import {
  Settings,
  Shield,
  Bell,
  Key,
  Save,
  AlertTriangle,
  Power,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

export default function TradingSettings() {
  const [showKeys, setShowKeys] = useState(false);
  const [riskEnabled, setRiskEnabled] = useState(true);

  // Theme Constants
  const themeBorder = "border-indigo-500";
  const themeText = "text-indigo-400";
  const themeBg = "bg-black/40 border border-slate-800/60 backdrop-blur-sm";

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 font-mono text-slate-200 animate-in fade-in duration-500">
      {/* LEFT SIDEBAR: CATEGORIES */}
      <div className="w-full md:w-64 flex flex-col gap-2">
        <div className="p-4 bg-slate-900/50 rounded-sm mb-2 border border-slate-800">
          <h3 className="font-bold tracking-widest text-sm text-white flex items-center gap-2">
            <Settings size={16} className={themeText} />
            SYSTEM CONFIG
          </h3>
        </div>

        <button
          className={`p-3 rounded-sm flex items-center gap-3 text-xs font-bold transition-all bg-indigo-500/10 text-indigo-300 border border-indigo-500/30`}
        >
          <Shield size={16} />
          RISK PROTOCOLS
        </button>
        <button className="p-3 rounded-sm flex items-center gap-3 text-xs font-bold text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all border border-transparent">
          <Key size={16} />
          API GATEWAYS
        </button>
        <button className="p-3 rounded-sm flex items-center gap-3 text-xs font-bold text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all border border-transparent">
          <Bell size={16} />
          NOTIFICATIONS
        </button>
      </div>

      {/* MAIN CONTENT: SETTINGS FORMS */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-indigo-500/20">
        {/* SECTION 1: RISK MANAGEMENT (PRIORITY) */}
        <div className={`${themeBg} rounded-lg overflow-hidden`}>
          <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" />
              AUTOMATED RISK GUARD
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {riskEnabled ? "Active" : "Bypassed"}
              </span>
              <button
                onClick={() => setRiskEnabled(!riskEnabled)}
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  riskEnabled ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${
                    riskEnabled ? "left-4.5" : "left-0.5"
                  }`}
                ></div>
              </button>
            </div>
          </div>

          <div
            className={`p-4 sm:p-6 space-y-6 ${
              !riskEnabled && "opacity-50 pointer-events-none grayscale"
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Drawdown */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Daily Loss Limit (USDT)
                </label>
                <div className="flex items-center bg-black border border-slate-700 rounded-sm px-3 py-2 focus-within:border-indigo-500 transition-colors">
                  <span className="text-slate-500 mr-2">$</span>
                  <input
                    type="number"
                    defaultValue="500"
                    className="bg-transparent border-none outline-none w-full text-sm font-mono text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-600">
                  Trading halts for 24h if equity drops by this amount.
                </p>
              </div>

              {/* Max Positions */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Max Open Positions
                </label>
                <div className="flex items-center bg-black border border-slate-700 rounded-sm px-3 py-2">
                  <input
                    type="number"
                    defaultValue="5"
                    className="bg-transparent border-none outline-none w-full text-sm font-mono text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-600">
                  Prevents over-exposure across multiple pairs.
                </p>
              </div>
            </div>

            {/* Kill Switch Configuration */}
            <div className="border border-rose-900/30 bg-rose-500/5 rounded p-4 mt-4">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-2 mb-2">
                <AlertTriangle size={14} />
                EMERGENCY PROTOCOLS
              </h4>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="panic"
                  className="accent-rose-500 w-4 h-4"
                  defaultChecked
                />
                <label htmlFor="panic" className="text-xs text-slate-300">
                  Allow "Panic Sell" Voice Command
                </label>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="checkbox"
                  id="liquidate"
                  className="accent-rose-500 w-4 h-4"
                />
                <label htmlFor="liquidate" className="text-xs text-slate-300">
                  Auto-Liquidate on API Disconnect (&gt;30s)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: API KEYS */}
        <div className={`${themeBg} rounded-lg overflow-hidden`}>
          <div className="p-4 border-b border-slate-800 bg-slate-900/30">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Key size={16} className="text-amber-400" />
              EXCHANGE CONNECTIONS
            </h3>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <span className="text-xs font-bold text-white">
                  BINANCE (FUTURES)
                </span>
              </div>
              <button className="text-[10px] text-indigo-400 hover:text-indigo-300 underline">
                Add New Exchange
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                API Key
              </label>
              <div className="flex items-center bg-black border border-slate-700 rounded-sm px-3 py-2">
                <input
                  type={showKeys ? "text" : "password"}
                  value="vmKU...7x92"
                  disabled
                  className="bg-transparent border-none outline-none w-full text-xs font-mono text-slate-400 tracking-widest"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Secret Key
              </label>
              <div className="flex items-center bg-black border border-slate-700 rounded-sm px-3 py-2">
                <input
                  type={showKeys ? "text" : "password"}
                  value="********************************"
                  disabled
                  className="bg-transparent border-none outline-none w-full text-xs font-mono text-slate-400 tracking-widest"
                />
                <button
                  onClick={() => setShowKeys(!showKeys)}
                  className="text-slate-600 hover:text-slate-400"
                >
                  {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800/50">
          <button className="w-full sm:w-auto px-4 py-2 rounded-sm text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            <RefreshCw size={14} />
            RESET DEFAULTS
          </button>
          <button className="w-full sm:w-auto px-6 py-2 rounded-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
            <Save size={14} />
            SAVE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  );
}
