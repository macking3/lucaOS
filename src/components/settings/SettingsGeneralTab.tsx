import React, { useState, useEffect } from "react";
import { LucaSettings } from "../../services/settingsService";
import { PERSONA_UI_CONFIG, PersonaType } from "../../services/lucaService";
import { apiUrl } from "../../config/api";
import {
  Chrome,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ChromeProfileStatus {
  imported: boolean;
  lastSync?: string;
  profileName?: string;
  size?: number;
  availableProfiles?: {
    folderName: string;
    displayName: string;
    email?: string;
  }[];
  chromeRunning?: boolean;
}

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
  const [profileStatus, setProfileStatus] =
    useState<ChromeProfileStatus | null>(null);
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const fetchProfileStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/chrome-profile/status"));
      const data = await res.json();
      setProfileStatus(data);
    } catch (e) {
      console.error("[ChromeProfile] Failed to fetch status:", e);
    }
  };

  useEffect(() => {
    fetchProfileStatus();
  }, []);

  const handleImport = async (profileName = "Default") => {
    setImporting(true);
    setStatusMsg("Importing Chrome data...");
    try {
      const res = await fetch(apiUrl("/api/chrome-profile/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName }),
      });
      const data = await res.json();
      if (data.error) {
        setStatusMsg(`Error: ${data.error}`);
      } else {
        setStatusMsg(`Imported ${data.itemsCopied?.length || 0} items!`);
        fetchProfileStatus();
      }
    } catch (e: any) {
      setStatusMsg(`Failed: ${e.message}`);
    }
    setImporting(false);
  };

  const handleClear = async () => {
    if (
      !confirm(
        "Clear imported Chrome data? Ghost Browser will use clean sessions."
      )
    )
      return;
    try {
      await fetch(apiUrl("/api/chrome-profile/clear"), { method: "POST" });
      setStatusMsg("Cleared imported profile.");
      fetchProfileStatus();
    } catch (e: any) {
      setStatusMsg(`Failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-400">
          CORE PERSONA Theme
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["RUTHLESS", "ENGINEER", "ASSISTANT", "HACKER"].map((t) => {
            const isActive = settings.general.theme === t;
            const themeConfig = PERSONA_UI_CONFIG[t as PersonaType];
            return (
              <button
                key={t}
                onClick={() => onUpdate("general", "theme", t)}
                className={`p-4 md:p-2 rounded-lg text-xs font-mono border transition-all backdrop-blur-sm shadow-sm ${
                  isActive
                    ? `bg-${themeConfig.hex}/20 border-${themeConfig.hex} text-${themeConfig.hex} shadow-[0_0_15px_-5px_${themeConfig.hex}]`
                    : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:border-white/20 hover:text-gray-300"
                }`}
                style={
                  isActive
                    ? {
                        borderColor: themeConfig.hex,
                        color: themeConfig.hex,
                        backgroundColor: `${themeConfig.hex}20`,
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

      {/* Chrome Browser Profile Section */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-400">
          Browser Sessions
        </label>
        <div className="bg-white/5 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
          <div className="flex items-start gap-3 mb-3">
            <Chrome className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-2">
                Import your Chrome browser data so Luca can use your logged-in
                sessions, bookmarks, and saved passwords.
              </p>

              {profileStatus?.imported ? (
                <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>
                    Imported: {profileStatus.profileName || "Default"}
                  </span>
                  <span className="text-gray-500">
                    (
                    {new Date(
                      profileStatus.lastSync || ""
                    ).toLocaleDateString()}
                    )
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
                  <AlertCircle className="w-3 h-3" />
                  <span>No Chrome data imported (using clean browser)</span>
                </div>
              )}

              {profileStatus?.chromeRunning && (
                <p className="text-[10px] text-orange-400 mb-2">
                  ⚠️ Chrome is running. Close Chrome before importing.
                </p>
              )}

              {statusMsg && (
                <p className="text-[10px] text-gray-400 mb-2">{statusMsg}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleImport()}
              disabled={importing || profileStatus?.chromeRunning}
              style={{ borderColor: theme.hex, color: theme.hex }}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-[10px] font-bold hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {importing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Chrome className="w-3 h-3" />
              )}
              {profileStatus?.imported ? "RE-IMPORT" : "IMPORT CHROME DATA"}
            </button>

            {profileStatus?.imported && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 rounded text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                CLEAR
              </button>
            )}
          </div>
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
