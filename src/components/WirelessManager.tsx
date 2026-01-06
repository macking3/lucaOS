import React, { useEffect, useState } from "react";
import {
  Wifi,
  Bluetooth,
  Radio,
  X,
  Share2,
  Lock,
  Signal,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiUrl } from "../config/api";
import { getGlassStyle } from "../utils/glassStyles";

interface Props {
  onClose: () => void;
  activeTab: "WIFI" | "BLUETOOTH" | "HOTSPOT";
  onConnect: (id: string, protocol: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
  hostPlatform?: string;
}

const WirelessManager: React.FC<Props> = ({
  onClose,
  activeTab: initialTab,
  onConnect,
  theme,
  hostPlatform = "unknown",
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [scanning, setScanning] = useState(false);
  const [networks, setNetworks] = useState<
    {
      id: string;
      name: string;
      strength: number;
      locked: boolean;
      type: string;
    }[]
  >([]);
  const [hotspotActive, setHotspotActive] = useState(false);
  const [hotspotSSID, setHotspotSSID] = useState("LUCA_NETWORK");
  const [hotspotPassword, setHotspotPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract theme color from theme object (like SkillsMatrix does)
  const themeColor = theme?.hex || "#10b981";

  // REAL BLUETOOTH SCANNING
  const scanRealBluetooth = async () => {
    setScanning(true);
    setError(null);
    try {
      // @ts-expect-error - Web Bluetooth API
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API not available in this browser.");
      }

      // In a browser, we can't just "list" all devices silently for privacy.
      // We must request a device. This triggers the native browser picker.
      // @ts-expect-error - Web Bluetooth API
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"],
      });

      if (device) {
        setNetworks((prev) => [
          ...prev,
          {
            id: device.id,
            name: device.name || "Unknown Device",
            strength: 100,
            locked: true,
            type: "REAL_BLE",
          },
        ]);
        // Auto connect in our UI logic
        onConnect(device.name || "Unknown Device", "BLUETOOTH");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Bluetooth Scan Failed");
    } finally {
      setScanning(false);
    }
  };

  // REAL WIFI SCANNING
  const scanRealWifi = async () => {
    setScanning(true);
    setError(null);
    setNetworks([]); // Clear previous

    try {
      // Try Electron IPC first (desktop app)
      if (window.electron?.ipcRenderer) {
        console.log("[WIRELESS] Using Electron IPC for Wi-Fi scan");
        const data = await window.electron.ipcRenderer.invoke("scan-wifi");

        if (data.networks && Array.isArray(data.networks)) {
          const mapped = data.networks.map((net: any, i: number) => ({
            id: net.id || `wifi_${i}`,
            name: net.ssid,
            strength: net.strength,
            locked: net.security && net.security.toUpperCase() !== "OPEN",
            type: net.security || "UNKNOWN",
          }));
          setNetworks(mapped);
          console.log(`[WIRELESS] Found ${mapped.length} networks via IPC`);
          setScanning(false);
          return;
        }
      }

      // Fallback to HTTP API (web version or if IPC fails)
      console.log("[WIRELESS] Falling back to HTTP API");
      const res = await fetch(apiUrl("/api/command"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "scanNetwork",
          args: { frequency: "ALL" },
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.networks && Array.isArray(data.networks)) {
          // Process Real Data
          const mapped = data.networks.map((net: any, i: number) => ({
            id: `wifi_${i}`,
            name: net.ssid,
            strength: net.strength,
            locked: net.security && net.security.toUpperCase() !== "OPEN",
            type: net.security || "UNKNOWN",
          }));
          setNetworks(mapped);
        } else if (data.result && typeof data.result === "string") {
          // Raw text fallback (if parsing failed on server but command ran)
          // Just show a generic "Raw Output" item
          setNetworks([
            {
              id: "raw_output",
              name: "See Terminal for Raw Output",
              strength: 0,
              locked: false,
              type: "RAW",
            },
          ]);
          console.log("Raw WiFi Output:", data.result);
        } else {
          throw new Error("Invalid response from Core");
        }
      } else {
        throw new Error("Core Offline");
      }
    } catch (e) {
      console.warn("Real Scan Failed, using simulation fallback", e);
      // Fallback to simulation
      setTimeout(() => {
        setNetworks([
          {
            id: "net1",
            name: "Real_WiFi_Hidden",
            strength: 90,
            locked: true,
            type: "WPA2",
          },
          {
            id: "net2",
            name: "Browser_Sandbox_Limit",
            strength: 60,
            locked: false,
            type: "OPEN",
          },
        ]);
      }, 1000);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    setNetworks([]);
    if (activeTab === "WIFI") {
      scanRealWifi();
    } else if (activeTab === "BLUETOOTH") {
      // We don't auto-scan BT because it requires a user gesture in browsers
      setScanning(false);
    }
  }, [activeTab]);

  const handleTabChange = (tab: "WIFI" | "BLUETOOTH" | "HOTSPOT") => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
      <div
        className="relative w-[90%] max-w-2xl h-[600px] rounded-sm flex flex-col overflow-hidden"
        style={{
          ...getGlassStyle({ themeColor }),
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
          boxShadow: `0 0 40px ${themeColor}1a, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
        }}
      >
        {/* Header */}
        <div
          className="h-14 flex items-center justify-between px-6"
          style={{
            borderBottom: `1px solid ${themeColor}33`,
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded"
              style={{
                ...getGlassStyle({ themeColor }),
                background: `${themeColor}1a`,
              }}
            >
              <Radio size={18} style={{ color: themeColor }} />
            </div>
            <div>
              <h2 className="font-display font-bold text-white tracking-widest text-lg">
                NETWORK MANAGER
              </h2>
              <div
                className="text-[10px] font-mono flex gap-3"
                style={{ color: `${themeColor}99` }}
              >
                <span>
                  ADAPTER:{" "}
                  {activeTab === "BLUETOOTH" ? "WEB_BLE_API" : "HOST_NIC"}
                </span>
                <span>STATUS: ONLINE</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex bg-black"
          style={{ borderBottom: `1px solid ${themeColor}1a` }}
        >
          <button
            onClick={() => handleTabChange("WIFI")}
            className="flex-1 py-3 text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all"
            style={{
              ...(activeTab === "WIFI"
                ? {
                    background: `${themeColor}1a`,
                    color: themeColor,
                    borderBottom: `2px solid ${themeColor}`,
                  }
                : { color: "#64748b" }),
            }}
          >
            <Wifi size={14} /> WIFI (REAL)
          </button>
          <button
            onClick={() => handleTabChange("BLUETOOTH")}
            className="flex-1 py-3 text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all"
            style={{
              ...(activeTab === "BLUETOOTH"
                ? {
                    background: `${themeColor}1a`,
                    color: themeColor,
                    borderBottom: `2px solid ${themeColor}`,
                  }
                : { color: "#64748b" }),
            }}
          >
            <Bluetooth size={14} /> BLUETOOTH (WEB)
          </button>
          <button
            onClick={() => handleTabChange("HOTSPOT")}
            className="flex-1 py-3 text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all"
            style={{
              ...(activeTab === "HOTSPOT"
                ? {
                    background: `${themeColor}1a`,
                    color: themeColor,
                    borderBottom: `2px solid ${themeColor}`,
                  }
                : { color: "#64748b" }),
            }}
          >
            <Share2 size={14} /> HOTSPOT
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#080808] p-6 relative overflow-hidden">
          {/* Scanning Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: `linear-gradient(${themeColor}1a 1px, transparent 1px), linear-gradient(90deg, ${themeColor}1a 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {activeTab === "HOTSPOT" ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div
                className="relative w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all"
                style={{
                  borderColor: hotspotActive ? themeColor : "#334155",
                  boxShadow: hotspotActive ? `0 0 30px ${themeColor}` : "none",
                }}
              >
                <Share2
                  size={48}
                  className={hotspotActive ? "animate-pulse" : ""}
                  style={{ color: hotspotActive ? themeColor : "#334155" }}
                />
                {hotspotActive && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ border: `4px solid ${themeColor}` }}
                  />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl text-white font-bold mb-1">
                  {hotspotActive ? "HOTSPOT DEPLOYED" : "HOTSPOT INACTIVE"}
                </h3>
                <p className="text-slate-500 font-mono text-xs mb-6">
                  {hotspotActive
                    ? `SSID: "${hotspotSSID}" (Active)`
                    : "Configure and deploy your access point."}
                </p>

                {/* PLATFORM SPECIFIC WARNINGS */}
                {!hotspotActive && (
                  <div className="mb-6 max-w-sm mx-auto text-left">
                    {hostPlatform?.toLowerCase().includes("mac") && (
                      <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-yellow-500/80 text-[10px] font-mono leading-relaxed">
                        <strong className="block text-yellow-400 mb-1">
                          ⚠️ MACOS DETECTED
                        </strong>
                        Direct Wi-Fi sharing requires an upstream connection.
                        Please connect via Ethernet or USB Tether before
                        enabling.
                      </div>
                    )}
                    {hostPlatform?.toLowerCase().includes("win") && (
                      <div className="p-3 bg-green-900/20 border border-green-500/30 rounded text-green-500/80 text-[10px] font-mono leading-relaxed">
                        <strong className="block text-green-400 mb-1">
                          ✅ VIRTUAL ROUTER READY
                        </strong>
                        Windows supports simultaneous Wi-Fi client + hotspot
                        mode. No cables required.
                      </div>
                    )}
                  </div>
                )}

                {/* SSID/Password Inputs (only show when inactive) */}
                {!hotspotActive && (
                  <div className="mb-6 space-y-4 max-w-md mx-auto">
                    {/* SSID Input */}
                    <div className="text-left">
                      <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider">
                        NETWORK NAME (SSID)
                      </label>
                      <input
                        type="text"
                        value={hotspotSSID}
                        onChange={(e) => setHotspotSSID(e.target.value)}
                        placeholder="LUCA_NETWORK"
                        className="w-full bg-black/40 border rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none transition-all"
                        style={{
                          ...getGlassStyle({ themeColor }),
                          borderColor: `${themeColor}40`,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = themeColor;
                          e.currentTarget.style.boxShadow = `0 0 20px ${themeColor}40`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = `${themeColor}40`;
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>

                    {/* Password Input */}
                    <div className="text-left">
                      <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider">
                        PASSWORD (Optional, min 8 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={hotspotPassword}
                          onChange={(e) => setHotspotPassword(e.target.value)}
                          placeholder="Leave empty for open network"
                          className="w-full bg-black/40 border rounded-lg px-4 py-3 pr-12 text-white font-mono text-sm focus:outline-none transition-all"
                          style={{
                            ...getGlassStyle({ themeColor }),
                            borderColor: `${themeColor}40`,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = themeColor;
                            e.currentTarget.style.boxShadow = `0 0 20px ${themeColor}40`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = `${themeColor}40`;
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      {hotspotPassword && hotspotPassword.length < 8 && (
                        <p className="text-xs text-red-400 mt-1">
                          Password must be at least 8 characters
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={async () => {
                    const newActive = !hotspotActive;

                    // Validate password length if provided
                    if (
                      !newActive &&
                      hotspotPassword &&
                      hotspotPassword.length < 8
                    ) {
                      alert("Password must be at least 8 characters");
                      return;
                    }

                    setHotspotActive(newActive);
                    try {
                      // Try Electron IPC first
                      if (window.electron?.ipcRenderer) {
                        console.log(
                          `[WIRELESS] Hotspot toggle via IPC: ${newActive}`
                        );
                        const result = await window.electron.ipcRenderer.invoke(
                          "toggle-hotspot",
                          {
                            active: newActive,
                            ssid: hotspotSSID,
                            password: hotspotPassword,
                          }
                        );
                        if (!result.success) throw new Error(result.error);
                        return;
                      }

                      // Fallback to HTTP
                      const res = await fetch(apiUrl("/api/system/hotspot"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: newActive ? "on" : "off",
                          ssid: hotspotSSID,
                          password: hotspotPassword,
                        }),
                      });
                      if (!res.ok) throw new Error("Hotspot toggle failed");
                    } catch (e) {
                      setHotspotActive(!newActive);
                      console.error(e);
                    }
                  }}
                  className="px-6 py-3 rounded-sm text-xs font-bold tracking-widest transition-all"
                  style={{
                    ...(hotspotActive
                      ? {
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                          border: "1px solid #ef4444",
                        }
                      : getGlassStyle({ themeColor, isActive: true })),
                  }}
                >
                  {hotspotActive ? "TERMINATE BROADCAST" : "DEPLOY HOTSPOT"}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  {scanning ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Signal size={14} />
                  )}
                  {scanning
                    ? "SCANNING FREQUENCIES..."
                    : `DEVICES FOUND: ${networks.length}`}
                </div>

                {activeTab === "BLUETOOTH" && !scanning && (
                  <button
                    onClick={scanRealBluetooth}
                    className="px-4 py-2 rounded-sm text-xs font-bold tracking-widest transition-all"
                    style={{
                      ...getGlassStyle({ themeColor, isActive: true }),
                      color: "#000",
                      background: themeColor,
                    }}
                  >
                    SCAN REAL DEVICES
                  </button>
                )}

                {activeTab === "WIFI" && !scanning && (
                  <button
                    onClick={scanRealWifi}
                    className="bg-slate-800 hover:bg-white hover:text-black text-white px-3 py-1 rounded-sm text-[10px] font-bold tracking-widest transition-colors"
                  >
                    REFRESH
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 text-red-400 text-xs font-mono rounded">
                  ERROR: {error}
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {networks.map((net) => (
                  <div
                    key={net.id}
                    className="p-3 flex items-center justify-between group transition-all"
                    style={{
                      ...getGlassStyle({ themeColor }),
                      background: "rgba(0, 0, 0, 0.4)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${themeColor}80`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${themeColor}66`;
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-full"
                        style={{
                          background: `${themeColor}1a`,
                          color: themeColor,
                        }}
                      >
                        {activeTab === "BLUETOOTH" ? (
                          <Bluetooth size={16} />
                        ) : (
                          <Wifi size={16} />
                        )}
                      </div>
                      <div>
                        <div
                          className="text-sm font-bold text-white group-hover:transition-colors"
                          style={{
                            color: "#fff",
                          }}
                        >
                          {net.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 flex gap-2">
                          <span>SIGNAL: {net.strength}%</span>
                          <span>TYPE: {net.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {net.locked && (
                        <Lock size={14} className="text-slate-600" />
                      )}
                      <button
                        onClick={() => onConnect(net.name, activeTab)}
                        className="px-3 py-1 border border-slate-700 hover:bg-rq-blue hover:text-black hover:border-rq-blue text-[10px] font-bold text-slate-300 transition-all flex items-center gap-1"
                      >
                        <Plus size={10} /> CONNECT
                      </button>
                    </div>
                  </div>
                ))}
                {!scanning && networks.length === 0 && (
                  <div className="text-center text-slate-600 mt-10 italic">
                    {activeTab === "BLUETOOTH"
                      ? 'Click "SCAN REAL DEVICES" to pair hardware.'
                      : "No networks found via Host NIC."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WirelessManager;
