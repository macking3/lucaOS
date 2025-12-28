import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Square,
  RotateCw,
  Trash2,
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Subsystem, SubsystemLog } from "../types";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  onOpenWebview?: (url: string, title: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const SubsystemDashboard: React.FC<Props> = ({
  onClose,
  onOpenWebview,
  theme,
}) => {
  const themePrimary = theme?.primary || "text-cyan-400";
  const themeBorder = theme?.border || "border-cyan-500";
  const themeBg = theme?.bg || "bg-cyan-950/10";
  const themeHex = theme?.hex || "#06b6d4";
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string | null>(
    null
  );
  const [logs, setLogs] = useState<SubsystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubsystems();
    const interval = setInterval(fetchSubsystems, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSubsystem) {
      fetchLogs(selectedSubsystem);
      const interval = setInterval(() => fetchLogs(selectedSubsystem), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedSubsystem]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fetchSubsystems = async () => {
    try {
      const res = await fetch(apiUrl("/api/subsystems/list"));
      if (res.ok) {
        const data = await res.json();
        // Backend might return direct array, { subsystems: [] }, or { subsystems: { id: {} } }
        if (Array.isArray(data)) {
          setSubsystems(data);
        } else if (
          data &&
          typeof data.subsystems === "object" &&
          data.subsystems !== null
        ) {
          if (Array.isArray(data.subsystems)) {
            setSubsystems(data.subsystems);
          } else {
            // It's an object map, convert to array
            setSubsystems(Object.values(data.subsystems));
          }
        } else {
          console.warn("Unexpected subsystems data format:", data);
          setSubsystems([]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch subsystems");
    }
  };

  const fetchLogs = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/subsystems/${id}/logs?limit=200`));
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to fetch logs");
    }
  };

  const handleStop = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/subsystems/${id}/stop`), {
        method: "POST",
      });
      if (res.ok) {
        await fetchSubsystems();
      }
    } catch (e) {
      alert("Failed to stop subsystem");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/subsystems/${id}/restart`), {
        method: "POST",
      });
      if (res.ok) {
        await fetchSubsystems();
      }
    } catch (e) {
      alert("Failed to restart subsystem");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this subsystem?")) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/subsystems/${id}`), {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchSubsystems();
        if (selectedSubsystem === id) {
          setSelectedSubsystem(null);
          setLogs([]);
        }
      }
    } catch (e) {
      alert("Failed to remove subsystem");
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const selected = subsystems.find((s) => s.id === selectedSubsystem);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 font-mono p-0 sm:p-4">
      <div
        className={`relative w-full h-full sm:h-[90vh] sm:w-[95%] max-w-7xl bg-black/60 backdrop-blur-xl border-none sm:border ${themeBorder}/30 rounded-none sm:rounded-lg flex flex-col overflow-hidden`}
        style={{
          boxShadow: `0 0 50px ${themeHex}1a`,
        }}
      >
        {/* Header */}
        <div
          className={`h-16 flex-shrink-0 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-4 sm:px-6 relative z-30`}
        >
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div
              className={`p-1.5 sm:p-2 ${themeBg} rounded border ${themeBorder}/50 ${themePrimary} flex-shrink-0`}
            >
              <Activity size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-display text-base sm:text-xl font-bold text-white tracking-widest truncate">
                SUBSYSTEM ORCHESTRATOR
              </h2>
              <div
                className={`text-[9px] sm:text-[10px] font-mono ${themePrimary} flex gap-2 sm:gap-4`}
              >
                <span>
                  ACTIVE:{" "}
                  {subsystems.filter((s) => s.status === "RUNNING").length}
                </span>
                <span className="hidden xs:inline">
                  ENGINE: PROCESS_MANAGER
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 text-slate-500 hover:text-white transition-all flex-shrink-0 cursor-pointer active:scale-95 p-2 rounded-lg hover:bg-white/5"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Subsystem List */}
          <div
            className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r ${themeBorder}/30 bg-black/40 flex flex-col flex-shrink-0 lg:h-full max-h-[30vh] lg:max-h-none`}
          >
            <div
              className={`p-3 sm:p-4 border-b ${themeBorder}/30 sticky top-0 bg-black/60 backdrop-blur-md z-10 flex-shrink-0`}
            >
              <h3
                className={`text-[10px] sm:text-xs font-bold ${themePrimary} tracking-widest uppercase`}
              >
                MANAGED PROCESSES
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 scrollbar-none">
              {subsystems.length === 0 && (
                <div className="text-slate-600 text-[10px] sm:text-xs italic p-4">
                  No subsystems running.
                </div>
              )}
              {subsystems.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubsystem(sub.id)}
                  className={`p-2 sm:p-3 border rounded cursor-pointer transition-all ${
                    selectedSubsystem === sub.id
                      ? `${themeBorder} ${themeBg}`
                      : `${themeBorder}/30 hover:${themeBorder}/50`
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          sub.status === "RUNNING"
                            ? "bg-green-500 animate-pulse"
                            : sub.status === "STOPPING"
                            ? "bg-yellow-500"
                            : sub.status === "ERROR"
                            ? "bg-red-500"
                            : "bg-slate-500"
                        }`}
                      ></div>
                      <span className="text-white font-bold text-sm">
                        {sub.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>PID:</span>
                      <span className={themePrimary}>{sub.pid || "N/A"}</span>
                    </div>
                    {sub.port && (
                      <div className="flex justify-between">
                        <span>PORT:</span>
                        <span className={themePrimary}>{sub.port}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>CPU:</span>
                      <span className={themePrimary}>
                        {sub.cpu.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>MEM:</span>
                      <span className={themePrimary}>
                        {sub.mem.toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Center: Logs Viewer */}
          <div className="flex-1 bg-black flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
            {selectedSubsystem && selected ? (
              <>
                <div
                  className={`h-auto sm:h-16 border-b ${themeBorder}/30 bg-[#080808] flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:px-6 gap-3 flex-shrink-0`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <Terminal
                      size={18}
                      className={`${themePrimary} flex-shrink-0`}
                    />
                    <div className="overflow-hidden">
                      <h3 className="text-white font-bold text-sm sm:text-base truncate">
                        {selected.name}
                      </h3>
                      <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                        Uptime: {formatUptime(Date.now() - selected.startTime)}{" "}
                        | Logs: {selected.logCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-none">
                    {selected.port && (
                      <button
                        onClick={() => {
                          if (onOpenWebview) {
                            onOpenWebview(
                              `http://localhost:${selected.port}`,
                              selected.name
                            );
                          } else {
                            window.open(
                              `http://localhost:${selected.port}`,
                              "_blank"
                            );
                          }
                        }}
                        className={`px-2 sm:px-3 py-1 ${themeBg} border ${themeBorder} ${themePrimary} text-[10px] font-bold transition-colors flex items-center gap-1.5 flex-shrink-0`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${themeHex}66`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "";
                        }}
                      >
                        <ExternalLink size={10} className="sm:w-3 sm:h-3" />{" "}
                        GHOST
                      </button>
                    )}
                    <button
                      onClick={() => handleRestart(selected.id)}
                      disabled={loading || selected.status !== "RUNNING"}
                      className="px-2 sm:px-3 py-1 bg-blue-900/20 border border-blue-700 text-blue-400 text-[10px] font-bold hover:bg-blue-900/40 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                    >
                      <RotateCw size={10} className="sm:w-3 sm:h-3" /> RESTART
                    </button>
                    <button
                      onClick={() => handleStop(selected.id)}
                      disabled={loading || selected.status !== "RUNNING"}
                      className="px-2 sm:px-3 py-1 bg-red-900/20 border border-red-700 text-red-400 text-[10px] font-bold hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Square size={10} className="sm:w-3 sm:h-3" /> STOP
                    </button>
                    <button
                      onClick={() => handleRemove(selected.id)}
                      disabled={loading}
                      className="px-2 sm:px-3 py-1 bg-slate-900/20 border border-slate-700 text-slate-400 text-[10px] font-bold hover:bg-slate-900/40 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Trash2 size={10} className="sm:w-3 sm:h-3" /> RM
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a] font-mono text-xs">
                  {logs.length === 0 && (
                    <div className="text-slate-600 italic">No logs yet...</div>
                  )}
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-slate-500">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={`ml-2 ${
                          log.type === "stderr"
                            ? "text-red-400"
                            : log.type === "error"
                            ? "text-red-600"
                            : "text-slate-300"
                        }`}
                      >
                        {log.data}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <Activity size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a subsystem to view logs</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Metrics Panel */}
          {selectedSubsystem && selected && (
            <div
              className={`w-full lg:w-64 border-t lg:border-t-0 lg:border-l ${themeBorder}/30 bg-[#080808] p-4 flex-shrink-0 lg:h-full max-h-[35vh] lg:max-h-none overflow-y-auto`}
            >
              <h3
                className={`text-[10px] sm:text-xs font-bold ${themePrimary} tracking-widest mb-4 uppercase`}
              >
                REALTIME_METRICS
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                <div className={`border ${themeBorder}/30 p-3 rounded`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu size={14} className={themePrimary} />
                    <span className="text-xs text-slate-400">CPU USAGE</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {selected.cpu.toFixed(1)}%
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all`}
                      style={{
                        width: `${Math.min(100, selected.cpu)}%`,
                        backgroundColor: themeHex,
                      }}
                    ></div>
                  </div>
                </div>
                <div className={`border ${themeBorder}/30 p-3 rounded`}>
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive size={14} className={themePrimary} />
                    <span className="text-xs text-slate-400">MEMORY</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {selected.mem.toFixed(1)} MB
                  </div>
                </div>
                <div className={`border ${themeBorder}/30 p-3 rounded`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className={themePrimary} />
                    <span className="text-xs text-slate-400">UPTIME</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {formatUptime(Date.now() - selected.startTime)}
                  </div>
                </div>
                <div className={`border ${themeBorder}/30 p-3 rounded`}>
                  <div className="text-xs text-slate-400 mb-2">STATUS</div>
                  <div
                    className={`text-sm font-bold ${
                      selected.status === "RUNNING"
                        ? "text-green-400"
                        : selected.status === "STOPPING"
                        ? "text-yellow-400"
                        : selected.status === "ERROR"
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {selected.status}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubsystemDashboard;
