import React from "react";
import { Wifi, WifiOff, Globe, Shield, Check } from "lucide-react";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl, WS_PORT } from "../../config/api";

interface SettingsNeuralLinkTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
  };
  connectionMode?: "local" | "vpn" | "relay" | "disconnected";
}

const SettingsNeuralLinkTab: React.FC<SettingsNeuralLinkTabProps> = ({
  settings,
  onUpdate,
  theme,
  connectionMode = "disconnected",
}) => {
  const getConnectionIcon = () => {
    switch (connectionMode) {
      case "local":
        return <Wifi className="w-4 h-4 text-green-400" />;
      case "vpn":
        return <Shield className="w-4 h-4" style={{ color: theme.hex }} />;
      case "relay":
        return <Globe className="w-4 h-4" style={{ color: theme.hex }} />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionStatus = () => {
    switch (connectionMode) {
      case "local":
        return { text: "Connected (Local Network)", color: "text-green-400" };
      case "vpn":
        return {
          text: "Connected (VPN)",
          color: "",
          style: { color: theme.hex },
        };
      case "relay":
        return {
          text: "Connected (Cloud Relay)",
          color: "",
          style: { color: theme.hex },
        };
      default:
        return { text: "Disconnected", color: "text-gray-500" };
    }
  };

  const status = getConnectionStatus();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: `${theme.hex}0d`,
          border: `1px solid ${theme.hex}33`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <label
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: theme.hex }}
          >
            Connection Status
          </label>
          {getConnectionIcon()}
        </div>
        <div
          className={`text-sm font-medium ${status.color}`}
          style={(status as any).style}
        >
          {status.text}
        </div>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-bold text-gray-400">
            Enable Remote Access
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Allow devices to connect from anywhere
          </p>
        </div>
        <button
          onClick={async () => {
            const newValue = !settings.neuralLink.enabled;
            onUpdate("neuralLink", "enabled", newValue);

            // Call API to start or stop the socket server
            try {
              const endpoint = newValue
                ? apiUrl("/api/neural-link/start")
                : apiUrl("/api/neural-link/stop");
              await fetch(endpoint, { method: "POST" });
              console.log(
                `[NeuralLink] Server ${newValue ? "started" : "stopped"}`
              );
            } catch (e) {
              console.error("[NeuralLink] Failed to toggle server:", e);
            }
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          style={{
            backgroundColor: settings.neuralLink.enabled
              ? theme.hex
              : "rgba(75,85,99,1)",
          }}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.neuralLink.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Connection Mode */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-400">
          Connection Mode
        </label>
        <select
          value={settings.neuralLink.connectionMode}
          onChange={(e) =>
            onUpdate("neuralLink", "connectionMode", e.target.value)
          }
          disabled={!settings.neuralLink.enabled}
          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none transition-colors disabled:opacity-50"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
          onFocus={(e) => (e.target.style.borderColor = theme.hex)}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        >
          <option value="auto">Auto (Try All)</option>
          <option value="local">Local Network Only</option>
          <option value="vpn">VPN Only</option>
          <option value="relay">Cloud Relay Only</option>
        </select>
        <p className="text-xs text-gray-500">
          {settings.neuralLink.connectionMode === "auto" &&
            "Tries local → VPN → cloud relay in order"}
          {settings.neuralLink.connectionMode === "local" &&
            "Most private, only works on same WiFi"}
          {settings.neuralLink.connectionMode === "vpn" &&
            "Requires Tailscale/ZeroTier setup"}
          {settings.neuralLink.connectionMode === "relay" &&
            "Works everywhere, uses cloud server"}
        </p>
      </div>

      {/* Relay Server URL */}
      {(settings.neuralLink.connectionMode === "auto" ||
        settings.neuralLink.connectionMode === "relay") && (
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">
            Cloud Relay Server
          </label>
          <input
            type="text"
            value={settings.neuralLink.relayServerUrl}
            onChange={(e) =>
              onUpdate("neuralLink", "relayServerUrl", e.target.value)
            }
            disabled={!settings.neuralLink.enabled}
            placeholder="https://luca-relay.vercel.app"
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white outline-none font-mono text-xs disabled:opacity-50"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />
          <p className="text-xs text-gray-500">
            Default relay server provided. You can self-host your own.
          </p>
        </div>
      )}

      {/* VPN Server URL */}
      {(settings.neuralLink.connectionMode === "auto" ||
        settings.neuralLink.connectionMode === "vpn") && (
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">
            VPN Server URL (Optional)
          </label>
          <input
            type="text"
            value={settings.neuralLink.vpnServerUrl}
            onChange={(e) =>
              onUpdate("neuralLink", "vpnServerUrl", e.target.value)
            }
            disabled={!settings.neuralLink.enabled}
            placeholder={`http://100.x.x.x:${WS_PORT} (Tailscale IP)`}
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white outline-none font-mono text-xs disabled:opacity-50"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />
          <p className="text-xs text-gray-500">
            Leave empty for auto-detection. Use Tailscale IP (100.x.x.x) if
            configured.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div
        className="p-3 rounded-lg text-xs backdrop-blur-sm"
        style={{
          backgroundColor: `${theme.hex}1a`,
          border: `1px solid ${theme.hex}4d`,
          color: theme.hex,
        }}
      >
        <div className="flex items-start gap-2">
          <Shield
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: theme.hex }}
          />
          <div>
            <div className="font-bold mb-1">Privacy & Security</div>
            <ul className="space-y-1 opacity-80" style={{ color: theme.hex }}>
              <li className="flex items-start gap-1">
                <Check
                  className="w-3 h-3 mt-0.5 flex-shrink-0"
                  style={{ color: theme.hex }}
                />
                <span>Local & VPN: 100% private, no cloud servers</span>
              </li>
              <li className="flex items-start gap-1">
                <Check
                  className="w-3 h-3 mt-0.5 flex-shrink-0"
                  style={{ color: theme.hex }}
                />
                <span>
                  Relay: End-to-end encrypted, relay can&apos;t read messages
                </span>
              </li>
              <li className="flex items-start gap-1">
                <Check
                  className="w-3 h-3 mt-0.5 flex-shrink-0"
                  style={{ color: theme.hex }}
                />
                <span>Auto mode tries local first for maximum privacy</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsNeuralLinkTab;
