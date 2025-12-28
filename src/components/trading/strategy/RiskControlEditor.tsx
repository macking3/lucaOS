import React from "react";
import { Shield, TrendingDown, Target, Wallet } from "lucide-react";
import { RiskControlConfig } from "../../../types/trading";

interface RiskControlEditorProps {
  config: RiskControlConfig;
  onChange: (config: RiskControlConfig) => void;
}

export function RiskControlEditor({
  config,
  onChange,
}: RiskControlEditorProps) {
  const update = (updates: Partial<RiskControlConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Position Sizing */}
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-indigo-400" /> Sizing & Leverage
        </h3>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Max Positions
            </label>
            <input
              type="number"
              value={config.maxPositions || 3}
              onChange={(e) =>
                update({ maxPositions: parseInt(e.target.value) })
              }
              className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Position Size %
            </label>
            <div className="relative">
              <input
                type="number"
                value={config.positionSizePercent}
                onChange={(e) =>
                  update({ positionSizePercent: parseFloat(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm pr-6"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              BTC/ETH Leverage
            </label>
            <input
              type="number"
              value={config.btcEthLeverage}
              onChange={(e) =>
                update({ btcEthLeverage: parseInt(e.target.value) })
              }
              className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Altcoin Leverage
            </label>
            <input
              type="number"
              value={config.altcoinLeverage}
              onChange={(e) =>
                update({ altcoinLeverage: parseInt(e.target.value) })
              }
              className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Exit Strategy */}
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Shield size={16} className="text-rose-400" /> Exit Rules
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">
                <TrendingDown size={10} /> Stop Loss
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.stopLossPercent}
                  onChange={(e) =>
                    update({ stopLossPercent: parseFloat(e.target.value) })
                  }
                  className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-rose-400 font-bold text-sm pr-6"
                />
                <span className="absolute right-2 top-2 text-xs text-slate-500">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">
                <Target size={10} /> Take Profit
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.takeProfitPercent}
                  onChange={(e) =>
                    update({ takeProfitPercent: parseFloat(e.target.value) })
                  }
                  className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-emerald-400 font-bold text-sm pr-6"
                />
                <span className="absolute right-2 top-2 text-xs text-slate-500">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/50">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Max Drawdown Limit
            </label>
            <div className="relative">
              <input
                type="number"
                value={config.maxDrawdownPercent}
                onChange={(e) =>
                  update({ maxDrawdownPercent: parseFloat(e.target.value) })
                }
                className="w-full bg-black/20 border border-slate-700 rounded px-2 py-1.5 text-white text-sm pr-6"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
