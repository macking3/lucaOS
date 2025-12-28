import React from "react";
import { List, Globe, Database, HelpCircle } from "lucide-react";
import { CoinSourceConfig, CoinSourceType } from "../../../types/trading";

interface CoinSourceEditorProps {
  config: CoinSourceConfig;
  onChange: (config: CoinSourceConfig) => void;
}

const STATIC_COINS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "ADAUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "DOTUSDT",
];

export function CoinSourceEditor({ config, onChange }: CoinSourceEditorProps) {
  const handleTypeChange = (type: CoinSourceType) => {
    onChange({ ...config, sourceType: type });
  };

  const toggleStaticCoin = (coin: string) => {
    const current = config.staticCoins || [];
    const updated = current.includes(coin)
      ? current.filter((c) => c !== coin)
      : [...current, coin];
    onChange({ ...config, staticCoins: updated });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Database size={16} className="text-indigo-400" />
          Source Selection
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 bg-[#0b0e14] cursor-pointer hover:border-indigo-500/50 transition-colors">
            <input
              type="radio"
              name="sourceType"
              checked={config.sourceType === CoinSourceType.STATIC}
              onChange={() => handleTypeChange(CoinSourceType.STATIC)}
              className="accent-indigo-500"
            />
            <div className="flex-1">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <List size={14} className="text-slate-400" /> Static List
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Manually select specific pairs to trade.
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 bg-[#0b0e14] cursor-pointer hover:border-indigo-500/50 transition-colors">
            <input
              type="radio"
              name="sourceType"
              checked={config.sourceType === CoinSourceType.AI500}
              onChange={() => handleTypeChange(CoinSourceType.AI500)}
              className="accent-indigo-500"
            />
            <div className="flex-1">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Globe size={14} className="text-emerald-400" /> Global AI
                Scanner
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Dynamically scan top 500 pairs by volume/OI.
              </div>
            </div>
          </label>
        </div>
      </div>

      {config.sourceType === CoinSourceType.STATIC && (
        <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
          <h3 className="text-sm font-bold text-slate-300 mb-3">
            Selected Pairs
          </h3>
          <div className="flex flex-wrap gap-2">
            {STATIC_COINS.map((coin) => (
              <button
                key={coin}
                onClick={() => toggleStaticCoin(coin)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  config.staticCoins?.includes(coin)
                    ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20"
                    : "bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700"
                }`}
              >
                {coin}
              </button>
            ))}
          </div>
        </div>
      )}

      {config.sourceType === CoinSourceType.AI500 && (
        <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
          <h3 className="text-sm font-bold text-slate-300 mb-3">
            Scanner Settings
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Limit
              </label>
              <input
                type="number"
                value={config.limit || 10}
                onChange={(e) =>
                  onChange({ ...config, limit: parseInt(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                  config.useOITop
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-slate-600"
                }`}
                onClick={() =>
                  onChange({ ...config, useOITop: !config.useOITop })
                }
              >
                {config.useOITop && (
                  <div className="w-2 h-2 bg-white rounded-sm" />
                )}
              </div>
              <span className="text-xs text-slate-300">
                Prioritize OI Spikes
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
