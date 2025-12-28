import React from "react";
import { LucaSettings } from "../../services/settingsService";
import { PERSONA_UI_CONFIG, PersonaType } from "../../services/lucaService";

interface SettingsGeneralTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
  };
}

const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  settings,
  onUpdate,
  theme,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-400">
          CORE PERSONA Theme
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["RUTHLESS", "ENGINEER", "ASSISTANT", "HACKER"].map((t) => {
            const isActive = settings.general.theme === t;
            const theme = PERSONA_UI_CONFIG[t as PersonaType];
            return (
              <button
                key={t}
                onClick={() => onUpdate("general", "theme", t)}
                className={`p-4 md:p-2 rounded-lg text-xs font-mono border transition-all backdrop-blur-sm shadow-sm ${
                  isActive
                    ? `bg-${theme.hex}/20 border-${theme.hex} text-${theme.hex} shadow-[0_0_15px_-5px_${theme.hex}]`
                    : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:border-white/20 hover:text-gray-300"
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
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-400">
          System Behavior
        </label>
        {/** Toggle Item Helper **/}
        {[
          { label: "Start Luca on System Boot", key: "startOnBoot" },
          { label: "Minimize to System Tray", key: "minimizeToTray" },
          { label: "Development Debug Mode", key: "debugMode" },
        ].map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            <span className="text-sm text-gray-300">{item.label}</span>
            <input
              type="checkbox"
              checked={
                settings.general[
                  item.key as keyof typeof settings.general
                ] as boolean
              }
              onChange={(e) => onUpdate("general", item.key, e.target.checked)}
              style={{ accentColor: theme.hex }}
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-400">
          System Permissions
        </label>
        <div className="bg-white/5 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
          <p className="text-xs text-gray-400 mb-3">
            Luca needs system permissions for screenshots and UI automation
            (Accessibility).
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const { checkPermissions } = await import(
                  "../../tools/handlers/LocalTools"
                );
                const res = await checkPermissions();
                alert(
                  res.success
                    ? "All permissions granted!"
                    : "Permissions missing: " + JSON.stringify(res.permissions)
                );
              }}
              style={{ borderColor: theme.hex, color: theme.hex }}
              className="px-3 py-1.5 border border-white/10 rounded text-[10px] font-bold hover:bg-white/5 transition-all"
            >
              CHECK STATUS
            </button>
            <button
              onClick={async () => {
                const { requestPermissions } = await import(
                  "../../tools/handlers/LocalTools"
                );
                await requestPermissions();
                alert(
                  "Permission prompts triggered. Please check your system settings."
                );
              }}
              style={{
                backgroundColor: `${theme.hex}20`,
                color: theme.hex,
                borderColor: theme.hex,
              }}
              className="px-3 py-1.5 border border-white/10 rounded text-[10px] font-bold hover:bg-white/5 transition-all shadow-sm"
            >
              GRANT ACCESS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsGeneralTab;
