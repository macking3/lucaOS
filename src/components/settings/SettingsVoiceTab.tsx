import React from "react";
import { Cpu, Mic, Globe, Sparkles } from "lucide-react";
import { LucaSettings } from "../../services/settingsService";

interface SettingsVoiceTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: any; // Using dynamic type for theme object to simplify refactor
}

const SettingsVoiceTab: React.FC<SettingsVoiceTabProps> = ({
  settings,
  onUpdate,
  theme,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-400">TTS Provider</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["local-neural", "native", "google", "gemini-genai"].map(
            (provider) => {
              const isActive = settings.voice.provider === provider;
              const labels: Record<string, string> = {
                "local-neural": "Local Neural",
                native: "Native (Offline)",
                google: "Google Cloud",
                "gemini-genai": "Gemini 2.5 (GenAI)",
              };
              const Icons: Record<string, any> = {
                "local-neural": Cpu,
                native: Mic,
                google: Globe,
                "gemini-genai": Sparkles,
              };
              const Icon = Icons[provider];

              return (
                <button
                  key={provider}
                  onClick={() => onUpdate("voice", "provider", provider)}
                  className={`p-3 rounded-lg border text-sm flex flex-col items-center gap-2 transition-all backdrop-blur-sm ${
                    isActive
                      ? `bg-${theme.hex}/20 border-${theme.hex} text-${theme.hex} shadow-[0_0_15px_-5px_${theme.hex}]`
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-gray-200"
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: theme.hex,
                          color: theme.hex,
                          backgroundColor: `${theme.hex}20`,
                        }
                      : {}
                  }
                >
                  <Icon className="w-5 h-5" />
                  {labels[provider]}
                </button>
              );
            }
          )}
        </div>
      </div>

      {settings.voice.provider === "local-neural" && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
          <label className="text-sm font-bold text-gray-400">
            Neural Voice Model
          </label>
          <select
            value={settings.voice.voiceId || "en_US-amy-medium"}
            onChange={(e) => onUpdate("voice", "voiceId", e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white outline-none hover:border-white/20 transition-colors backdrop-blur-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          >
            <option value="en_US-amy-medium" className="bg-gray-900">
              Amy (Female) - Recommended
            </option>
            <option value="en_US-ryan-medium" className="bg-gray-900">
              Ryan (Male)
            </option>
          </select>
          <p className="text-[10px] text-gray-500">
            First use will download model (~50MB). Requires Python backend
            running.
          </p>
        </div>
      )}

      {settings.voice.provider === "google" && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
          <label className="text-sm font-bold text-gray-400">
            Google Cloud API Key
          </label>
          <input
            type="password"
            value={settings.voice.googleApiKey}
            onChange={(e) => onUpdate("voice", "googleApiKey", e.target.value)}
            placeholder="Google Cloud Key for TTS..."
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white outline-none font-mono hover:border-white/20 transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />
        </div>
      )}

      {settings.voice.provider === "gemini-genai" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 border-t border-white/10 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 flex items-center justify-between">
              Voice Style Prompt
              <span
                className="text-[10px] border px-1.5 rounded"
                style={{ color: theme.hex, borderColor: `${theme.hex}4d` }}
              >
                GENERATIVE
              </span>
            </label>
            <textarea
              value={settings.voice.style || "Natural, confident AI assistant"}
              onChange={(e) => onUpdate("voice", "style", e.target.value)}
              placeholder="e.g. 'Speak like a 1920s detective', 'Excited spaceship computer'..."
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white outline-none hover:border-white/20 transition-colors h-20 text-sm font-sans"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.target.style.borderColor = theme.hex)}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
            <p className="text-[10px] text-gray-500">
              Describe the persona, tone, and accent. The AI will generate audio
              matching this description.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400">
              Pacing Control
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["Slow", "Normal", "Fast", "Dramatic"].map((pacing) => (
                <button
                  key={pacing}
                  onClick={() => onUpdate("voice", "pacing", pacing)}
                  className={`px-3 py-2 rounded text-xs border transition-colors ${
                    settings.voice.pacing === pacing
                      ? `bg-${theme.hex}/20 border-${theme.hex} text-${theme.hex}`
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  }`}
                  style={
                    settings.voice.pacing === pacing
                      ? { borderColor: theme.hex, color: theme.hex }
                      : {}
                  }
                >
                  {pacing}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsVoiceTab;
