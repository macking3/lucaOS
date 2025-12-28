import React, { useState } from "react";
import { DollarSign, Activity, Zap } from "lucide-react";

interface OrderEntryProps {
  themeCardBg: string;
  activeSymbol?: string;
  onPlaceOrder: (order: any) => Promise<void>;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function OrderEntry({
  themeCardBg,
  activeSymbol = "BTC/USDT",
  onPlaceOrder,
  theme,
}: OrderEntryProps) {
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [amount, setAmount] = useState("100");
  const [leverage, setLeverage] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    setIsSubmitting(true);
    try {
      await onPlaceOrder({
        symbol: activeSymbol,
        action: side === "LONG" ? "open_long" : "open_short",
        quantity: parseFloat(amount) / 50000, // Mock calc for BTC size approx
        leverage: parseInt(leverage),
        type: "MARKET",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`${themeCardBg} rounded-lg p-3 flex flex-col gap-3 font-mono`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Zap size={14} style={{ color: theme?.hex || "#fbbf24" }} />
          Quick Trade
        </h3>
        <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">
          {activeSymbol}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Side Selection */}
        <div className="col-span-12 md:col-span-3 flex bg-black/20 rounded p-1">
          <button
            onClick={() => setSide("LONG")}
            className={`flex-1 text-xs font-bold py-1.5 rounded transition-colors ${
              side === "LONG"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            LONG
          </button>
          <button
            onClick={() => setSide("SHORT")}
            className={`flex-1 text-xs font-bold py-1.5 rounded transition-colors ${
              side === "SHORT"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            SHORT
          </button>
        </div>

        {/* Amount Input */}
        <div className="col-span-6 md:col-span-3 relative">
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-slate-500">
            <DollarSign size={12} />
          </div>
          <input
            type="number"
            className="w-full bg-black/20 border border-slate-700 rounded py-1.5 pl-7 pr-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors text-right font-mono"
            style={{
              borderColor: "#334155",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = theme?.hex || "#fbbf24")
            }
            onBlur={(e) => (e.target.style.borderColor = "#334155")}
            placeholder="Amount"
          />
          <span className="absolute inset-y-0 right-7 flex items-center pointer-events-none text-[10px] text-slate-500">
            USDT
          </span>
        </div>

        {/* Leverage Input */}
        <div className="col-span-6 md:col-span-3 flex items-center gap-2 bg-black/20 border border-slate-700 rounded px-2">
          <span className="text-[10px] text-slate-500 uppercase">Lev</span>
          <input
            type="number"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white text-right focus:outline-none py-1.5"
            min="1"
            max="125"
          />
          <span
            className="text-[10px] font-bold"
            style={{ color: theme?.hex || "#fbbf24" }}
          >
            x
          </span>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`col-span-12 md:col-span-3 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${
            isSubmitting
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : side === "LONG"
              ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
              : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
          }`}
        >
          {isSubmitting ? (
            "..."
          ) : (
            <>
              <Activity size={14} />
              PLACE {side}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
