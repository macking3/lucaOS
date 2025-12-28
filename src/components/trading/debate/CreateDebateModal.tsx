import React, { useState, useEffect } from "react";
import { X, Loader2, Plus, Bot } from "lucide-react";
import { DebatePersonality, CreateDebateRequest } from "../../../types/trading";
import { PERSONALITY_EMOJIS, PERSONALITY_COLORS } from "../../../types/trading";

interface CreateDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (request: CreateDebateRequest) => void;
}

// Full AI Model List from NoFx
const AI_MODELS = [
  { id: "gpt4", name: "GPT-4o", provider: "OpenAI", color: "bg-emerald-600" },
  {
    id: "claude3",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    color: "bg-orange-500",
  },
  {
    id: "deepseek",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    color: "bg-blue-600",
  },
  {
    id: "gemini",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    color: "bg-blue-400",
  },
  { id: "grok", name: "Grok 1.5", provider: "xAI", color: "bg-gray-700" },
  {
    id: "kimi",
    name: "Moonshot Kimi",
    provider: "Moonshot",
    color: "bg-purple-500",
  },
  { id: "qwen", name: "Qwen 2.5", provider: "Alibaba", color: "bg-indigo-500" },
];

const MOCK_STRATEGIES = [
  {
    id: "strat1",
    name: "Trend Following (Safe)",
    type: "static",
    coins: ["BTCUSDT", "ETHUSDT"],
  },
  {
    id: "strat2",
    name: "Mean Reversion (Aggressive)",
    type: "static",
    coins: ["SOLUSDT", "DOGEUSDT"],
  },
  {
    id: "strat3",
    name: "AI Sentiment Scan (Dynamic)",
    type: "dynamic",
    coins: [],
  },
];

const PERSONALITIES: {
  value: DebatePersonality;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  {
    value: DebatePersonality.BULL,
    label: "Bull",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.BULL],
    desc: "Aggressive Long",
  },
  {
    value: DebatePersonality.BEAR,
    label: "Bear",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.BEAR],
    desc: "Aggressive Short",
  },
  {
    value: DebatePersonality.ANALYST,
    label: "Analyst",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.ANALYST],
    desc: "Data Driven",
  },
  {
    value: DebatePersonality.RISK_MANAGER,
    label: "Risk Mgr",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.RISK_MANAGER],
    desc: "Conservative",
  },
  {
    value: DebatePersonality.CONTRARIAN,
    label: "Contrarian",
    emoji: PERSONALITY_EMOJIS[DebatePersonality.CONTRARIAN],
    desc: "Counter-Trend",
  },
];

export default function CreateDebateModal({
  isOpen,
  onClose,
  onCreate,
}: CreateDebateModalProps) {
  const [name, setName] = useState("");
  const [strategyId, setStrategyId] = useState(MOCK_STRATEGIES[0].id);
  const [symbol, setSymbol] = useState(MOCK_STRATEGIES[0].coins[0] || "");
  const [rounds, setRounds] = useState(3);
  const [participants, setParticipants] = useState<
    { aiModelId: string; personality: DebatePersonality }[]
  >([
    { aiModelId: "claude3", personality: DebatePersonality.ANALYST },
    { aiModelId: "deepseek", personality: DebatePersonality.BULL },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strategy Logic
  const selectedStrategy = MOCK_STRATEGIES.find((s) => s.id === strategyId);
  const isStatic = selectedStrategy?.type === "static";

  useEffect(() => {
    if (selectedStrategy && isStatic && selectedStrategy.coins.length > 0) {
      if (!selectedStrategy.coins.includes(symbol)) {
        setSymbol(selectedStrategy.coins[0]);
      }
    } else if (selectedStrategy && !isStatic) {
      setSymbol(""); // Clear for dynamic
    }
  }, [strategyId, isStatic, selectedStrategy, symbol]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name || participants.length < 2) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onCreate({
        name,
        strategyId,
        symbol: symbol || "AUTO-SELECT",
        maxRounds: rounds,
        participants,
      });
      setIsSubmitting(false);
      onClose();
      setName("");
      setParticipants([
        { aiModelId: "claude3", personality: DebatePersonality.ANALYST },
        { aiModelId: "deepseek", personality: DebatePersonality.BULL },
      ]);
    }, 800);
  };

  const addParticipant = () => {
    if (participants.length >= 6) return;
    const nextPers = [
      DebatePersonality.ANALYST,
      DebatePersonality.RISK_MANAGER,
      DebatePersonality.CONTRARIAN,
    ];
    const p = nextPers[participants.length % nextPers.length];
    setParticipants([
      ...participants,
      { aiModelId: AI_MODELS[0].id, personality: p },
    ]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (
    index: number,
    field: "aiModelId" | "personality",
    value: string
  ) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-[#161b22] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0d1017] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Bot size={18} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Create Debate Session
              </h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase">
                AI Consensus Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Debate Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BTC Breakout Analysis"
                className="w-full bg-[#0d1017] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 transition-all placeholder:text-slate-600"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Strategy
                </label>
                <select
                  value={strategyId}
                  onChange={(e) => setStrategyId(e.target.value)}
                  className="w-full bg-[#0d1017] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-yellow-500"
                >
                  {MOCK_STRATEGIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Target Asset
                </label>
                {isStatic ? (
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-[#0d1017] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 font-mono"
                  >
                    {selectedStrategy?.coins.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-[#0d1017]/50 border border-slate-800 rounded-xl px-3 py-3 text-slate-500 text-sm italic border-dashed">
                    Auto-Selected by Strategy
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Max Rounds
              </label>
              <div className="flex bg-[#0d1017] p-1 rounded-xl border border-slate-800">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRounds(n)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      rounds === n
                        ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/10"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {n} Rounds
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800/60" />

          {/* Section 2: Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                AI Panel ({participants.length})
              </label>
              <button
                onClick={addParticipant}
                disabled={participants.length >= 6}
                className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 hover:text-yellow-400 disabled:opacity-50 px-2 py-1 bg-yellow-500/10 rounded border border-yellow-500/20 transition-colors"
              >
                <Plus size={12} /> ADD AGENT
              </button>
            </div>

            <div className="space-y-2">
              {participants.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-[#0d1017] p-2 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group"
                >
                  {/* Model Select */}
                  <div className="flex-1">
                    <select
                      value={p.aiModelId}
                      onChange={(e) =>
                        updateParticipant(idx, "aiModelId", e.target.value)
                      }
                      className="w-full bg-transparent text-xs text-white font-bold outline-none"
                    >
                      {AI_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {AI_MODELS.find((m) => m.id === p.aiModelId)?.provider}
                    </div>
                  </div>

                  <div className="w-px h-6 bg-slate-800 mx-1" />

                  {/* Personality Select */}
                  <div className="flex-[1.2]">
                    <select
                      value={p.personality}
                      onChange={(e) =>
                        updateParticipant(idx, "personality", e.target.value)
                      }
                      className="w-full bg-transparent text-xs text-white outline-none"
                      style={{ color: PERSONALITY_COLORS[p.personality] }}
                    >
                      {PERSONALITIES.map((pers) => (
                        <option key={pers.value} value={pers.value}>
                          {pers.emoji} {pers.label}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {
                        PERSONALITIES.find(
                          (pers) => pers.value === p.personality
                        )?.desc
                      }
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeParticipant(idx)}
                    disabled={participants.length <= 2}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            {participants.length < 2 && (
              <p className="text-[10px] text-rose-500 mt-2 font-medium flex items-center gap-1">
                <X size={10} /> Minimum 2 agents required for debate
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0d1017] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || participants.length < 2 || isSubmitting}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Initialize Debate"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
