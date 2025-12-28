import React, { useState, useEffect } from "react";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Medal,
  Users,
  Activity,
  RefreshCw,
  Flame,
  Crown,
  BarChart2,
  Swords,
} from "lucide-react";
import { ComparisonChart } from "./ComparisonChart";
import { TraderConfigViewModal } from "./TraderConfigViewModal";
import { AnimatePresence, motion } from "framer-motion";
import { tradingService } from "../../services/tradingService";

interface CompetitionPageProps {
  onClose?: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function CompetitionPage({
  onClose,
  theme,
}: CompetitionPageProps) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState<any>({
    totalTraders: 0,
    totalVolume: "$0M",
    avgROI: 0,
    topPerformer: "-",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">(
    "7d"
  );

  // Theme
  const themeBg = "bg-[#0b0e14]/95 backdrop-blur-md";

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  const refreshLeaderboard = async () => {
    setIsLoading(true);
    try {
      const [data, stats] = await Promise.all([
        tradingService.getLeaderboard(),
        tradingService.getCompetitionStats(),
      ]);
      setLeaderboard(data);
      setLiveStats(stats);
    } catch (e) {
      console.error("Failed to fetch competition data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const getTraderColor = (rank: number) => {
    if (rank === 1) return "#F0B90B";
    if (rank === 2) return "#0ECB81";
    if (rank === 3) return "#3b82f6";
    return "#848E9C";
  };

  const handleTraderClick = (trader: any) => {
    setSelectedTrader(trader);
    setIsModalOpen(true);
  };

  return (
    <div
      className={`fixed inset-0 ${themeBg} z-50 flex flex-col font-mono text-slate-200 overflow-hidden animate-in fade-in duration-300`}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#0b0e14]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div
              className="p-1.5 sm:p-2 rounded-xl shadow-lg border"
              style={{
                background: theme
                  ? `linear-gradient(to br, ${theme.hex}33, ${theme.hex}0d)`
                  : "linear-gradient(to br, rgba(234,179,8,0.2), rgba(234,179,8,0.05))",
                borderColor: theme ? `${theme.hex}33` : "rgba(234,179,8,0.2)",
                boxShadow: theme
                  ? `0 0 20px ${theme.hex}1a`
                  : "0 0 20px rgba(234,179,8,0.1)",
              }}
            >
              <Trophy
                size={20}
                style={{ color: theme?.hex || "#eab308" }}
                className="sm:w-[28px] sm:h-[28px]"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-white flex items-center gap-2">
                WAR__ROOM
                <span
                  className="text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: theme
                      ? `${theme.hex}1a`
                      : "rgba(234,179,8,0.1)",
                    color: theme?.hex || "#eab308",
                    borderColor: theme
                      ? `${theme.hex}33`
                      : "rgba(234,179,8,0.2)",
                  }}
                >
                  SEASON 1
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500">
                Global AI Trading Championship
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="sm:hidden p-2 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            {/* Timeframe Selector */}
            <div className="flex bg-black/40 p-1 rounded border border-slate-800 flex-1 sm:flex-none justify-between sm:justify-start">
              {(["24h", "7d", "30d", "all"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 rounded text-[8px] sm:text-[10px] font-bold uppercase transition-all ${
                    timeframe === tf
                      ? "bg-slate-700 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshLeaderboard}
                disabled={isLoading}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : "sm:w-4 sm:h-4"}
                />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="hidden sm:block p-2 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
          {[
            {
              label: "Active Agents",
              value: liveStats.totalTraders,
              icon: Users,
              color: "text-indigo-400",
            },
            {
              label: "Total Volume",
              value: liveStats.totalVolume,
              icon: BarChart2,
              color: "text-emerald-400",
            },
            {
              label: "Avg ROI",
              value: `${(liveStats.avgROI || 0).toFixed(1)}%`,
              icon: TrendingUp,
              color: "text-cyan-400",
            },
            {
              label: "Top Alpha",
              value: liveStats.topPerformer,
              icon: Flame,
              color: "text-amber-400",
              style: { color: theme?.hex || "#fbbf24" },
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-[#1e2329]/50 border border-slate-800 p-2 sm:p-3 rounded flex items-center justify-between"
            >
              <div className="overflow-hidden">
                <div className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase truncate">
                  {stat.label}
                </div>
                <div
                  className={`text-sm sm:text-lg font-bold truncate`}
                  style={
                    (stat as any).style || {
                      color: stat.color.replace("text-", ""),
                    }
                  }
                >
                  {stat.value}
                </div>
              </div>
              <stat.icon
                size={16}
                className={`flex-shrink-0 sm:w-5 sm:h-5`}
                style={(stat as any).style}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#0b0e14]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          {/* Left: Performance Chart */}
          <div className="flex flex-col gap-6">
            <div className="p-5 rounded-xl border border-slate-800 bg-[#1e2329]/30 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity
                    size={18}
                    style={{ color: theme?.hex || "#eab308" }}
                  />
                  <h2 className="text-lg font-bold text-white">
                    Performance Matrix
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  LIVE UPDATES
                </span>
              </div>
              <ComparisonChart traders={leaderboard} />
            </div>
          </div>

          {/* Right: Leaderboard List */}
          <div className="p-3 sm:p-5 rounded-xl border border-slate-800 bg-[#1e2329]/30 overflow-hidden flex flex-col h-[350px] sm:h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown size={18} style={{ color: theme?.hex || "#eab308" }} />
                <h2 className="text-lg font-bold text-white">Top Agents</h2>
              </div>
              <div className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-500 rounded border border-green-500/20 animate-pulse">
                MARKET LIVE
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {leaderboard.map((trader, idx) => (
                <div
                  key={trader.trader_id}
                  onClick={() => handleTraderClick(trader)}
                  className={`
                                p-3 rounded-lg cursor-pointer transition-all duration-200 border group
                                ${
                                  selectedTrader?.trader_id === trader.trader_id
                                    ? "bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                                    : "bg-[#0b0e14] border-slate-800/50 hover:bg-slate-800/50 hover:border-slate-700 hover:translate-x-1"
                                }
                            `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-6 font-mono font-bold text-sm"
                        style={{ color: getTraderColor(trader.rank) }}
                      >
                        #{trader.rank}
                      </div>
                      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-lg shadow-inner">
                        {trader.avatar}
                      </div>
                      <div>
                        <div
                          className="font-bold text-slate-200 text-sm group-hover:text-amber-400 transition-colors"
                          style={
                            { "--hover-color": theme?.hex || "#fbbf24" } as any
                          }
                        >
                          {trader.trader_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {trader.win_rate}% WR • {trader.trade_count} Trades
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-sm ${
                          trader.total_pnl_pct >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {trader.total_pnl_pct >= 0 ? "+" : ""}
                        {trader.total_pnl_pct.toFixed(2)}%
                      </div>
                      {trader.streak > 0 && (
                        <div
                          className="text-[10px] flex justify-end items-center gap-1"
                          style={{ color: theme?.hex || "#eab308" }}
                        >
                          <Flame size={10} /> {trader.streak}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HEAD-TO-HEAD BATTLE SECTION */}
        <div className="mt-6 p-6 rounded-xl border border-slate-800 bg-[#161b22] relative overflow-hidden">
          {/* Background Effects */}
          <div
            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-transparent to-transparent"
            style={{
              backgroundImage: `linear-gradient(to right, transparent, ${
                theme?.hex || "#eab308"
              }4d, transparent)`,
            }}
          ></div>

          <div className="flex items-center gap-2 mb-6 relative z-10">
            <Swords size={20} className="text-rose-500" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Head-to-Head Battle
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {leaderboard.slice(0, 2).map((trader, i) => {
              const isFirst = i === 0;
              const opponent = leaderboard[i === 0 ? 1 : 0];
              const gap = (
                trader.total_pnl_pct - opponent?.total_pnl_pct || 0
              ).toFixed(2);

              return (
                <div
                  key={trader.trader_id}
                  className={`p-6 rounded-xl border relative transition-all hover:scale-[1.01]`}
                  style={
                    isFirst
                      ? {
                          background: theme
                            ? `linear-gradient(to br, ${theme.hex}1a, transparent)`
                            : "linear-gradient(to br, rgba(234,179,8,0.1), transparent)",
                          borderColor: theme
                            ? `${theme.hex}4d`
                            : "rgba(234,179,8,0.3)",
                        }
                      : {
                          backgroundColor: "#0b0e14",
                          borderColor: "#1e293b",
                        }
                  }
                >
                  {isFirst && (
                    <div className="absolute top-3 right-3 text-yellow-500">
                      <Crown size={20} />
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{trader.avatar}</div>
                    <div>
                      <div
                        className={`text-xl font-bold`}
                        style={
                          isFirst
                            ? { color: theme?.hex || "#eab308" }
                            : { color: "#e2e8f0" }
                        }
                      >
                        {trader.trader_name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                        {trader.exchange} • {trader.ai_model}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-700/50 pt-4">
                    <div>
                      <div className="text-xs text-slate-500 uppercase mb-1">
                        Total Return
                      </div>
                      <div
                        className={`text-2xl font-bold font-mono ${
                          trader.total_pnl_pct >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {trader.total_pnl_pct >= 0 ? "+" : ""}
                        {trader.total_pnl_pct.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      {isFirst ? (
                        <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                          LEADING BY +{gap}%
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded">
                          BEHIND BY {Math.abs(Number(gap)).toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trader Details Modal */}
      <TraderConfigViewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        traderData={selectedTrader}
      />
    </div>
  );
}
