import React from "react";
import { Home } from "lucide-react";
import { LucaSettings } from "../../services/settingsService";

interface SettingsIoTTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
  };
}

const SettingsIoTTab: React.FC<SettingsIoTTabProps> = ({
  settings,
  onUpdate,
  theme,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-lg backdrop-blur-sm">
        <Home className="w-8 h-8 text-gray-400" />
        <div>
          <h3 className="font-bold text-gray-200">Home Assistant</h3>
          <p className="text-xs text-gray-400">
            Control your real-world devices.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">Server URL</label>
          <input
            type="text"
            value={settings.iot.haUrl}
            onChange={(e) => onUpdate("iot", "haUrl", e.target.value)}
            placeholder="http://homeassistant.local:8123"
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white outline-none font-mono text-sm hover:border-white/20 transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">
            Long-Lived Access Token
          </label>
          <textarea
            value={settings.iot.haToken}
            onChange={(e) => onUpdate("iot", "haToken", e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
            className="w-full h-24 bg-black/20 border border-white/10 rounded-lg p-2 text-white outline-none font-mono text-[10px] hover:border-white/20 transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsIoTTab;
