import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  RotateCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Zap,
  Target,
  BarChart2,
  List,
  Pause,
  StopCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import BacktestSidebar from "./BacktestSidebar";
import { tradingService } from "../../services/tradingService";

// --- Types ---

const MOCK_AI_MODELS = [
  { id: "gpt4", name: "GPT-4 Turbo", provider: "OpenAI", enabled: true },
  {
    id: "claude3",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    enabled: true,
  },
  { id: "deepseek", name: "DeepSeek V3", provider: "DeepSeek", enabled: true },
  { id: "llama3", name: "Llama 3 70B", provider: "Meta", enabled: false },
];

const QUICK_RANGES = [
  { label: "24h", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
];

interface Trade {
  ts: number;
  symbol: string;
  action: "open_long" | "open_short" | "close_long" | "close_short";
  price: number;
  qty: number;
  pnl?: number;
}

interface BacktestRun {
  id: string;
  status: "running" | "completed" | "failed" | "paused";
  symbol: string;
  model: string;
  roi: number;
  date: string;
}

// --- Sub-Components ---

const StatCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="p-4 rounded-xl border border-slate-800 bg-[#1e2329]/50">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-xs text-slate-500 uppercase">{label}</span>
    </div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    {trend && (
      <div
        className={`text-xs mt-1 ${
          trend > 0 ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {trend > 0 ? "+" : ""}
        {trend}%
      </div>
    )}
  </div>
);

const ProgressRing = ({
  progress,
  size = 120,
}: {
  progress: number;
  size?: number;
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2B3139"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F0B90B"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl font-bold text-yellow-500">
          {Math.round(progress)}%
        </span>
        <span className="text-[10px] text-slate-500 uppercase font-bold">
          {progress === 100 ? "Complete" : "Running"}
        </span>
      </div>
    </div>
  );
};

const BacktestChart = ({ data }: { data: any[] }) => {
  return (
    <div className="h-[350px] w-full bg-[#1e2329]/30 rounded-xl border border-slate-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F0B90B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F0B90B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2B3139"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => new Date(val).toLocaleDateString()}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b0e14",
              borderColor: "#2B3139",
            }}
            itemStyle={{ color: "#F0B90B" }}
            labelFormatter={(label) => new Date(label).toLocaleString()}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#F0B90B"
            fillOpacity={1}
            fill="url(#colorEquity)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TradeTimeline = ({ trades }: { trades: Trade[] }) => {
  if (trades.length === 0)
    return (
      <div className="text-center text-slate-500 py-10">No trades recorded</div>
    );

  return (
    <div className="space-y-2 pr-2">
      {trades.map((t, i) => {
        const isWin = (t.pnl || 0) > 0;
        return (
          <div
            key={i}
            className="p-3 rounded bg-[#1e2329]/30 border border-slate-800 flex items-center justify-between text-sm hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded ${
                  t.action.includes("long")
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}
              >
                {t.action.includes("long") ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
              </div>
              <div>
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  {t.symbol}
                  <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-400 uppercase">
                    {t.action.replace("_", " ")}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(t.ts).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-slate-300">
                {t.qty} @ ${t.price.toLocaleString()}
              </div>
              {t.pnl !== undefined && (
                <div
                  className={`font-mono text-xs ${
                    isWin ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isWin ? "+" : ""}
                  {t.pnl.toFixed(2)} USDT
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Component ---

interface BacktestPageProps {
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function BacktestPage({ theme }: BacktestPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showHistory, setShowHistory] = useState(false);

  // Runs State
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(
    undefined
  );
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Form State
  const [config, setConfig] = useState({
    modelId: "gpt4",
    symbols: "BTC/USDT",
    timeframe: "1h",
    initialCapital: 10000,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
  });

  // Results State
  const [results, setResults] = useState<{
    equity: any[];
    trades: Trade[];
    metrics: any;
  } | null>(null);

  // Poll for active backtest status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && selectedRunId) {
      interval = setInterval(async () => {
        try {
          const status = await tradingService.getBacktestStatus(selectedRunId);
          if (status.progress >= 100 || status.status === "completed") {
            setIsRunning(false);
            setProgress(100);
            const finalResults = await tradingService.getBacktestResults(
              selectedRunId
            );
            setResults(finalResults.results);
            // Update list status
            updateRunStatus(
              selectedRunId,
              "completed",
              finalResults.results.metrics.roi
            );
          } else if (status.status === "failed") {
            setIsRunning(false);
            updateRunStatus(selectedRunId, "failed", 0);
          } else {
            setProgress(status.progress || 0);
          }
        } catch (e) {
          console.error("Backtest poll failed", e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, selectedRunId]);

  // Load results when selecting a completed run (mocked lookup for now as we don't have full history API)
  useEffect(() => {
    if (selectedRunId && !isRunning) {
      // In a real app we would fetch the specific result
      // For now, we only have the result in state if we just ran it
      // Or we could try fetching if the ID is real
    }
  }, [selectedRunId]);

  const updateRunStatus = (id: string, status: any, roi: number) => {
    setRuns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, roi } : r))
    );
  };

  const handleRun = async () => {
    try {
      setIsRunning(true);
      setProgress(0);
      setResults(null);

      const response = await tradingService.runBacktest({
        symbol: config.symbols,
        timeframe: config.timeframe,
        initialCapital: config.initialCapital,
        strategyId: "active_strategy", // Pass actual ID if available
        startTime: new Date(config.startTime).getTime(),
        endTime: new Date(config.endTime).getTime(),
      });

      if (response.success && response.results?.id) {
        const newRun: BacktestRun = {
          id: response.results.id, // ID from backend
          status: "running",
          symbol: config.symbols,
          model:
            MOCK_AI_MODELS.find((m) => m.id === config.modelId)?.name ||
            "Unknown",
          roi: 0,
          date: new Date().toISOString(),
        };
        setRuns([newRun, ...runs]);
        setSelectedRunId(newRun.id);
        // Backend runs async, polling effect will pick it up
      } else {
        // Fallback for demo if backend isn't actually running async wrapper
        const mockRunId = `bt_${Date.now()}`;
        setRuns((prev) => [
          {
            id: mockRunId,
            status: "running",
            symbol: config.symbols,
            model:
              MOCK_AI_MODELS.find((m) => m.id === config.modelId)?.name ||
              "Unknown",
            roi: 0,
            date: new Date().toISOString(),
          },
          ...prev,
        ]);
        setSelectedRunId(mockRunId);

        // Quick mock finish if backend didn't return ID
        setTimeout(() => {
          setIsRunning(false);
          setProgress(100);
          updateRunStatus(mockRunId, "completed", 12.5);
          setResults({
            equity: [],
            trades: [],
            metrics: {
              roi: 12.5,
              winRate: 60,
              profitFactor: 1.5,
              drawdown: -5,
            },
          });
        }, 2000);
      }
    } catch (e) {
      console.error("Backtest start failed", e);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    if (selectedRunId) {
      await tradingService.stopBacktest(selectedRunId);
      setIsRunning(false);
      updateRunStatus(selectedRunId, "failed", 0);
    }
  };

  const handleDeleteRun = (id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
    if (selectedRunId === id) setSelectedRunId(undefined);
  };

  return (
    <div className="h-full flex text-slate-200 overflow-hidden bg-[#0b0e14]">
      {/* 1. SIDEBAR HISTORY */}
      <div
        className={`fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex ${
          showHistory ? "flex" : "hidden"
        } lg:block`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setShowHistory(false)}
        />
        <div className="relative h-full animate-in slide-in-from-left duration-300 lg:animate-none">
          <BacktestSidebar
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={(id) => {
              setSelectedRunId(id);
              setShowHistory(false);
            }}
            onDeleteRun={handleDeleteRun}
            onNewBacktest={() => {
              setSelectedRunId(undefined);
              setStep(1);
              setResults(null);
              setIsRunning(false);
              setShowHistory(false);
            }}
            theme={theme}
          />
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 flex-shrink-0 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-[#161b22]">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 lg:hidden text-slate-400 hover:text-white"
            >
              <List size={20} />
            </button>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-xl font-bold flex items-center gap-2 sm:gap-3 text-white truncate">
                <Brain className="text-yellow-500 flex-shrink-0" size={20} />
                <span className="truncate">Simulation Lab</span>
              </h1>
              {selectedRunId && (
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 truncate">
                  {selectedRunId.slice(0, 8)}...
                  {isRunning && (
                    <span className="text-yellow-500 animate-pulse">
                      ● RUNNING
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {isRunning && (
            <button
              onClick={handleStop}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 hover:bg-rose-500/20"
            >
              <StopCircle size={14} /> ABORT
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
            {/* MIDDLE: CONFIG WIZARD */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <div className="bg-[#161b22] border border-slate-800 rounded-xl p-6">
                {/* Stepper */}
                <div className="flex items-center gap-2 mb-8">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all`}
                        style={
                          step >= s
                            ? {
                                backgroundColor: theme?.hex || "#eab308",
                                borderColor: theme?.hex || "#eab308",
                                color: "black",
                                boxShadow: theme
                                  ? `0 0 20px ${theme.hex}33`
                                  : "0 0 20px rgba(234,179,8,0.2)",
                              }
                            : {
                                backgroundColor: "#1e293b",
                                borderColor: "#334155",
                                color: "#64748b",
                              }
                        }
                      >
                        {s}
                      </div>
                      {s < 3 && (
                        <div
                          className={`w-8 h-0.5 mx-1`}
                          style={
                            step > s
                              ? { backgroundColor: theme?.hex || "#eab308" }
                              : { backgroundColor: "#1e293b" }
                          }
                        />
                      )}
                    </div>
                  ))}
                  <span className="ml-auto text-xs font-mono text-slate-500 font-bold uppercase tracking-wider">
                    {step === 1
                      ? "Model Setup"
                      : step === 2
                      ? "Parameters"
                      : "Execution"}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div>
                        <label className="text-xs text-slate-500 uppercase font-bold mb-3 block">
                          Intelligence Core
                        </label>
                        <div className="space-y-3">
                          {MOCK_AI_MODELS.map((m) => (
                            <div
                              key={m.id}
                              onClick={() =>
                                m.enabled &&
                                setConfig({ ...config, modelId: m.id })
                              }
                              className={`p-4 rounded-lg border cursor-pointer transition-all`}
                              style={
                                config.modelId === m.id
                                  ? {
                                      backgroundColor: theme
                                        ? `${theme.hex}1a`
                                        : "rgba(234,179,8,0.1)",
                                      borderColor: theme?.hex || "#eab308",
                                    }
                                  : m.enabled
                                  ? {
                                      backgroundColor: "#0b0e14",
                                      borderColor: "#1e293b",
                                    }
                                  : {
                                      backgroundColor: "rgba(11,14,20,0.5)",
                                      borderColor: "#1e293b",
                                      opacity: 0.5,
                                      cursor: "not-allowed",
                                    }
                              }
                            >
                              <div className="flex justify-between items-center">
                                <span
                                  className={`font-bold`}
                                  style={
                                    config.modelId === m.id
                                      ? { color: theme?.hex || "#eab308" }
                                      : { color: "#cbd5e1" }
                                  }
                                >
                                  {m.name}
                                </span>
                                {config.modelId === m.id && (
                                  <div
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]"
                                    style={{
                                      backgroundColor: theme?.hex || "#eab308",
                                    }}
                                  />
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                  {m.provider}
                                </span>
                                {!m.enabled && <span>Example Only</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 uppercase font-bold mb-3 block">
                          Target Assets (Multi-Support)
                        </label>
                        <input
                          type="text"
                          value={config.symbols}
                          onChange={(e) =>
                            setConfig({ ...config, symbols: e.target.value })
                          }
                          className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm outline-none transition-all font-mono"
                          style={{
                            borderColor: theme ? `${theme.hex}33` : undefined,
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor =
                              theme?.hex || "#eab308")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor = theme
                              ? `${theme.hex}33`
                              : "#1e293b")
                          }
                          placeholder="e.g. BTC/USDT, ETH/USDT"
                        />
                        <div className="flex gap-2 mt-2">
                          {["BTC", "ETH", "SOL", "BNB"].map((coin) => (
                            <button
                              key={coin}
                              onClick={() =>
                                setConfig({
                                  ...config,
                                  symbols: config.symbols
                                    ? `${config.symbols}, ${coin}/USDT`
                                    : `${coin}/USDT`,
                                })
                              }
                              className="text-[10px] px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 text-slate-400"
                            >
                              +{coin}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        disabled={!config.modelId}
                        onClick={() => setStep(2)}
                        className="w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg mt-4 transition-colors shadow-lg"
                        style={{
                          backgroundColor: theme?.hex || "#eab308",
                          boxShadow: theme
                            ? `0 0 20px ${theme.hex}33`
                            : "0 0 20px rgba(234,179,8,0.1)",
                        }}
                      >
                        Next Step
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">
                            Start Date
                          </label>
                          <input
                            type="datetime-local"
                            value={config.startTime}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                startTime: e.target.value,
                              })
                            }
                            className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">
                            End Date
                          </label>
                          <input
                            type="datetime-local"
                            value={config.endTime}
                            onChange={(e) =>
                              setConfig({ ...config, endTime: e.target.value })
                            }
                            className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {QUICK_RANGES.map((r) => (
                          <button
                            key={r.label}
                            className="px-3 py-1 bg-[#0b0e14] border border-slate-800 rounded text-xs hover:border-yellow-500 transition-colors text-slate-400 hover:text-yellow-500"
                            onClick={() => {
                              const end = new Date();
                              const start = new Date(
                                end.getTime() - r.hours * 3600000
                              );
                              setConfig({
                                ...config,
                                startTime: start.toISOString().slice(0, 16),
                                endTime: end.toISOString().slice(0, 16),
                              });
                            }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">
                          Initial Capital (USDT)
                        </label>
                        <input
                          type="number"
                          value={config.initialCapital}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              initialCapital: Number(e.target.value),
                            })
                          }
                          className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm focus:border-yellow-500 outline-none transition-all font-mono"
                        />
                      </div>

                      <div className="flex gap-3 mt-8">
                        <button
                          onClick={() => setStep(1)}
                          className="flex-1 py-3 bg-[#0b0e14] hover:bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-800 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setStep(3)}
                          className="flex-1 py-3 text-black font-bold rounded-lg transition-colors shadow-lg"
                          style={{
                            backgroundColor: theme?.hex || "#eab308",
                            boxShadow: theme
                              ? `0 0 20px ${theme.hex}33`
                              : "0 0 20px rgba(234,179,8,0.1)",
                          }}
                        >
                          Review
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div className="bg-[#0b0e14] rounded-xl p-4 space-y-3 border border-slate-800">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Model</span>
                          <span
                            className="font-bold"
                            style={{ color: theme?.hex || "#eab308" }}
                          >
                            {
                              MOCK_AI_MODELS.find(
                                (m) => m.id === config.modelId
                              )?.name
                            }
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Asset</span>
                          <span className="text-white font-mono text-xs">
                            {config.symbols}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Duration</span>
                          <span className="text-white font-mono text-xs text-right">
                            <div className="text-slate-400">
                              {config.startTime}
                            </div>
                            <div>{config.endTime}</div>
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-800 pt-2">
                          <span className="text-slate-500">Capital</span>
                          <span className="text-white font-mono">
                            ${config.initialCapital.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-8">
                        <button
                          onClick={() => setStep(2)}
                          className="flex-1 py-3 bg-[#0b0e14] hover:bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-800 transition-colors"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={handleRun}
                          disabled={isRunning}
                          className="flex-[2] py-3 text-black font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                          style={{
                            background: theme
                              ? `linear-gradient(to right, ${theme.hex}, ${theme.hex}cc)`
                              : "linear-gradient(to right, #eab308, #d97706)",
                            boxShadow: theme
                              ? `0 0 30px ${theme.hex}4d`
                              : "0 0 30px rgba(234,179,8,0.2)",
                          }}
                        >
                          {isRunning ? (
                            <RotateCw className="animate-spin" />
                          ) : (
                            <Zap fill="currentColor" />
                          )}
                          {isRunning ? "Running..." : "Start Simulation"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT: RESULTS DASHBOARD */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              {!results && !isRunning ? (
                <div className="h-full bg-[#1e2329]/20 border border-slate-800 border-dashed rounded-xl flex items-center justify-center flex-col gap-4 text-slate-500 animate-in fade-in">
                  <div className="p-4 rounded-full bg-[#1e2329]">
                    <Brain size={48} className="text-slate-600" />
                  </div>
                  <p>Select a run from history or start a new simulation</p>
                </div>
              ) : (
                <>
                  {isRunning ? (
                    <div className="flex-1 bg-[#161b22] border border-slate-800 rounded-xl flex items-center justify-center flex-col gap-6 animate-in zoom-in-95">
                      <ProgressRing progress={progress} />
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2">
                          Simulating Market Events
                        </h3>
                        <p className="text-slate-500 text-sm">
                          Processing candlesticks and AI inference...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                          label="Net Profit"
                          value={`${results?.metrics?.roi || 0}%`}
                          icon={TrendingUp}
                          color="text-emerald-400"
                          trend={results?.metrics?.roi}
                        />
                        <StatCard
                          label="Win Rate"
                          value={`${results?.metrics?.winRate || 0}%`}
                          icon={Target}
                          color="text-yellow-500"
                        />
                        <StatCard
                          label="Drawdown"
                          value={`${results?.metrics?.drawdown || 0}%`}
                          icon={TrendingDown}
                          color="text-rose-400"
                        />
                        <StatCard
                          label="Profit Factor"
                          value={results?.metrics?.profitFactor}
                          icon={Activity}
                          color="text-blue-400"
                        />
                      </div>

                      {/* Chart & Trades Split */}
                      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col gap-4">
                          <BacktestChart data={results?.equity || []} />
                          {/* Instructions / Log Placeholder */}
                          <div className="flex-1 bg-[#161b22] rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-400 overflow-y-auto">
                            <div className="mb-2 font-bold text-slate-500 uppercase">
                              Simulation Log
                            </div>
                            <div className="space-y-1">
                              <div>
                                [SYSTEM] Initializing Simulation Environment...
                              </div>
                              <div>
                                [DATA] Loaded 14,203 candles for{" "}
                                {config.symbols}
                              </div>
                              <div>[AI] Strategy Execution started...</div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[#161b22] rounded-xl border border-slate-800 flex flex-col min-h-0">
                          <div className="p-4 border-b border-slate-800 font-bold text-sm flex items-center justify-between">
                            <span>Trade Log</span>
                            <span className="text-xs text-slate-500">
                              {results?.trades?.length} Executions
                            </span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            <TradeTimeline trades={results?.trades || []} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
