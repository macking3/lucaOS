import React from "react";
import {
  X,
  Bot,
  Activity,
  TrendingUp,
  Shield,
  Zap,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TraderConfigViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  traderData: any;
}

export function TraderConfigViewModal({
  isOpen,
  onClose,
  traderData,
}: TraderConfigViewModalProps) {
  if (!isOpen || !traderData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#161b22] border border-slate-800 rounded-xl shadow-2xl overflow-hidden font-mono"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#0b0e14] flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                {traderData.avatar || "🤖"}
              </div>
              <div className="overflow-hidden">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 truncate">
                  {traderData.trader_name}
                  <span className="px-2 py-0.5 rounded text-[8px] sm:text-[10px] bg-slate-800 border border-slate-700 text-slate-400 flex-shrink-0">
                    VIEW ONLY
                  </span>
                </h2>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 truncate">
                    <Bot size={10} className="sm:w-3 sm:h-3" />{" "}
                    {traderData.ai_model || "GPT-4"}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <img
                      src={`/exchange-icons/${(
                        traderData.exchange || "binance"
                      ).toLowerCase()}.png`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const ex = (
                          traderData.exchange || "binance"
                        ).toLowerCase();
                        if (target.src.endsWith(".png")) {
                          if (["aster", "bitget", "okx"].includes(ex))
                            target.src = `/exchange-icons/${ex}.svg`;
                          else if (ex === "binance")
                            target.src = `/exchange-icons/${ex}.jpg`;
                          else target.style.display = "none";
                        }
                      }}
                      alt={traderData.exchange}
                      className="w-3 h-3 object-contain"
                    />
                    {traderData.exchange || "Binance"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Strategy Section */}
            <div>
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap size={14} /> Active Strategy
              </h3>
              <div className="p-4 rounded-lg bg-[#0b0e14] border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-200">
                    Momentum Trend Follower
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Uses a combination of RSI and MACD to identify trend reversals
                  on the 15m timeframe. Executes aggressively when volume spikes
                  &gt; 200%.
                </p>
              </div>
            </div>

            {/* Risk Settings */}
            <div>
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={14} /> Risk Configuration
              </h3>
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded bg-[#0b0e14] border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">
                    Leverage
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-200">
                    5x Cross
                  </div>
                </div>
                <div className="p-2 sm:p-3 rounded bg-[#0b0e14] border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">
                    Stop Loss
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-200">
                    2.5%
                  </div>
                </div>
                <div className="p-2 sm:p-3 rounded bg-[#0b0e14] border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">
                    Take Profit
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-200">
                    5.0%
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Snapshot */}
            <div>
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp size={14} /> Performance
              </h3>
              <div className="grid grid-cols-2 xs:flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20">
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 uppercase truncate">
                    Total PnL
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-400 truncate">
                    +{traderData.total_pnl_pct}%
                  </div>
                </div>
                <div className="hidden xs:block h-8 w-px bg-slate-700/50"></div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 uppercase truncate">
                    Win Rate
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white truncate">
                    {traderData.win_rate}%
                  </div>
                </div>
                <div className="hidden xs:block h-8 w-px bg-slate-700/50"></div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 uppercase truncate">
                    Trade Count
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white truncate">
                    {traderData.trade_count}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#0b0e14] border-t border-slate-800 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Close Configuration View
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
