import React, { useEffect, useState } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Newspaper,
  DollarSign,
  PieChart,
} from "lucide-react";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  initialSymbol?: string;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const StockTerminal: React.FC<Props> = ({ onClose, initialSymbol, theme }) => {
  const themePrimary = theme?.primary || "text-emerald-500";
  const themeBorder = theme?.border || "border-emerald-500";
  const themeBg = theme?.bg || "bg-emerald-950/10";
  const themeHex = theme?.hex || "#10b981";
  const [symbol, setSymbol] = useState(initialSymbol || "AAPL");
  const [stockData, setStockData] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel fetch
      const [stockRes, newsRes] = await Promise.all([
        fetch(apiUrl(`/api/finance/stock/${symbol}`)),
        fetch(apiUrl("/api/finance/news")),
      ]);

      if (stockRes.ok) {
        const data = await stockRes.json();
        setStockData(data || null);
      }

      if (newsRes.ok) {
        const data = await newsRes.json();
        if (Array.isArray(data)) {
          setNews(data);
        } else if (
          data &&
          typeof data.news === "object" &&
          data.news !== null
        ) {
          if (Array.isArray(data.news)) {
            setNews(data.news);
          } else {
            setNews(Object.values(data.news));
          }
        } else {
          setNews([]);
        }
      } else {
        setNews([]);
      }
    } catch (e) {
      console.error("Stock Data Fetch Failed", e);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-300 font-mono p-0 sm:p-4 overflow-hidden">
      <div
        className={`relative w-full h-full sm:h-[85vh] sm:w-[95%] max-w-sm sm:max-w-2xl lg:max-w-6xl bg-black/60 backdrop-blur-xl border-none sm:border ${themeBorder}/30 rounded-none sm:rounded-lg flex flex-col overflow-hidden shadow-2xl shadow-emerald-500/10`}
        style={{
          boxShadow: `0 0 50px ${themeHex}1a`,
        }}
      >
        {/* Header */}
        <div
          className={`h-16 flex-shrink-0 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-4 sm:px-6 relative z-30`}
        >
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div
              className={`p-1.5 sm:p-2 ${themeBg} rounded border ${themeBorder}/30 ${themePrimary} flex-shrink-0`}
            >
              <Activity size={18} className="sm:size-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-display text-base sm:text-xl font-bold text-white tracking-widest truncate uppercase">
                EQUITY INTELLIGENCE
              </h2>
              <div
                className={`text-[9px] sm:text-[10px] font-mono ${themePrimary} flex gap-2 sm:gap-4 truncate`}
              >
                <span>STATUS: {stockData?.status || "INIT"}</span>
                <span className="hidden sm:inline">EXCHANGE: NASDAQ/NYSE</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 p-2 text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <X size={20} className="sm:size-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left: Ticker & Stats */}
          {/* Left: Ticker & Stats */}
          <div
            className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r ${themeBorder}/30 bg-black/40 flex flex-col p-4 sm:p-6`}
          >
            <div className="mb-4 sm:mb-6 relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                className={`w-full bg-slate-900 border border-slate-700 rounded p-2.5 sm:p-3 pl-4 text-lg sm:text-xl font-bold text-white outline-none tracking-widest focus:${themeBorder}`}
                placeholder="TICKER"
              />
              <button
                onClick={fetchData}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${themePrimary}`}
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {stockData ? (
              <div className="space-y-6">
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-white">
                    ${stockData.price}
                  </div>
                  <div
                    className={`flex items-center gap-2 text-xs sm:text-sm font-bold ${
                      parseFloat(stockData.change) >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    }`}
                  >
                    {parseFloat(stockData.change) >= 0 ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    {stockData.change} ({stockData.changePercent})
                  </div>
                </div>

                <div
                  className={`space-y-3 text-xs text-slate-400 border-t ${themeBorder}/30 pt-4`}
                >
                  <div className="flex justify-between">
                    <span>OPEN</span>
                    <span className="text-white">{stockData.open}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HIGH</span>
                    <span className="text-white">{stockData.high}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LOW</span>
                    <span className="text-white">{stockData.low}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VOL</span>
                    <span className="text-white">{stockData.volume}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MKT CAP</span>
                    <span className="text-white">{stockData.marketCap}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P/E</span>
                    <span className="text-white">{stockData.peRatio}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-600 text-xs italic mt-10">
                Enter a ticker to load data.
              </div>
            )}
          </div>

          {/* Center: Chart (Simulated) */}
          <div className="flex-1 bg-black relative flex flex-col min-h-[300px] lg:min-h-0">
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            <div className="flex-1 flex items-end px-4 sm:px-10 pb-10 gap-1">
              {Array.from({ length: 60 }).map((_, i) => {
                const h = Math.random() * 60 + 10;
                const isGreen = Math.random() > 0.45;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end group relative"
                  >
                    <div
                      className={`w-1 mx-auto h-full ${
                        isGreen ? "bg-emerald-800" : "bg-red-900"
                      } opacity-30 group-hover:opacity-100`}
                    ></div>
                    <div
                      className={`w-full ${
                        isGreen ? "bg-emerald-500" : "bg-red-500"
                      } hover:brightness-125 transition-all`}
                      style={{ height: `${h}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: News Feed */}
          <div
            className={`w-full lg:w-80 border-t lg:border-t-0 lg:border-l ${themeBorder}/30 bg-[#050505] flex flex-col h-48 sm:h-64 lg:h-auto`}
          >
            <div
              className={`p-3 sm:p-4 border-b ${themeBorder}/30 text-[10px] sm:text-xs font-bold ${themePrimary} tracking-widest flex items-center gap-2 flex-shrink-0`}
            >
              <Newspaper size={12} className="sm:size-3.5" /> MARKET WIRE
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 sm:space-y-4">
              {news.map((item, i) => (
                <div key={i} className="group cursor-pointer">
                  <div
                    className={`text-[9px] sm:text-[10px] ${themePrimary} mb-0.5 sm:mb-1 flex justify-between opacity-70`}
                  >
                    <span>{item.source}</span>
                    <span>{item.time}</span>
                  </div>
                  <div
                    className={`text-[11px] sm:text-xs text-slate-300 font-bold transition-colors leading-snug group-hover:${themePrimary}`}
                  >
                    {item.title}
                  </div>
                  <div
                    className={`h-px w-full ${themeBorder}/20 mt-2 sm:mt-3`}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTerminal;
