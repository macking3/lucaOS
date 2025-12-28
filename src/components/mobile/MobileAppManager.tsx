import React from "react";
import { Eye, Activity, Trash2 } from "lucide-react";

interface MobileAppManagerProps {
  runningPackages: string[];
  exploitLogs: string[];
  dumpedData: any[];
  onExfiltrate: (type: "SMS" | "CALLS") => void;
  onRefreshPackages: () => void;
  onKillPackage: (pkg: string) => void;
  isAdbConnected: boolean;
}

const MobileAppManager: React.FC<MobileAppManagerProps> = ({
  runningPackages,
  exploitLogs,
  dumpedData,
  onExfiltrate,
  onRefreshPackages,
  onKillPackage,
  isAdbConnected,
}) => {
  return (
    <div className="h-full flex gap-6">
      {/* Left: Controls */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-red-950/10 border border-red-900/50 p-4">
          <h3 className="text-xs font-bold text-red-500 tracking-widest mb-3 flex items-center gap-2">
            <Eye size={12} /> DATA EXFILTRATION
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onExfiltrate("SMS")}
              className="p-2 bg-red-900/20 border border-red-800 hover:bg-red-500 hover:text-black text-red-400 text-[10px] font-bold transition-all"
            >
              DUMP SMS
            </button>
            <button
              onClick={() => onExfiltrate("CALLS")}
              className="p-2 bg-red-900/20 border border-red-800 hover:bg-red-500 hover:text-black text-red-400 text-[10px] font-bold transition-all"
            >
              DUMP CALLS
            </button>
          </div>
        </div>

        <div className="bg-red-950/10 border border-red-900/50 p-4 flex-1 flex flex-col">
          <h3 className="text-xs font-bold text-red-500 tracking-widest mb-3 flex items-center gap-2">
            <Activity size={12} /> PROCESS KILLER
          </h3>
          <button
            onClick={onRefreshPackages}
            className="mb-2 w-full py-1 bg-slate-900 border border-slate-700 text-slate-400 text-[10px] hover:text-white hover:border-white"
          >
            REFRESH LIST
          </button>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {runningPackages.map((pkg, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-black p-1 border border-slate-900 group hover:border-red-900"
              >
                <span className="text-[9px] font-mono text-slate-500 truncate w-32">
                  {pkg}
                </span>
                <button
                  onClick={() => onKillPackage(pkg)}
                  className="text-red-900 hover:text-red-500"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Terminal / Data View */}
      <div className="flex-1 bg-black border border-slate-800 flex flex-col font-mono">
        <div className="bg-slate-900 p-2 text-[10px] text-slate-500 flex justify-between">
          <span>ROOT@REMOTE_SHELL: ~ $</span>
          <span>{isAdbConnected ? "STATUS: ROOTED" : "STATUS: OFF"}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-[10px] text-green-500 space-y-1">
          {exploitLogs.map((log, i) => (
            <div
              key={i}
              className={
                log.includes("[ERR]")
                  ? "text-red-500"
                  : log.includes("[WARN]")
                  ? "text-yellow-500"
                  : "text-green-500"
              }
            >
              {log}
            </div>
          ))}
          {dumpedData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-900">
              <div className="text-white mb-2">--- BEGIN DATA DUMP ---</div>
              {dumpedData.map((record, i) => (
                <div
                  key={i}
                  className="mb-1 opacity-80 hover:opacity-100 hover:bg-white/5 p-1"
                >
                  {JSON.stringify(record)}
                </div>
              ))}
              <div className="text-white mt-2">--- END DATA DUMP ---</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileAppManager;
