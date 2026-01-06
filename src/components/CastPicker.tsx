import React, { useEffect, useState } from "react";
import {
  Cast,
  Monitor,
  Tv,
  Smartphone,
  X,
  QrCode,
  Wifi,
  Shield,
} from "lucide-react";
import { SmartDevice, DeviceType } from "../types";
import QRCode from "qrcode";
import { apiUrl, FRONTEND_PORT } from "../config/api";

interface CastPickerProps {
  devices: SmartDevice[];
  onSelect: (deviceId: string) => void;
  onCancel: () => void;
}

type CastMethod = "SELECT" | "QR" | "HOTSPOT" | "LOCAL";

const CastPicker: React.FC<CastPickerProps> = ({
  devices,
  onSelect,
  onCancel,
}) => {
  const [method, setMethod] = useState<CastMethod>("SELECT");
  const [qrUrl, setQrUrl] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [lanIp, setLanIp] = useState("localhost");

  // Use query param for routing as handled in index.tsx
  const localUrl = `http://${lanIp}:${FRONTEND_PORT}?mode=visual_core`;

  useEffect(() => {
    // Fetch LAN IP for mobile connection
    fetch(apiUrl("/api/network/ip"))
      .then((res) => res.json())
      .then((data) => {
        if (data.addresses && data.addresses.length > 0) {
          // Prefer EN0 or similar, but just take first non-internal for now
          const wifi = data.addresses.find(
            (a: any) => a.name.includes("en0") || a.name.includes("wlan")
          );
          setLanIp(wifi ? wifi.address : data.addresses[0].address);
        }
      })
      .catch((err) => console.error("Failed to fetch IP", err));
  }, []);

  useEffect(() => {
    QRCode.toDataURL(localUrl)
      .then((url) => setQrUrl(url))
      .catch((err) => console.error(err));
  }, [localUrl]);

  const handleActivateBeacon = async () => {
    setIsActivating(true);
    try {
      const res = await fetch(apiUrl("/api/system/hotspot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "on" }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBeaconActive(true);
      }
    } catch (e) {
      console.error("Failed to activate beacon", e);
    } finally {
      setIsActivating(false);
    }
  };

  // Filter for devices that likely support casting (TVs, Screens, etc.)
  const castableDevices = devices.filter(
    (d) =>
      d.type === DeviceType.SMART_TV ||
      d.type === DeviceType.MOBILE ||
      d.type === DeviceType.WIRELESS_NODE
  );

  return (
    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-200">
      <div className="w-full max-w-md bg-black border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-cyan-950/20">
          <div className="flex items-center gap-3">
            <Cast className="text-cyan-400" size={20} />
            <div>
              <h3 className="text-white font-bold tracking-wide">
                CAST TARGET
              </h3>
              <p className="text-[10px] text-cyan-500 font-mono">
                {method === "SELECT"
                  ? "SELECT CONNECTION METHOD"
                  : "ESTABLISH UPLINK"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (method === "SELECT") onCancel();
              else {
                setMethod("SELECT");
                setIsBeaconActive(false);
              }
            }}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar min-h-[300px] flex flex-col justify-center">
          {/* METHOD SELECTION SCREEN */}
          {method === "SELECT" && (
            <div className="grid gap-2 p-2">
              <button
                onClick={() => setMethod("QR")}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-slate-800 text-cyan-400 group-hover:scale-110 transition-transform">
                  <QrCode size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-cyan-300">
                    Neural Link (QR)
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Scan code to pair mobile device
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod("HOTSPOT")}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-slate-800 text-purple-400 group-hover:scale-110 transition-transform">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-purple-300">
                    Secure Hotspot
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Direct P2P Encrypted Uplink
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod("LOCAL")}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-green-500/50 hover:bg-green-500/10 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-slate-800 text-green-400 group-hover:scale-110 transition-transform">
                  <Wifi size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-green-300">
                    Local Network
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Cast to TV/Displays on WiFi
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* QR MODE */}
          {method === "QR" && (
            <div className="p-4 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-3 bg-white p-2 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {qrUrl ? (
                  <img src={qrUrl} alt="Connect QR" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <QrCode size={32} className="animate-pulse" />
                  </div>
                )}
              </div>
              <h4 className="text-white font-bold text-sm mt-4">SCAN TARGET</h4>
              <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 mb-4">
                Use your mobile device to scan and establish visual uplink.
              </p>
              <div className="w-full bg-black/40 border border-white/10 rounded p-2 flex flex-col items-center max-w-[250px]">
                <span className="text-[9px] text-cyan-500/80 uppercase font-mono tracking-wider mb-1">
                  Manual Link
                </span>
                <code className="text-[10px] text-slate-300 bg-transparent font-mono select-all break-all">
                  {localUrl}
                </code>
              </div>
            </div>
          )}

          {/* HOTSPOT MODE */}
          {method === "HOTSPOT" && (
            <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div
                className={`w-20 h-20 mx-auto bg-purple-900/20 rounded-full flex items-center justify-center mb-4 ${
                  isBeaconActive ? "bg-purple-500/30" : "animate-pulse"
                }`}
              >
                <Shield
                  size={32}
                  className={
                    isBeaconActive ? "text-green-400" : "text-purple-500"
                  }
                />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {isBeaconActive ? "BEACON ACTIVE" : "SECURE HOTSPOT"}
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-mono">
                {isBeaconActive
                  ? "Encrypted P2P tunnel established."
                  : "Initializing P2P encrypted broadcasting..."}
                <br />
                SSID: <span className="text-purple-400">LUCA_CORE_SECURE</span>
              </p>
              {!isBeaconActive ? (
                <button
                  onClick={handleActivateBeacon}
                  disabled={isActivating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded tracking-wider transition-colors disabled:opacity-50"
                >
                  {isActivating ? "ACTIVATING..." : "ACTIVATE BEACON"}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest rounded border border-green-500/30 animate-pulse">
                    Broadcasting...
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await fetch(apiUrl("/api/system/hotspot"), {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "off" }),
                        });
                      } catch (e) {
                        console.error(e);
                      }
                      setIsBeaconActive(false);
                    }}
                    className="mt-4 text-[10px] text-slate-500 hover:text-slate-300 underline"
                  >
                    Reset Beacon
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LOCAL NETWORK MODE */}
          {method === "LOCAL" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
              <div className="px-4 py-2 text-[10px] font-mono text-cyan-500/50 uppercase tracking-wider mb-2">
                Discovered Nodes
              </div>

              {castableDevices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                  <Wifi size={32} className="mb-2 text-slate-600" />
                  <div className="text-slate-500 font-mono text-xs">
                    NO EXTERNAL DISPLAYS DETECTED
                  </div>
                  <div className="text-[10px] text-slate-700 mt-1">
                    Scanning local subnet...
                  </div>
                </div>
              ) : (
                <div className="space-y-1 px-2">
                  {castableDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => onSelect(device.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-green-500/30 group transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-green-400 group-hover:bg-green-500/10 transition-colors">
                          {device.type === DeviceType.SMART_TV && (
                            <Tv size={20} />
                          )}
                          {device.type === DeviceType.MOBILE && (
                            <Smartphone size={20} />
                          )}
                          {device.type === DeviceType.WIRELESS_NODE && (
                            <Monitor size={20} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-200 group-hover:text-green-300">
                            {device.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 group-hover:text-green-500/70">
                            {device.location} • {device.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      {device.isOn ? (
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CastPicker;
