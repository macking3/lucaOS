import React, { useState, useEffect } from "react";
import {
  Zap,
  Save,
  Plus,
  Workflow,
  Trash2,
  PlayCircle,
  Clock,
  Activity,
  ChevronRight,
  Cpu,
  Settings,
  Database,
  Shield,
  Command,
  ChevronDown,
  List,
  X,
} from "lucide-react";

import {
  TradingStrategy,
  CoinSourceType,
  AutomationMode,
  ScheduleType,
  FullDecision,
  TradeAction,
} from "../../types/trading";
import { CoinSourceEditor } from "./strategy/CoinSourceEditor";
import { IndicatorEditor } from "./strategy/IndicatorEditor";
import { RiskControlEditor } from "./strategy/RiskControlEditor";
import { PromptSectionsEditor } from "./strategy/PromptSectionsEditor";
import { AITestRunner } from "./strategy/AITestRunner";
import { tradingService } from "../../services/tradingService";

const DEFAULT_STRATEGY: TradingStrategy = {
  id: "",
  name: "New Strategy",
  description: "A fresh approach to market dominance.",
  isActive: false,
  isDefault: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  coinSource: {
    sourceType: CoinSourceType.STATIC,
    staticCoins: ["BTC/USDT", "ETH/USDT"],
    limit: 10,
    useOITop: false,
  },
  indicators: {
    rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
    macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    ema: { enabled: true, periods: [20, 50, 200] },
    atr: { enabled: false, period: 14 },
  },
  riskControl: {
    maxPositions: 3,
    positionSizePercent: 0.1,
    btcEthLeverage: 5,
    altcoinLeverage: 3,
    stopLossPercent: 0.02,
    takeProfitPercent: 0.05,
    maxDrawdownPercent: 0.1,
  },
  automation: {
    mode: AutomationMode.MANUAL,
    minConsensusConfidence: 70,
    aiLearningEnabled: true,
  },
  schedule: {
    type: ScheduleType.INTERVAL,
    intervalMinutes: 15,
  },
  promptVariant: "balanced",
};

interface StrategyBuilderProps {
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function StrategyBuilder({ theme }: StrategyBuilderProps) {
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] =
    useState<TradingStrategy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Accordion State
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "coinSource"
  );

  const [showList, setShowList] = useState(false);

  // Right Panel Tab
  const [activeTab, setActiveTab] = useState<"preview" | "test">("test");

  // Load Strategies on Mount
  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    setIsLoading(true);
    try {
      const data = await tradingService.getStrategies();
      let validData: any[] = [];
      if (Array.isArray(data)) {
        validData = data;
      } else if (data && typeof data === "object") {
        validData = Object.values(data);
      }
      setStrategies(validData as unknown as TradingStrategy[]);
      if (validData.length > 0 && !selectedStrategy) {
        setSelectedStrategy(validData[0] as unknown as TradingStrategy);
      }
    } catch (e) {
      console.error("Failed to load strategies", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewStrategy = () => {
    const newStrat = {
      ...DEFAULT_STRATEGY,
      id: `new_${Date.now()}`, // Temporary ID
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setStrategies([newStrat, ...strategies]);
    setSelectedStrategy(newStrat);
  };

  const handleSaveStrategy = async () => {
    if (!selectedStrategy) return;
    setIsSaving(true);
    try {
      const result = await tradingService.saveStrategy(selectedStrategy);
      if (result.success) {
        // Reload list to get clean state and real ID
        const data = await tradingService.getStrategies();
        setStrategies(data as unknown as TradingStrategy[]);

        // Re-select the saved strategy
        const saved = data.find((s: any) => s.id === result.id) || data[0];
        setSelectedStrategy(saved as unknown as TradingStrategy);
        alert("Strategy saved successfully!");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStrategy = async () => {
    if (!selectedStrategy || !selectedStrategy.id) return;
    if (!confirm("Are you sure you want to delete this strategy?")) return;

    try {
      await tradingService.deleteStrategy(selectedStrategy.id);
      const remaining = strategies.filter((s) => s.id !== selectedStrategy.id);
      setStrategies(remaining);
      setSelectedStrategy(remaining[0] || null);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const updateStrategy = (updates: Partial<TradingStrategy>) => {
    if (!selectedStrategy) return;
    const updated = { ...selectedStrategy, ...updates, updatedAt: Date.now() };
    setSelectedStrategy(updated);
    // Optimistic update
    setStrategies((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleRunTest = async (): Promise<FullDecision> => {
    // Mock AI Simulation for UI feedback (Integration with real AI test runner would be next step)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          systemPrompt: "System Prompt...",
          userPrompt: "Market Data...",
          cotTrace:
            "Thinking Process:\n1. Analyzing BTC price action.\n2. RSI is oversold at 28.\n3. MACD crossover detected on 15m.\n4. Volume is increasing.\n\nConclusion: Bullish bounce likely.",
          decisions: [
            {
              symbol: "BTC/USDT",
              action: TradeAction.OPEN_LONG,
              confidence: 85,
              reasoning: "Strong technical confluence.",
            },
          ],
          rawResponse: "...",
          timestamp: Date.now(),
          aiRequestDurationMs: 1420,
        });
      }, 2000);
    });
  };

  if (isLoading && strategies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">
        Loading Strategy Database...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 font-mono text-slate-200">
      {/* SIDEBAR: Strategy List */}
      <div
        className={`fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex ${
          showList ? "flex" : "hidden"
        } lg:block`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setShowList(false)}
        />
        <div className="relative w-64 h-full flex flex-col bg-[#0b0e14] border-r border-slate-800 animate-in slide-in-from-left duration-300 lg:animate-none">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-[#161b22] flex-shrink-0">
            <span className="text-xs font-bold uppercase text-slate-400">
              Strategies
            </span>
            <button
              onClick={() => {
                handleNewStrategy();
                setShowList(false);
              }}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="New Strategy"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {strategies.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedStrategy(s);
                  setShowList(false);
                }}
                className={`p-3 border-b border-slate-800 cursor-pointer hover:bg-white/5 transition-all`}
                style={
                  selectedStrategy?.id === s.id
                    ? {
                        backgroundColor: "#1e2329",
                        borderLeft: `2px solid ${theme?.hex || "#6366f1"}`,
                      }
                    : {
                        borderLeft: "2px solid transparent",
                      }
                }
              >
                <div className="text-sm font-bold text-white truncate">
                  {s.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {s.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedStrategy ? (
        <>
          {/* MIDDLE PANE: CONFIGURATION ACCORDION */}
          <div className="w-full lg:w-1/3 flex flex-col min-h-0 bg-[#0b0e14] border border-slate-800 rounded-sm">
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-[#161b22] flex-shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  onClick={() => setShowList(true)}
                  className="p-1 lg:hidden text-slate-400"
                >
                  <List size={18} />
                </button>
                <input
                  type="text"
                  value={selectedStrategy.name}
                  onChange={(e) => updateStrategy({ name: e.target.value })}
                  style={{ color: theme?.hex || "#6366f1" }}
                  className="bg-transparent text-xs sm:text-sm font-bold tracking-widest uppercase outline-none w-full truncate"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveStrategy}
                  disabled={isSaving}
                  className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded disabled:opacity-50"
                  title="Save Strategy"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={handleDeleteStrategy}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                  title="Delete Strategy"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 border-b border-slate-800">
              <input
                type="text"
                value={selectedStrategy.description}
                onChange={(e) =>
                  updateStrategy({ description: e.target.value })
                }
                className="w-full bg-black/20 text-xs text-slate-400 p-2 rounded border border-slate-800 focus:border-indigo-500 outline-none"
                placeholder="Strategy description..."
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* 1. Coin Source */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "coinSource" ? null : "coinSource"
                    )
                  }
                  className={`w-full p-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-colors`}
                  style={
                    expandedSection === "coinSource"
                      ? {
                          backgroundColor: theme
                            ? `${theme.hex}1a`
                            : "rgba(99,102,241,0.1)",
                          color: theme?.hex || "#6366f1",
                        }
                      : {
                          backgroundColor: "#1e2329",
                          color: "#94a3b8",
                        }
                  }
                >
                  <span className="flex items-center gap-2">
                    <Database size={14} /> Asset Universe
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      expandedSection === "coinSource" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedSection === "coinSource" && (
                  <div className="p-4 bg-[#0b0e14] animate-in slide-in-from-top-2">
                    <CoinSourceEditor
                      config={selectedStrategy.coinSource}
                      onChange={(cfg) => updateStrategy({ coinSource: cfg })}
                    />
                  </div>
                )}
              </div>

              {/* 2. Indicators */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "indicators" ? null : "indicators"
                    )
                  }
                  className={`w-full p-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-colors`}
                  style={
                    expandedSection === "indicators"
                      ? {
                          backgroundColor: theme
                            ? `${theme.hex}1a`
                            : "rgba(99,102,241,0.1)",
                          color: theme?.hex || "#6366f1",
                        }
                      : {
                          backgroundColor: "#1e2329",
                          color: "#94a3b8",
                        }
                  }
                >
                  <span className="flex items-center gap-2">
                    <Activity size={14} /> Technicals
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      expandedSection === "indicators" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedSection === "indicators" && (
                  <div className="p-4 bg-[#0b0e14] animate-in slide-in-from-top-2">
                    <IndicatorEditor
                      config={selectedStrategy.indicators}
                      onChange={(cfg) => updateStrategy({ indicators: cfg })}
                    />
                  </div>
                )}
              </div>

              {/* 3. Risk Control */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "risk" ? null : "risk"
                    )
                  }
                  className={`w-full p-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-colors`}
                  style={
                    expandedSection === "risk"
                      ? {
                          backgroundColor: theme
                            ? `${theme.hex}1a`
                            : "rgba(99,102,241,0.1)",
                          color: theme?.hex || "#6366f1",
                        }
                      : {
                          backgroundColor: "#1e2329",
                          color: "#94a3b8",
                        }
                  }
                >
                  <span className="flex items-center gap-2">
                    <Shield size={14} /> Risk Protocol
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      expandedSection === "risk" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedSection === "risk" && (
                  <div className="p-4 bg-[#0b0e14] animate-in slide-in-from-top-2">
                    <RiskControlEditor
                      config={selectedStrategy.riskControl}
                      onChange={(cfg) => updateStrategy({ riskControl: cfg })}
                    />
                  </div>
                )}
              </div>

              {/* 4. Prompt Engineering */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "prompt" ? null : "prompt"
                    )
                  }
                  className={`w-full p-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-colors`}
                  style={
                    expandedSection === "prompt"
                      ? {
                          backgroundColor: theme
                            ? `${theme.hex}1a`
                            : "rgba(99,102,241,0.1)",
                          color: theme?.hex || "#6366f1",
                        }
                      : {
                          backgroundColor: "#1e2329",
                          color: "#94a3b8",
                        }
                  }
                >
                  <span className="flex items-center gap-2">
                    <Command size={14} /> System Instructions
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      expandedSection === "prompt" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedSection === "prompt" && (
                  <div className="p-4 bg-[#0b0e14] animate-in slide-in-from-top-2">
                    <PromptSectionsEditor
                      customPrompt={selectedStrategy.customPrompt}
                      onCustomPromptChange={(val) =>
                        updateStrategy({ customPrompt: val })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANE: PREVIEW & TEST */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0b0e14] border border-slate-800 rounded-sm overflow-hidden relative">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-[#161b22] flex-shrink-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap`}
                style={
                  activeTab === "preview"
                    ? {
                        borderBottomColor: theme?.hex || "#6366f1",
                        color: "white",
                        backgroundColor: theme
                          ? `${theme.hex}0d`
                          : "rgba(99,102,241,0.05)",
                      }
                    : {
                        borderBottomColor: "transparent",
                        color: "#64748b",
                      }
                }
              >
                Prompt Preview
              </button>
              <button
                onClick={() => setActiveTab("test")}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap`}
                style={
                  activeTab === "test"
                    ? {
                        borderBottomColor: theme?.hex || "#6366f1",
                        color: "white",
                        backgroundColor: theme
                          ? `${theme.hex}0d`
                          : "rgba(99,102,241,0.05)",
                      }
                    : {
                        borderBottomColor: "transparent",
                        color: "#64748b",
                      }
                }
              >
                AI Simulation
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-3 sm:p-6 relative">
              <div
                className={`absolute inset-0 p-3 sm:p-6 transition-all duration-300 ${
                  activeTab === "preview"
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <div className="h-full bg-black/40 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                  {`// SYSTEM PROMPT PREVIEW \n\nYou are an advanced crypto trading AI acting as a ${
                    selectedStrategy.promptVariant?.toUpperCase() || "BALANCED"
                  } analyst.\n\nTARGET ASSETS: \n${selectedStrategy.coinSource?.staticCoins?.join(
                    ", "
                  )}\n\nINDICATORS:\n${JSON.stringify(
                    selectedStrategy.indicators,
                    null,
                    2
                  )}\n\nRISK CONSTRAINTS:\n${JSON.stringify(
                    selectedStrategy.riskControl,
                    null,
                    2
                  )}\n\n${
                    selectedStrategy.customPrompt
                      ? "CUSTOM INSTRUCTIONS:\n" + selectedStrategy.customPrompt
                      : ""
                  }`}
                </div>
              </div>

              <div
                className={`absolute inset-0 p-3 sm:p-6 transition-all duration-300 ${
                  activeTab === "test"
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <AITestRunner onRunTest={handleRunTest} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Select or Create a Strategy
        </div>
      )}
    </div>
  );
}
