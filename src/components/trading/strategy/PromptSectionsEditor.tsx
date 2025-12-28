import React from "react";
import { Command, Sparkles, MessageSquare } from "lucide-react";
import { TradingStrategy } from "../../../types/trading";

interface PromptSectionsEditorProps {
  customPrompt?: string;
  onCustomPromptChange?: (val: string) => void;
  // TODO: Add structured sections support in future parity pass
  // For now, mirroring NoFx which relies heavily on a custom prompt override or assembled parts
}

export function PromptSectionsEditor({
  customPrompt,
  onCustomPromptChange,
}: PromptSectionsEditorProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[#1e2329] p-4 rounded-xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Command size={16} className="text-purple-400" /> System Instructions
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Sparkles size={10} className="text-yellow-500" /> Custom System
                Prompt
              </label>
              <span className="text-[10px] text-slate-600 font-mono">
                Overrides default template
              </span>
            </div>
            <div className="relative">
              <textarea
                value={customPrompt || ""}
                onChange={(e) => onCustomPromptChange?.(e.target.value)}
                className="w-full h-64 bg-black/20 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed"
                placeholder="Enter explicit instructions for the AI agent (e.g., 'You are a scalper focusing on 1m/5m timeframe breakouts...')"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-600 font-mono">
                {customPrompt?.length || 0} chars
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <h4 className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2">
          <MessageSquare size={14} /> Prompt Engineering Tips
        </h4>
        <ul className="space-y-1.5 text-[10px] text-indigo-200/70 list-disc list-inside">
          <li>
            Define a clear <strong>Persona</strong> (e.g., Risk-Averse
            Institutional Trader).
          </li>
          <li>
            Specify <strong>Input Data</strong> reliance (e.g., "Prioritize RSI
            divergence over MACD").
          </li>
          <li>
            Set explicit <strong>Constraints</strong> (e.g., "Never trade
            without volume confirmation").
          </li>
          <li>
            Use <strong>Chain of Thought</strong> prompting by asking it to
            "Think step-by-step".
          </li>
        </ul>
      </div>
    </div>
  );
}
