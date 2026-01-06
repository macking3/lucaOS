import React from "react";
import { Shield } from "lucide-react";
import { LucaSettings } from "../../services/settingsService";
import { ModelManager } from "../ModelManager";

interface SettingsBrainTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
  };
}

const SettingsBrainTab: React.FC<SettingsBrainTabProps> = ({
  settings,
  onUpdate,
  theme,
}) => {
  // Check if in demo mode
  const isDemoMode =
    typeof localStorage !== "undefined" &&
    localStorage.getItem("LUCA_USES_DEMO_KEY") === "true";

  return (
    <div className="space-y-6">
      {/* Demo Mode Warning */}
      {isDemoMode && (
        <div
          className="p-3 rounded-lg text-xs backdrop-blur-sm"
          style={{
            backgroundColor: `${theme.hex}1a`,
            border: `1px solid ${theme.hex}4d`,
            color: theme.hex,
          }}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          <strong>Demo Mode:</strong> Using fallback API key with
          gemini-2.0-flash. Add your own key below for Gemini 3 access.
        </div>
      )}

      <div
        className="p-3 rounded-lg text-xs backdrop-blur-sm"
        style={{
          border: `1px solid ${theme.hex}33`,
          color: `${theme.hex}cc`,
        }}
      >
        <Shield className="w-4 h-4 inline mr-2" style={{ color: theme.hex }} />
        API Keys are stored locally on your device.
      </div>

      {/* Specialized Model Routing */}
      <div className="space-y-4">
        {/* Main Brain */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between">
            <span>Core Intelligence</span>
            <span style={{ color: `${theme.hex}80` }}>
              Gemini 3 + Multi-Modal
            </span>
          </label>
          <select
            value={settings.brain.model}
            onChange={(e) => onUpdate("brain", "model", e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          >
            <option value="gemini-3-flash-preview">
              Gemini 3 Flash (State-of-the-Art)
            </option>
            <option value="gemini-3-pro-preview">
              Gemini 3 Pro (Elite Reasoning)
            </option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Stable)</option>
          </select>
        </div>

        {/* Voice Agent */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between">
            <span>Voice Interaction</span>
            <span style={{ color: `${theme.hex}80` }}>
              Gemini 2.5 Native Audio
            </span>
          </label>
          <select
            value={settings.brain.voiceModel}
            onChange={(e) => onUpdate("brain", "voiceModel", e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          >
            <option value="models/gemini-2.5-flash-native-audio-latest">
              Gemini 2.5 Flash (Native Audio)
            </option>
            <option value="models/gemini-2.5-pro-preview-tts">
              Gemini 2.5 Pro (Native TTS/Audio)
            </option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Stable)</option>
          </select>
        </div>

        {/* Autonomous Memory */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between">
            <span>Autonomous Memory</span>
            <span style={{ color: `${theme.hex}80` }}>Next-Gen Indexing</span>
          </label>
          <select
            value={settings.brain.memoryModel}
            onChange={(e) => onUpdate("brain", "memoryModel", e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          >
            <option value="gemini-3-pro-preview">
              Gemini 3 Pro (Maximum Knowledge Retrieval)
            </option>
            <option value="gemini-3-flash-preview">
              Gemini 3 Flash (High-Speed Indexing)
            </option>
            <option value="gemini-2.0-flash">
              Gemini 2.0 Flash (Standard)
            </option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
          <span>API Credentials</span>
          <span className="text-[10px] font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
            Enter keys for models you intend to use
          </span>
        </label>

        <div className="grid grid-cols-1 gap-3">
          {/* Google */}
          <div className="relative group">
            <input
              type="password"
              value={settings.brain.geminiApiKey || ""}
              onChange={(e) =>
                onUpdate("brain", "geminiApiKey", e.target.value)
              }
              placeholder="Google Gemini API Key..."
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 pl-3 text-white outline-none font-mono hover:border-white/20 transition-colors text-xs"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.target.style.borderColor = theme.hex)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
          </div>

          {/* Anthropic */}
          <div className="relative group">
            <input
              type="password"
              value={settings.brain.anthropicApiKey || ""}
              onChange={(e) =>
                onUpdate("brain", "anthropicApiKey", e.target.value)
              }
              placeholder="Anthropic API Key (sk-ant...)"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 pl-3 text-white outline-none font-mono hover:border-white/20 transition-colors text-xs"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.target.style.borderColor = theme.hex)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
          </div>

          {/* OpenAI */}
          <div className="relative group">
            <input
              type="password"
              value={settings.brain.openaiApiKey || ""}
              onChange={(e) =>
                onUpdate("brain", "openaiApiKey", e.target.value)
              }
              placeholder="OpenAI API Key (sk-...)"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 pl-3 text-white outline-none font-mono hover:border-white/20 transition-colors text-xs"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.target.style.borderColor = theme.hex)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
          </div>

          {/* xAI */}
          <div className="relative group">
            <input
              type="password"
              value={settings.brain.xaiApiKey || ""}
              onChange={(e) => onUpdate("brain", "xaiApiKey", e.target.value)}
              placeholder="xAI API Key..."
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 pl-3 text-white outline-none font-mono hover:border-white/20 transition-colors text-xs"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.target.style.borderColor = theme.hex)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
          </div>
        </div>
      </div>

      {/* Quota Intelligence */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: `${theme.hex}0d`,
          border: `1px solid ${theme.hex}33`,
        }}
      >
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
            style={{ color: theme.hex }}
          >
            <Shield className="w-3 h-3" />
            Quota Intelligence
          </label>
          <span
            className="text-[10px] font-mono"
            style={{ color: `${theme.hex}b3` }}
          >
            PRO TIER ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/40 border border-white/5 p-2 rounded-lg">
            <div className="text-[9px] text-gray-500 uppercase">
              Model Capacity
            </div>
            <div className="text-xs text-white font-medium">
              15 RPM{" "}
              <span className="text-[10px] text-gray-400 font-normal">
                (Preview)
              </span>
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 p-2 rounded-lg">
            <div className="text-[9px] text-gray-500 uppercase">
              Batch Savings
            </div>
            <div className="text-xs text-green-400 font-medium">~78% Redux</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Background Load</span>
            <span style={{ color: theme.hex }}>OPTIMIZED</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full"
              style={{ backgroundColor: `${theme.hex}80`, width: "15%" }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-bold text-gray-400">
            Temperature (Creativity)
          </label>
          <span className="text-xs" style={{ color: theme.hex }}>
            {settings.brain.temperature}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.brain.temperature}
          onChange={(e) =>
            onUpdate("brain", "temperature", parseFloat(e.target.value))
          }
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: theme.hex }}
        />
      </div>

      {/* Local Models Manager */}
      <div className="pt-4 border-t border-white/10">
        <ModelManager />
      </div>
    </div>
  );
};

export default SettingsBrainTab;
