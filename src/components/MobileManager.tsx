import React, { useState, useEffect } from "react";
import { MessageSquare, Wifi } from "lucide-react";
import { SmartDevice } from "../types";
import { apiUrl } from "../config/api";

// Import Refactored Components
import MobileHeader from "./mobile/MobileHeader";
import MobileScreenMirror from "./mobile/MobileScreenMirror";
import MobileAppManager from "./mobile/MobileAppManager";
import MobileFileManager from "./mobile/MobileFileManager";

interface Props {
  device: SmartDevice | null;
  onClose: () => void;
}

const MobileManager: React.FC<Props> = ({ device, onClose }) => {
  const [activeTab, setActiveTab] = useState<
    "DASH" | "FILES" | "COMMS" | "LIVE" | "EXPLOIT" | "WIRELESS"
  >("DASH");
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [files, setFiles] = useState<
    { name: string; size: string; type: string; date: string }[]
  >([]);
  const [usingRealFiles, setUsingRealFiles] = useState(false);
  const [isAdbConnected, setIsAdbConnected] = useState(false);
  const [screenImage, setScreenImage] = useState<string | null>(null);

  // Exploitation State
  const [exploitLogs, setExploitLogs] = useState<string[]>([]);
  const [dumpedData, setDumpedData] = useState<any[]>([]);
  const [wirelessIp, setWirelessIp] = useState("192.168.1.");
  const [runningPackages, setRunningPackages] = useState<string[]>([]);

  // Simulated Comms
  const messages = [
    { from: "System", text: "Uplink active.", time: "Now" },
    { from: "RedQueen", text: "Device synced successfully.", time: "1m ago" },
  ];

  const addLog = (
    msg: string,
    type: "info" | "error" | "success" | "warning" = "info"
  ) => {
    const prefix =
      type === "error"
        ? "[ERR]"
        : type === "success"
        ? "[OK]"
        : type === "warning"
        ? "[WARN]"
        : "[INF]";
    setExploitLogs((prev) => [`${prefix} ${msg}`, ...prev]);
  };

  // Check ADB Status
  useEffect(() => {
    const checkAdb = async () => {
      try {
        const res = await fetch(apiUrl("/api/mobile/status"));
        if (res.ok) {
          const data = await res.json();
          setIsAdbConnected(data.connected);
        }
      } catch (e: any) {
        console.warn("[ADB] Status check failed:", e.message || e);
        setIsAdbConnected(false);
      }
    };
    checkAdb();
    const interval = setInterval(checkAdb, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Screen Polling for Live View
  useEffect(() => {
    let interval: any;
    if (activeTab === "LIVE" && isAdbConnected) {
      const fetchScreen = async () => {
        try {
          const res = await fetch(apiUrl("/api/mobile/screen"));
          if (res.ok) {
            const data = await res.json();
            setScreenImage(data.image); // Base64 PNG
          }
        } catch (e) {
          console.error("Screenshot failed", e);
        }
      };
      fetchScreen();
      interval = setInterval(fetchScreen, 800); // ~1 FPS to avoid lag
    }
    return () => clearInterval(interval);
  }, [activeTab, isAdbConnected]);

  const sendKey = async (keyCode: number) => {
    await fetch(apiUrl("/api/mobile/input"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "KEY", keyCode }),
    });
  };

  const sendTap = async (x: number, y: number) => {
    try {
      await fetch(apiUrl("/api/mobile/input"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TAP", x, y }),
      });
    } catch (e) {
      console.error("Tap failed", e);
    }
  };

  const handleWirelessConnect = async () => {
    addLog(`ATTEMPTING WIRELESS BRIDGE: ${wirelessIp}:5555`);
    try {
      const res = await fetch(apiUrl("/api/mobile/connect-wireless"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: wirelessIp }),
      });
      const data = await res.json();
      if (data.success) addLog(`SUCCESS: ${data.result}`, "success");
      else addLog(`FAILURE: ${data.error}`, "error");
    } catch (e: any) {
      console.error("[MOBILE] Wireless connection failed:", e.message || e);
      addLog("CONNECTION TIMEOUT", "error");
    }
  };

  const handleExfiltrate = async (type: "SMS" | "CALLS") => {
    addLog(`INITIATING EXFILTRATION: ${type}...`);
    setDumpedData([]);
    try {
      const res = await fetch(apiUrl("/api/mobile/exfiltrate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDumpedData(data.data);
        addLog(`SUCCESS: ${data.data.length} RECORDS DUMPED.`, "success");
      } else {
        addLog(`EXFIL FAILED: ${data.error}`, "error");
      }
    } catch (e: any) {
      console.error("[MOBILE] Exfiltration failed:", e.message || e);
      addLog("PROTOCOL ERROR", "error");
    }
  };

  const fetchPackages = async () => {
    addLog("SCANNING INSTALLED PACKAGES...");
    try {
      const res = await fetch(apiUrl("/api/mobile/packages"));
      const data = await res.json();
      if (data.packages) setRunningPackages(data.packages);
      addLog(`FOUND ${data.packages.length} PACKAGES.`);
    } catch (e: any) {
      console.error("[MOBILE] Failed to fetch packages:", e.message || e);
      addLog("SCAN FAILED", "error");
    }
  };

  const killPackage = async (pkg: string) => {
    addLog(`KILLING PROCESS: ${pkg}...`, "warning");
    try {
      await fetch(apiUrl("/api/mobile/kill"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg }),
      });
      addLog("PROCESS TERMINATED.", "success");
    } catch (e: any) {
      console.error("[MOBILE] Failed to kill package:", e.message || e);
      addLog("CMD FAILED", "error");
    }
  };

  const handleStartNativeStream = async () => {
    addLog("LAUNCHING NATIVE VISION (SCRCPY)...", "warning");
    try {
      const res = await fetch(apiUrl("/api/mobile/scrcpy"), {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        addLog("VISION STREAM ACTIVE", "success");
      } else {
        addLog(`VISION FAILED: ${data.error}`, "error");
        if (data.hint) addLog(data.hint, "info");
      }
    } catch (e: any) {
      console.error("[MOBILE] Native stream failed to start:", e.message || e);
      addLog("VISION CONN FAILED", "error");
    }
  };

  // REAL BATTERY API
  useEffect(() => {
    // @ts-expect-error - navigator.getBattery is non-standard and not in default types
    if (navigator.getBattery) {
      // @ts-expect-error - navigator.getBattery is non-standard and not in default types
      navigator.getBattery().then((battery) => {
        const updateBattery = () => {
          setBatteryLevel(Math.floor(battery.level * 100));
          setIsCharging(battery.charging);
        };
        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
        battery.addEventListener("chargingchange", updateBattery);
      });
    }
  }, []);

  // REAL FILE LISTING
  useEffect(() => {
    const fetchFiles = async () => {
      if (activeTab === "FILES") {
        try {
          const res = await fetch(apiUrl("/api/files/list"));
          if (res.ok) {
            const data = await res.json();
            // Backend returns { path, items: [] }
            const realFiles = data.items || [];

            if (realFiles.length > 0) {
              // Map backend stats to UI format
              const formattedFiles = realFiles.map((f: any) => ({
                name: f.name,
                size: f.isDirectory ? "--" : `${(f.size / 1024).toFixed(1)} KB`,
                type: f.isDirectory
                  ? "DIR"
                  : f.name.split(".").pop()?.toUpperCase() || "FILE",
                date: new Date(f.mtime).toLocaleDateString(),
              }));
              setFiles(formattedFiles);
              setUsingRealFiles(true);
            } else {
              setFiles([]);
              setUsingRealFiles(true); // Empty but real
            }
          } else {
            throw new Error("Offline");
          }
        } catch (e: any) {
          console.warn("[MOBILE] Real file listing failed:", e.message || e);
          setFiles([]);
          setUsingRealFiles(false);
        }
      }
    };
    fetchFiles();
  }, [activeTab]);

  if (!device) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div
        className={`relative w-[90%] max-w-5xl h-[85vh] bg-[#0a0a0a] border shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg flex flex-col overflow-hidden transition-all ${
          activeTab === "EXPLOIT" || activeTab === "WIRELESS"
            ? "border-red-900 shadow-red-900/20"
            : "border-rq-blue/30 shadow-rq-blue/15"
        }`}
      >
        <MobileHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          device={device}
          batteryLevel={batteryLevel}
          isCharging={isCharging}
          isAdbConnected={isAdbConnected}
          onClose={onClose}
        />

        {/* Content */}
        <div className="flex-1 bg-black relative overflow-hidden p-6">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

          {activeTab === "DASH" && (
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Storage Map */}
              <div className="border border-slate-800 bg-slate-900/20 p-4 rounded-sm">
                <h3 className="text-xs font-bold text-rq-blue tracking-widest mb-4 border-b border-slate-800 pb-2">
                  BATTERY DIAGNOSTICS
                </h3>
                <div className="flex items-center justify-center py-8">
                  <div className="relative w-32 h-32 rounded-full border-8 border-slate-800 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-8 border-rq-blue border-t-transparent border-l-transparent rotate-45"></div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">
                        {batteryLevel}%
                      </div>
                      <div className="text-[8px] text-slate-500">
                        {isCharging ? "CHARGING" : "DRAINING"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-[10px] font-mono text-slate-400 text-center">
                  <div>REAL-TIME BATTERY API STATUS: ACTIVE</div>
                </div>
              </div>

              {/* Location Map Placeholder */}
              <div className="border border-slate-800 bg-slate-900/20 p-4 rounded-sm flex flex-col">
                <h3 className="text-xs font-bold text-rq-blue tracking-widest mb-4 border-b border-slate-800 pb-2">
                  DEVICE LOCATION
                </h3>
                <div className="flex-1 bg-slate-950 border border-slate-800 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                  <div className="w-3 h-3 bg-rq-blue rounded-full animate-ping absolute"></div>
                  <div className="w-2 h-2 bg-white rounded-full relative z-10"></div>
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-500">
                  GEOLOCATION: TRACKING
                </div>
              </div>
            </div>
          )}

          {activeTab === "WIRELESS" && (
            <div className="h-full flex flex-col items-center justify-center gap-8">
              <div className="text-center space-y-2">
                <Wifi size={48} className="mx-auto text-slate-600" />
                <h3 className="text-xl font-bold text-white">
                  WIRELESS ADB BRIDGE
                </h3>
                <p className="text-xs text-slate-500 font-mono max-w-md">
                  Connect to devices on the local subnet via TCP/IP (Port 5555).
                  <br />
                  Target device must have &quot;Wireless Debugging&quot;
                  enabled.
                </p>
              </div>

              <div className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={wirelessIp}
                  onChange={(e) => setWirelessIp(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 p-3 text-white font-mono text-sm focus:border-rq-blue outline-none"
                  placeholder="192.168.1.X"
                />
                <button
                  onClick={handleWirelessConnect}
                  className="bg-rq-blue hover:bg-blue-400 text-black font-bold px-6 text-xs tracking-widest transition-colors"
                >
                  CONNECT
                </button>
              </div>

              <div className="w-full max-w-md bg-black border border-slate-800 h-32 overflow-y-auto p-2 font-mono text-[10px] text-slate-400">
                {exploitLogs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.includes("[OK]")
                        ? "text-green-500"
                        : log.includes("[ERR]")
                        ? "text-red-500"
                        : ""
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "EXPLOIT" && (
            <MobileAppManager
              runningPackages={runningPackages}
              exploitLogs={exploitLogs}
              dumpedData={dumpedData}
              onExfiltrate={handleExfiltrate}
              onRefreshPackages={fetchPackages}
              onKillPackage={killPackage}
              isAdbConnected={isAdbConnected}
            />
          )}

          {activeTab === "LIVE" && (
            <MobileScreenMirror
              device={device}
              isAdbConnected={isAdbConnected}
              screenImage={screenImage}
              onSendKey={sendKey}
              onSendTap={sendTap}
              onStartNativeStream={handleStartNativeStream}
            />
          )}

          {activeTab === "FILES" && (
            <MobileFileManager files={files} usingRealFiles={usingRealFiles} />
          )}

          {activeTab === "COMMS" && (
            <div className="h-full flex flex-col space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-900/40 border border-slate-800 rounded flex gap-4 hover:border-rq-blue/30 transition-colors"
                >
                  <div className="p-2 bg-slate-800 rounded-full h-fit">
                    <MessageSquare size={16} className="text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white">
                        {msg.from}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {msg.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileManager;
