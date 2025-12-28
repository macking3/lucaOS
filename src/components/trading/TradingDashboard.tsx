import React, { useState, useEffect } from "react";
import { TrendingUp, LineChart, BarChart, PieChart } from "lucide-react";
import MarketChart from "./dashboard/MarketChart";
import RecentDecisions, { DecisionCycle } from "./dashboard/RecentDecisions";
import PositionsTable, { Position } from "./dashboard/PositionsTable";
import OrderEntry from "./dashboard/OrderEntry";
import { tradingService } from "../../services/tradingService";

interface TradingDashboardProps {
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function TradingDashboard({ theme }: TradingDashboardProps) {
  const themeCardBg = "bg-black/40 border border-slate-800/60 backdrop-blur-sm";

  // State
  const [metrics, setMetrics] = useState({
    totalEquity: 0,
    availableBalance: 0,
    dailyPnL: 0,
    dailyPnLPercent: 0,
    activePositions: 0,
    marginUsage: 0,
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [cycles, setCycles] = useState<DecisionCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Optional: Set up polling or SSE listener here
    const interval = setInterval(loadDashboardData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // 1. Get Exchanges to know which one to query (default to first connected or mock)
      const exchanges = await tradingService.getConnectedExchanges();
      const activeExchange = exchanges[0]?.id || "binance"; // Default

      // 2. Fetch Data in Parallel
      const [balanceData, positionsData, debatesData] = await Promise.all([
        tradingService.getBalance(activeExchange),
        tradingService.getPositions(activeExchange),
        tradingService.getDebates(),
      ]);

      // Real balance is now directly from service
      const realBalance = balanceData || { total: 0, free: 0 };

      // 3. Process Positions
      const activePositions: Position[] = Array.isArray(positionsData)
        ? positionsData
        : [];
      const totalUnrealizedPnL = activePositions.reduce(
        (sum, p) => sum + p.unrealizedPnL,
        0
      );

      // 4. Process Debates (Cycles)
      // Map API debates to DecisionCycle format if needed
      // Assuming API returns format compatible or we map it:
      const processedCycles: DecisionCycle[] = Array.isArray(debatesData)
        ? debatesData.map((d: any) => ({
            id: d.id,
            cycleNumber: d.cycleNumber || 0, // Need backend to send this or calculate
            timestamp: new Date(d.createdAt).toLocaleString(),
            status: d.status === "completed" ? "success" : d.status,
            decisions: d.consensus
              ? [
                  {
                    symbol: d.symbol,
                    action: d.consensus.verdict
                      .toUpperCase()
                      .replace("OPEN_", ""),
                    reasoning: `Confidence: ${d.consensus.confidence}%`,
                  },
                ]
              : [],
            chainOfThought:
              d.messages?.map(
                (m: any) => m.content.substring(0, 100) + "..."
              ) || [],
          }))
        : [];

      // 5. Update State
      setPositions(activePositions);
      setCycles(processedCycles);
      setMetrics({
        totalEquity: realBalance.total || 0,
        availableBalance: realBalance.free || 0,
        dailyPnL: totalUnrealizedPnL, // simplified
        dailyPnLPercent:
          realBalance.total > 0
            ? (totalUnrealizedPnL / realBalance.total) * 100
            : 0,
        activePositions: activePositions.length,
        marginUsage:
          realBalance.total > 0
            ? ((realBalance.total - realBalance.free) / realBalance.total) * 100
            : 0,
      });
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceOrder = async (order: any) => {
    // 1. Get Exchange
    const exchanges = await tradingService.getConnectedExchanges();
    const activeExchange = exchanges[0]?.id || "binance";

    // 2. Execute
    const result = await tradingService.executeOrder(activeExchange, order);

    // 3. Refresh Data
    if (result.success || result.orderId) {
      setTimeout(loadDashboardData, 1000); // Wait for exchange to process
    } else {
      console.error("Order Failed:", result.error);
      alert(`Order Failed: ${result.error}`);
    }
  };

  const handleClosePosition = async (symbol: string) => {
    if (!confirm(`Are you sure you want to close ${symbol}?`)) return;

    const exchanges = await tradingService.getConnectedExchanges();
    const activeExchange = exchanges[0]?.id || "binance";

    const result = await tradingService.closePosition(activeExchange, symbol);

    if (result.success || result.id) {
      setTimeout(loadDashboardData, 1000);
    } else {
      alert(`Close Failed: ${result.error}`);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 font-mono text-slate-200 animate-in fade-in duration-500">
      {/* 1. TOP METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 h-auto sm:h-24 flex-shrink-0">
        {/* Total Equity */}
        <div
          className={`${themeCardBg} rounded-lg p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden`}
        >
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            Total Equity
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {metrics.totalEquity.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}{" "}
              USDT
            </span>
          </div>
          <div
            className={`flex items-center gap-2 text-[10px] font-bold ${
              metrics.dailyPnL >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <TrendingUp size={12} />
            <span>
              {metrics.dailyPnL >= 0 ? "+" : ""}
              {metrics.dailyPnLPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Available Balance */}
        <div
          className={`${themeCardBg} rounded-lg p-3 sm:p-4 flex flex-col justify-between`}
        >
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            Available Balance
          </div>
          <div className="text-xl font-bold text-white">
            {metrics.availableBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}{" "}
            USDT
          </div>
          <div className="text-[10px] text-slate-600">
            {metrics.totalEquity > 0
              ? (
                  (metrics.availableBalance / metrics.totalEquity) *
                  100
                ).toFixed(1)
              : 0}
            % Free
          </div>
        </div>

        {/* Total PnL */}
        <div
          className={`${themeCardBg} rounded-lg p-3 sm:p-4 flex flex-col justify-between`}
        >
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            Total PnL (Open)
          </div>
          <div
            className={`text-xl font-bold flex items-center gap-2 ${
              metrics.dailyPnL >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {metrics.dailyPnL >= 0 ? "+" : ""}
            {metrics.dailyPnL.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}{" "}
            USDT
          </div>
          <div
            className={`text-[10px] ${
              metrics.dailyPnL >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            Realized + Unrealized
          </div>
        </div>

        {/* Positions Summary */}
        <div
          className={`${themeCardBg} rounded-lg p-3 sm:p-4 flex flex-col justify-between`}
        >
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            Positions
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.activePositions}
          </div>
          <div className="text-[10px] text-slate-500">
            Margin: {metrics.marginUsage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 2. MAIN GRID AREA - 2 COLUMN SPLIT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* LEFT COLUMN: Chart + Positions (Stacked) */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-0 lg:pr-1">
          {/* Market Chart Area */}
          <div className="h-[300px] sm:h-[400px] lg:h-[500px] flex-shrink-0">
            <MarketChart themeCardBg={themeCardBg} theme={theme} />
          </div>

          {/* Manual Trade Entry */}
          <div className="flex-shrink-0">
            <OrderEntry
              themeCardBg={themeCardBg}
              activeSymbol={positions[0]?.symbol || "BTC/USDT"}
              onPlaceOrder={handlePlaceOrder}
              theme={theme}
            />
          </div>

          {/* Positions Table Area */}
          <div className="flex-1 min-h-[300px]">
            <PositionsTable
              themeCardBg={themeCardBg}
              positions={positions}
              onClosePosition={handleClosePosition}
              theme={theme}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Recent Decisions (Sticky Container) */}
        <div className="h-full min-h-0">
          <div className="h-full sticky top-0">
            <RecentDecisions
              themeCardBg={themeCardBg}
              cycles={cycles}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
