import React from "react";
import { BarChart2 } from "lucide-react";

export interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  liquidationPrice: number;
  unrealizedPnL: number;
  pnlPercent: number;
  collateral?: number;
}

interface PositionsTableProps {
  themeCardBg?: string;
  positions: Position[];
  onClosePosition?: (symbol: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function PositionsTable({
  themeCardBg = "bg-black/40 border border-slate-800/60 backdrop-blur-sm",
  positions = [],
  onClosePosition,
  theme,
}: PositionsTableProps) {
  return (
    <div
      className={`${themeCardBg} rounded-lg flex flex-col h-full overflow-hidden`}
    >
      <div className="p-3 border-b border-slate-800/60 flex justify-between items-center bg-black/20">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <BarChart2 size={16} style={{ color: theme?.hex || "#fbbf24" }} />
          Current Positions
        </h3>
        <span
          className="text-[10px] font-bold border px-2 py-0.5 rounded-sm"
          style={{
            backgroundColor: theme ? `${theme.hex}33` : "rgba(234,179,8,0.2)",
            color: theme?.hex || "#fbbf24",
            borderColor: theme ? `${theme.hex}4d` : "rgba(234,179,8,0.3)",
          }}
        >
          {positions.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2">
            <BarChart2 size={24} className="opacity-20" />
            <span>No open positions</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="text-[10px] font-bold text-slate-500 bg-slate-900/30 sticky top-0 z-10">
              <tr>
                <th className="p-3 font-normal tracking-wider">SYMBOL</th>
                <th className="p-3 font-normal tracking-wider text-center">
                  SIDE
                </th>
                <th className="p-3 font-normal tracking-wider text-right">
                  ENTRY
                </th>
                <th className="p-3 font-normal tracking-wider text-right">
                  MARK
                </th>
                <th className="p-3 font-normal tracking-wider text-right">
                  SIZE
                </th>
                <th className="p-3 font-normal tracking-wider text-right">
                  VALUE
                </th>
                <th className="p-3 font-normal tracking-wider text-center">
                  LEV
                </th>
                <th className="p-3 font-normal tracking-wider text-right">
                  PNL (ROE)
                </th>
                <th className="p-3 font-normal tracking-wider text-right">
                  LIQ. PRICE
                </th>
                <th className="p-3 font-normal tracking-wider text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {positions.map((pos) => (
                <tr
                  key={pos.id}
                  className="border-b border-slate-800/50 hover:bg-white/5 transition-colors group"
                >
                  <td className="p-3 font-bold text-slate-200">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1 h-3 rounded-full ${
                          pos.side === "LONG" ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      ></div>
                      {pos.symbol}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        pos.side === "LONG"
                          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                      }`}
                    >
                      {pos.side}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    {pos.entryPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {pos.markPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    {pos.size.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-slate-200 font-bold">
                    {/* Calculate Position Value approx: Size * Mark (simplified) */}
                    {(pos.size * pos.markPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    USDT
                  </td>
                  <td
                    className="p-3 text-center font-bold"
                    style={{ color: theme?.hex || "#fbbf24" }}
                  >
                    {pos.leverage}x
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-bold ${
                          pos.unrealizedPnL >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {pos.unrealizedPnL >= 0 ? "+" : ""}
                        {pos.unrealizedPnL.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] ${
                          pos.pnlPercent >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        ({pos.pnlPercent}%)
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right text-slate-500">
                    {pos.liquidationPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onClosePosition?.(pos.symbol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 text-[10px] px-2 py-1 rounded border border-rose-500/30"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
