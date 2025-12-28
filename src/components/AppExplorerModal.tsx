import React, { useState, useEffect } from "react";
import { X, Search, Box, ExternalLink, Loader2 } from "lucide-react";
import {
  listInstalledApps,
  executeLocalTool,
} from "../tools/handlers/LocalTools";

interface AppExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: { hex: string; primary: string; border: string; bg: string };
}

interface AppInstance {
  name: string;
  path?: string;
  id?: string;
}

const AppExplorerModal: React.FC<AppExplorerModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [filteredApps, setFilteredApps] = useState<AppInstance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadApps();
    }
  }, [isOpen]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const result = await listInstalledApps();
      if (result.success) {
        setApps(result.apps || []);
        setFilteredApps(result.apps || []);
      }
    } catch (error) {
      console.error("[APP_EXPLORER] Failed to load apps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = apps.filter((app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredApps(filtered);
  }, [searchQuery, apps]);

  const handleLaunch = async (appName: string) => {
    try {
      await executeLocalTool("openApp", { appName });
      // Optionally close modal on launch
      // onClose();
    } catch (error) {
      console.error("[APP_EXPLORER] Launch failed:", error);
      alert(`Failed to launch ${appName}. Please check permissions.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-4xl h-[80vh] bg-black/80 border rounded-lg flex flex-col shadow-2xl overflow-hidden"
        style={{
          borderColor: `${theme.hex}44`,
          boxShadow: `0 0 30px ${theme.hex}22`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: `${theme.hex}22` }}
        >
          <div className="flex items-center gap-3">
            <Box className={theme.primary} size={20} />
            <div>
              <h2 className="text-lg font-bold tracking-widest text-white uppercase italic">
                App Explorer
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                DISCOVERED: {apps.length} NODES // STATUS:{" "}
                {loading ? "SCANNING..." : "IDLE"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors group"
          >
            <X className="text-slate-400 group-hover:text-white" size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div
          className="p-4 bg-white/5 border-b"
          style={{ borderColor: `${theme.hex}11` }}
        >
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="SEARCH NEURAL NODES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded py-2 pl-10 pr-4 text-xs font-mono text-white focus:outline-none focus:border-white/20 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* App Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className={`animate-spin ${theme.primary}`} size={32} />
              <p className="text-xs font-mono text-slate-500 animate-pulse">
                SYNCHRONIZING SYSTEM REGISTRY...
              </p>
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredApps.map((app, index) => (
                <div
                  key={index}
                  className="group bg-white/5 border border-white/10 p-3 rounded hover:bg-white/10 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center flex-shrink-0 group-hover:border group-hover:border-white/20">
                      <Box
                        size={14}
                        className="text-slate-500 group-hover:text-white transition-colors"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-xs font-bold text-slate-300 group-hover:text-white truncate">
                        {app.name}
                      </h3>
                      <p className="text-[8px] text-slate-600 truncate font-mono">
                        {app.path || app.id || "GENERIC_NODE"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLaunch(app.name)}
                    className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded transition-all"
                    title="Launch Application"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Search size={48} className="mb-4" />
              <p className="text-sm font-mono tracking-widest">
                NO MATCHES FOUND
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 bg-black/40 border-t flex justify-between items-center"
          style={{ borderColor: `${theme.hex}22` }}
        >
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-500 tracking-tighter">
                CROSS_PLATFORM_ENGINE_ACTIVE
              </span>
            </div>
          </div>
          <p className="text-[9px] font-mono text-slate-600">
            TOTAL_NODES: {filteredApps.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppExplorerModal;
