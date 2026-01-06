import React, { useEffect, useState } from "react";
import { NetworkNode } from "../types";
import {
  X,
  Server,
  Smartphone,
  Router,
  Database,
  Laptop,
  Activity,
  RefreshCw,
  Tv,
  Printer,
  Watch,
  Wifi,
} from "lucide-react";
import { apiUrl } from "../config/api";
import { getGlassStyle } from "../utils/glassStyles";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const NetworkMap: React.FC<Props> = ({ onClose, theme }) => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReal, setIsReal] = useState(false);

  // Extract theme color from theme object
  const themeColor = theme?.hex || "#10b981";

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        // Try Electron IPC first (desktop app)
        if (window.electron?.ipcRenderer) {
          console.log("[NETWORK_MAP] Using Electron IPC for network scan");
          const devices = await window.electron.ipcRenderer.invoke(
            "scan-network"
          );

          if (devices && Array.isArray(devices) && devices.length > 0) {
            const realNodes: NetworkNode[] = devices.map((d: any) => ({
              id: d.id,
              label: d.label,
              type: d.type, // Type already detected by IPC handler
              ip: d.ip,
              status: "ONLINE",
            }));

            // Ensure Gateway exists for visual structure
            if (!realNodes.find((n) => n.type === "ROUTER")) {
              realNodes.unshift({
                id: "GATEWAY_INF",
                label: "Gateway",
                type: "ROUTER",
                ip: "192.168.1.1",
                status: "ONLINE",
              });
            }

            setNodes(realNodes);
            setIsReal(true);
            setLoading(false);
            console.log(
              `[NETWORK_MAP] Found ${realNodes.length} devices via IPC`
            );
            return;
          }
        }

        // Fallback to HTTP API (web version or if IPC fails)
        console.log("[NETWORK_MAP] Falling back to HTTP API");
        const res = await fetch(apiUrl("/api/network/scan"));
        if (res.ok) {
          const devices = await res.json();

          const realNodes: NetworkNode[] = devices.map((d: any) => {
            // Heuristic Type Detection based on Hostname/Label
            let type: any = "IOT";
            const l = d.label.toLowerCase();

            if (
              l.includes("gateway") ||
              l.includes("router") ||
              d.ip.endsWith(".1")
            )
              type = "ROUTER";
            else if (
              l.includes("phone") ||
              l.includes("android") ||
              l.includes("ios")
            )
              type = "MOBILE";
            else if (
              l.includes("macbook") ||
              l.includes("laptop") ||
              l.includes("desktop") ||
              l.includes("pc")
            )
              type = "LAPTOP";
            else if (
              l.includes("tv") ||
              l.includes("chromecast") ||
              l.includes("roku")
            )
              type = "TV";
            else if (
              l.includes("printer") ||
              l.includes("epson") ||
              l.includes("hp")
            )
              type = "PRINTER";
            else if (l.includes("watch")) type = "WATCH";
            else if (
              l.includes("server") ||
              l.includes("ubuntu") ||
              l.includes("linux")
            )
              type = "SERVER";
            else if (l.includes("db") || l.includes("sql")) type = "DB";

            return {
              id: d.id,
              label: d.label,
              type: type,
              ip: d.ip,
              status: "ONLINE",
            };
          });

          // Ensure Gateway exists for visual structure
          if (!realNodes.find((n) => n.type === "ROUTER")) {
            realNodes.unshift({
              id: "GATEWAY_INF",
              label: "Gateway",
              type: "ROUTER",
              ip: "192.168.1.1",
              status: "ONLINE",
            });
          }

          setNodes(realNodes);
          setIsReal(true);
        } else {
          throw new Error("Core Offline");
        }
      } catch (e) {
        // Fallback Simulation
        setIsReal(false);
        const mockNodes: NetworkNode[] = [
          {
            id: "GATEWAY",
            label: "Core Gateway",
            type: "ROUTER",
            ip: "192.168.1.1",
            status: "ONLINE",
          },
          {
            id: "SRV_01",
            label: "Neural Mainframe",
            type: "SERVER",
            ip: "192.168.1.10",
            status: "ONLINE",
          },
          {
            id: "DB_01",
            label: "Vector Store",
            type: "DB",
            ip: "192.168.1.12",
            status: "ONLINE",
          },
          {
            id: "IOT_HUB",
            label: "Smart Hub",
            type: "IOT",
            ip: "192.168.1.50",
            status: "ONLINE",
          },
          {
            id: "MOB_ADMIN",
            label: "Admin Mobile",
            type: "MOBILE",
            ip: "192.168.1.101",
            status: "ONLINE",
          },
          {
            id: "GUEST_DEV",
            label: "Unknown Device",
            type: "MOBILE",
            ip: "192.168.1.155",
            status: "COMPROMISED",
          },
        ];
        setNodes(mockNodes);
      } finally {
        setLoading(false);
      }
    };

    fetchNetwork();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "ROUTER":
        return <Router size={24} />;
      case "SERVER":
        return <Server size={24} />;
      case "DB":
        return <Database size={24} />;
      case "MOBILE":
        return <Smartphone size={24} />;
      case "LAPTOP":
        return <Laptop size={24} />;
      case "TV":
        return <Tv size={24} />;
      case "PRINTER":
        return <Printer size={24} />;
      case "WATCH":
        return <Watch size={24} />;
      default:
        return <Wifi size={24} />; // Generic IOT
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "COMPROMISED")
      return {
        color: "#ef4444",
        border: "#ef4444",
        bg: "rgba(239, 68, 68, 0.1)",
        shadow: "rgba(239, 68, 68, 0.2)",
      };
    if (status === "OFFLINE")
      return {
        color: "#64748b",
        border: "#64748b",
        bg: "#0f172a",
        shadow: "none",
      };
    return {
      color: themeColor,
      border: themeColor,
      bg: `${themeColor}1a`,
      shadow: `${themeColor}33`,
    };
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
      <div
        className="relative w-[95%] max-w-5xl h-[85vh] rounded-lg flex flex-col overflow-hidden shadow-2xl"
        style={{
          ...getGlassStyle({ themeColor }),
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
          boxShadow: `0 0 60px ${themeColor}1a, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
        }}
      >
        {/* Header */}
        <div
          className="h-16 flex items-center justify-between px-6"
          style={{
            borderBottom: `1px solid ${themeColor}33`,
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="flex items-center gap-4">
            <Activity
              className="animate-pulse"
              size={24}
              style={{ color: themeColor }}
            />
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-widest">
                NETWORK TOPOLOGY MAPPER
              </h2>
              <div className="text-[10px] font-mono text-slate-500 flex gap-2">
                <span>PROTOCOL: ARP_CACHE_ANALYSIS</span>
                <span
                  className="font-bold"
                  style={{ color: isReal ? "#10b981" : "#eab308" }}
                >
                  {isReal
                    ? `LIVE SCAN (${nodes.length} NODES)`
                    : "SIMULATION MODE"}
                </span>
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

        {/* Visualization Area */}
        <div className="flex-1 relative bg-[#020202] overflow-hidden p-10">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(${themeColor} 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
            }}
          />

          {loading ? (
            <div
              className="flex h-full items-center justify-center font-mono text-xs gap-2"
              style={{ color: themeColor }}
            >
              <RefreshCw className="animate-spin" size={16} /> MAPPING LOCAL
              SUBNET...
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Central Node (Router) */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                {nodes
                  .filter((n) => n.type === "ROUTER")
                  .map((node) => (
                    <div
                      key={node.id}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className="p-4 rounded-full border-2 bg-black relative z-10"
                        style={{
                          color: getStatusColor(node.status).color,
                          borderColor: getStatusColor(node.status).border,
                          background: getStatusColor(node.status).bg,
                          boxShadow: `0 0 30px ${
                            getStatusColor(node.status).shadow
                          }`,
                        }}
                      >
                        {getIcon(node.type)}
                      </div>
                      <div className="text-xs font-mono text-white bg-black/50 px-2 rounded border border-slate-800">
                        {node.label}
                      </div>
                      <div className="text-[8px] text-slate-500">{node.ip}</div>
                    </div>
                  ))}
              </div>

              {/* Orbiting Nodes */}
              {nodes
                .filter((n) => n.type !== "ROUTER")
                .map((node, i, arr) => {
                  const angle = (i / arr.length) * Math.PI * 2;
                  const radius = 250; // Distance from center
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <React.Fragment key={node.id}>
                      {/* Connection Line */}
                      <div
                        className="absolute top-1/2 left-1/2 h-px bg-slate-800 origin-left z-0"
                        style={{
                          width: `${radius}px`,
                          transform: `rotate(${angle}rad)`,
                        }}
                      ></div>

                      <div
                        className="absolute top-1/2 left-1/2 z-10 flex flex-col items-center gap-1 group cursor-pointer hover:scale-110 transition-transform"
                        style={{
                          transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                        }}
                      >
                        <div
                          className="p-3 rounded-full border bg-black"
                          style={{
                            color: getStatusColor(node.status).color,
                            borderColor: getStatusColor(node.status).border,
                            background: getStatusColor(node.status).bg,
                          }}
                        >
                          {getIcon(node.type)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-300 bg-black/80 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap max-w-[120px] truncate">
                          {node.label}
                        </div>
                        <div className="text-[8px] text-slate-500">
                          {node.ip}
                        </div>
                        {node.status === "COMPROMISED" && (
                          <div className="text-[8px] text-red-500 font-bold animate-pulse">
                            THREAT DETECTED
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkMap;
