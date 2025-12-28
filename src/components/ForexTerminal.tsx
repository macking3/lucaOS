import React, { useEffect, useState } from "react";
import { ForexAccount, ForexTradeLog } from "../types";
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  BarChart3,
  Briefcase,
  Plus,
  Sparkles,
} from "lucide-react";
import ConnectForexAccountModal from "./ConnectForexAccountModal";

import { useAppContext } from "../context/AppContext";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const ForexTerminal: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-emerald-500";
  const themeBorder = theme?.border || "border-emerald-500";
  const themeBg = theme?.bg || "bg-emerald-950/10";
  const themeHex = theme?.hex || "#10b981";
  const { trading } = useAppContext();
  const { forexAccount: account, forexTrades: trades } = trading;
  const [pairs, setPairs] = useState<
    { symbol: string; rate: number; change: number }[]
  >([]);
  const [isRealData, setIsRealData] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Fetch forex rates (only if needed, reduce frequency)
  useEffect(() => {
    // Skip rate fetching for now - not needed for basic functionality
    // Can add back later with proper rate endpoint
  }, []);

  // Check forex account status ONCE on mount (don't poll)
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(apiUrl("/api/forex/status"));
        if (res.ok) {
          const data = await res.json();
          // Only fetch account if connected
          if (data.connected && data.broker) {
            const accRes = await fetch(apiUrl("/api/forex/account"));
            if (accRes.ok) {
              const { account: accountData } = await accRes.json();
              const normalized: ForexAccount = {
                accountId: accountData.accountNumber || "FOREX_DEMO",
                baseCurrency: accountData.currency,
                balance: accountData.balance,
                equity: accountData.equity,
                margin: accountData.margin,
                freeMargin: accountData.freeMargin,
                leverage: accountData.leverage,
                positions: [],
              };
              trading.setForexAccount(normalized);
            }
          }
        }
      } catch (error) {
        // Silently fail - no account connected yet
      }
    };

    checkStatus();
  }, [trading]);

  // Handle successful broker connection
  const handleConnectSuccess = async (data: any) => {
    console.log("[ForexTerminal] Account connected:", data);
    try {
      // Activate the new account
      await fetch(apiUrl("/api/forex/accounts/activate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultKey: data.vaultKey }),
      });

      // Reload account data
      const res = await fetch(apiUrl("/api/forex/account"));
      if (res.ok) {
        const { account: accountData } = await res.json();
        const normalized = {
          accountId: accountData.accountNumber || "FOREX_DEMO",
          balance: accountData.balance,
          equity: accountData.equity,
          margin: accountData.margin,
          freeMargin: accountData.freeMargin,
          baseCurrency: accountData.currency,
          leverage: accountData.leverage,
          positions: [],
        };
        trading.setForexAccount(normalized);
      }
    } catch (err) {
      console.error("[ForexTerminal] Failed to activate account:", err);
    }
  };

  // Lazy Load Positions (Real-time updates every 5s)
  useEffect(() => {
    const loadPositions = async () => {
      try {
        const res = await fetch(apiUrl("/api/forex/positions"));
        if (res.ok) {
          const { positions: data } = await res.json();
          if (account && data.length > 0) {
            trading.setForexAccount({
              ...account,
              positions: data.map((p: any) => ({
                id: p.ticket.toString(),
                pair: p.symbol,
                type: p.type === "BUY" ? "LONG" : "SHORT",
                lots: p.lots,
                entryPrice: p.openPrice,
                currentPrice: p.currentPrice,
                pnl: p.profit,
              })),
            });
          }
        }
      } catch (error) {
        console.warn("[ForexTerminal] Failed to load positions:", error);
      }
    };

    if (account) {
      loadPositions();
      const interval = setInterval(loadPositions, 5000); // Update every 5s
      return () => clearInterval(interval);
    }
  }, [account, trading]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`relative w-full md:w-[90%] max-w-5xl h-full md:h-[82vh] bg-black border ${themeBorder}/30 md:rounded-lg flex flex-col overflow-hidden`}
        style={{
          boxShadow: `0 0 40px ${themeHex}1a`,
        }}
      >
        {/* Institutional Header */}
        <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 md:gap-2 ${themePrimary} font-bold tracking-widest text-xs md:text-sm`}
            >
              <Globe size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">INSTITUTIONAL FX DESK</span>
              <span className="sm:hidden">FX DESK</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div className="text-xs font-mono text-slate-400">
              {account
                ? `LEVERAGE: 1:${account.leverage} | ${account.baseCurrency}`
                : "DISCONNECTED"}
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 md:rounded-lg ${
                isRealData
                  ? `${themeBg} ${themePrimary}`
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {isRealData ? "LIVE" : "DEMO MODE"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Disconnected State - Glassmorphic Connect UI */}
        {!account && (
          <div className="flex-1 flex items-center justify-center p-4 md:p-12 relative overflow-hidden">
            {/* Animated background gradient */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${themeHex} 0%, transparent 70%)`,
              }}
            />

            <div className="relative text-center max-w-2xl animate-in fade-in zoom-in-95 duration-500">
              {/* Icon with glassmorphic container */}
              <div
                className={`inline-flex p-6 md:p-8 rounded-3xl ${themeBg} border-2 ${themeBorder}/30 mb-6 md:mb-8
                          backdrop-blur-xl shadow-2xl relative group`}
                style={{
                  boxShadow: `0 0 60px ${themeHex}20`,
                }}
              >
                {/* Glass shine effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent opacity-50" />

                <Briefcase
                  size={72}
                  className={`${themePrimary} relative z-10 group-hover:scale-110 transition-transform duration-300`}
                />

                {/* Animated rings */}
                <div
                  className={`absolute inset-0 rounded-3xl border-2 ${themeBorder}/20 animate-ping`}
                  style={{ animationDuration: "3s" }}
                />
              </div>

              <h3 className="text-xl md:text-3xl font-display font-bold text-white mb-3 md:mb-4 tracking-tight px-2">
                NO FOREX ACCOUNT CONNECTED
              </h3>

              <p className="text-slate-400 text-sm md:text-base mb-6 md:mb-8 leading-relaxed max-w-lg mx-auto px-2">
                Connect your preferred forex broker to start institutional-grade
                trading with LUCA.
                <br />
                <span className={`font-semibold ${themePrimary}`}>
                  8 major brokers supported
                </span>
                {" • "}
                <span className="text-slate-500">
                  Deriv, Exness, XM, IC Markets & more
                </span>
              </p>

              {/* Connect Button - Premium glassmorphic */}
              <button
                onClick={() => setShowConnectModal(true)}
                className={`group relative px-6 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg text-white
                          bg-gradient-to-r ${themeBg} border-2 ${themeBorder}
                          hover:scale-105 active:scale-95
                          transition-all duration-300
                          shadow-2xl hover:shadow-[0_0_40px_${themeHex}40]
                          overflow-hidden`}
                style={{
                  boxShadow: `0 0 40px ${themeHex}30, 0 10px 30px -10px rgba(0,0,0,0.5)`,
                }}
              >
                {/* Animated background gradient */}
                <div
                  className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${themeHex}40 0%, transparent 100%)`,
                  }}
                />

                {/* Glass shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />

                <span className="relative z-10 flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 rounded-lg bg-white/10">
                    <Plus size={20} className="md:w-6 md:h-6" />
                  </div>
                  Connect Forex Broker
                  <Sparkles size={16} className="md:w-5 md:h-5 animate-pulse" />
                </span>
              </button>

              {/* Feature Pills */}
              <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-2 md:gap-3 px-2">
                {["🎲 Deriv", "⚡ Exness", "🌍 XM", "⚙️ IC Markets"].map(
                  (broker, i) => (
                    <div
                      key={i}
                      className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-slate-800/50 backdrop-blur-sm
                             border border-slate-700/50 text-[11px] md:text-xs font-medium text-slate-400
                             hover:border-slate-600 hover:text-slate-300 transition-all
                             cursor-default"
                    >
                      {broker}
                    </div>
                  )
                )}
                <div
                  className="px-4 py-2 rounded-xl bg-slate-800/50 backdrop-blur-sm
                              border border-slate-700/50 text-xs font-medium text-slate-400"
                >
                  +4 more
                </div>
              </div>

              <div className="mt-8 text-xs text-slate-500 font-mono">
                🔒 Credentials encrypted with AES-256 • 🌍 Global brokers
              </div>
            </div>
          </div>
        )}

        {/* Connected State */}
        {account && (
          <div className="flex-1 flex">
            {/* Left: Quotes Panel */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
              <div className="p-3 text-[10px] font-bold text-slate-500 tracking-wider bg-slate-950">
                MARKET WATCH
              </div>
              <div className="flex-1 overflow-y-auto">
                {pairs.map((pair) => (
                  <div
                    key={pair.symbol}
                    className="flex justify-between items-center p-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-emerald-400">
                        {pair.symbol}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Spread: {isRealData ? "REAL" : "0.2"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold ${
                          pair.change >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {pair.rate.toFixed(4)}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] opacity-60">
                        {pair.change >= 0 ? (
                          <TrendingUp size={10} />
                        ) : (
                          <TrendingDown size={10} />
                        )}
                        {Math.abs(pair.change).toFixed(4)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center: Main Chart & Terminal */}
            <div className="flex-1 flex flex-col bg-[#0b1120]">
              {/* Fake Chart Area */}
              <div className="flex-1 relative overflow-hidden border-b border-slate-800 p-4">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                <div className="absolute top-4 left-4 text-emerald-500/50 font-mono text-xs">
                  CHART FEED: EURUSD [M15]
                </div>

                {/* Animated Candles Simulation */}
                <div className="flex items-end justify-end gap-1 h-full opacity-50 pb-8">
                  {Array.from({ length: 40 }).map((_, i) => {
                    const height = Math.random() * 60 + 10;
                    const isGreen = Math.random() > 0.4;
                    return (
                      <div
                        key={i}
                        className="w-4 flex flex-col items-center justify-end group"
                      >
                        <div
                          className={`w-px h-4 ${
                            isGreen ? "bg-emerald-600" : "bg-red-600"
                          }`}
                        ></div>
                        <div
                          className={`w-full ${
                            isGreen ? "bg-emerald-500/80" : "bg-red-500/80"
                          }`}
                          style={{ height: `${height}%` }}
                        ></div>
                        <div
                          className={`w-px h-4 ${
                            isGreen ? "bg-emerald-600" : "bg-red-600"
                          }`}
                        ></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom: Account & Trade Panel */}
              <div className="h-64 bg-slate-900 flex flex-col">
                {/* Account Stats Bar */}
                <div className="h-10 bg-slate-950 border-b border-slate-800 flex items-center px-4 gap-8 text-xs font-mono text-slate-400">
                  <div>
                    BALANCE:{" "}
                    <span className="text-white font-bold">
                      ${account.balance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    EQUITY:{" "}
                    <span className="text-emerald-400 font-bold">
                      ${account.equity.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    MARGIN:{" "}
                    <span className="text-slate-300">
                      ${account.margin.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    FREE MARGIN:{" "}
                    <span className="text-slate-300">
                      ${account.freeMargin.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                  <div className="px-4 py-2 text-xs font-bold bg-slate-800 text-emerald-500 border-t-2 border-emerald-500">
                    TRADE
                  </div>
                  <div className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-800 cursor-pointer">
                    HISTORY
                  </div>
                  <div className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-800 cursor-pointer">
                    JOURNAL
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-7 px-4 py-2 text-[10px] font-bold text-slate-500 bg-slate-950/50 border-b border-slate-800">
                  <div>TICKET</div>
                  <div>TIME</div>
                  <div>TYPE</div>
                  <div>VOLUME</div>
                  <div>SYMBOL</div>
                  <div>PRICE</div>
                  <div className="text-right">PROFIT</div>
                </div>

                {/* Active Trades & History List */}
                <div className="flex-1 overflow-y-auto font-mono text-xs">
                  {/* Active Positions */}
                  {account.positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="grid grid-cols-7 px-4 py-2 border-b border-slate-800 bg-slate-800/20 hover:bg-slate-800/40"
                    >
                      <div>#{pos.id.substring(0, 6)}</div>
                      <div className="text-slate-400">OPEN</div>
                      <div
                        className={
                          pos.type === "LONG"
                            ? "text-emerald-500"
                            : "text-red-500"
                        }
                      >
                        {pos.type}
                      </div>
                      <div>{pos.lots}</div>
                      <div className="font-bold">{pos.pair}</div>
                      <div>{pos.entryPrice}</div>
                      <div
                        className={`text-right font-bold ${
                          pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {pos.pnl.toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {/* History Log */}
                  {trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="grid grid-cols-7 px-4 py-2 border-b border-slate-800 opacity-60 hover:opacity-100"
                    >
                      <div>#{trade.ticket}</div>
                      <div>
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </div>
                      <div
                        className={
                          trade.type === "BUY"
                            ? "text-emerald-500"
                            : "text-red-500"
                        }
                      >
                        {trade.type}
                      </div>
                      <div>{trade.lots}</div>
                      <div className="font-bold">{trade.pair}</div>
                      <div>{trade.price}</div>
                      <div className="text-right text-slate-500">-</div>
                    </div>
                  ))}

                  {trades.length === 0 && account.positions.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-slate-600 italic">
                      No active orders.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connect Forex Account Modal */}
      <ConnectForexAccountModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleConnectSuccess}
        theme={theme}
      />
    </div>
  );
};

export default ForexTerminal;
