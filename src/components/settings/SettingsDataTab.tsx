import React from "react";
import { Download, Trash2, LogOut } from "lucide-react";
import { memoryService } from "../../services/memoryService";

interface SettingsDataTabProps {
  memoryStats: { count: number };
  loadMemoryStats: () => void;
  theme: {
    primary: string;
    hex: string;
  };
}

const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  memoryStats,
  loadMemoryStats,
  theme,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 p-4 rounded-lg flex items-center justify-between backdrop-blur-sm">
        <div>
          <h3 className="font-bold text-gray-200">Total Memories</h3>
          <p className="text-xs text-gray-500">Stored facts & vectors</p>
        </div>
        <div className="text-3xl font-mono" style={{ color: theme.hex }}>
          {memoryStats.count}
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => {
            const blob = new Blob(
              [JSON.stringify(memoryService.getAllMemories(), null, 2)],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `luca_memory_dump_${Date.now()}.json`;
            a.click();
          }}
          className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-between text-sm text-gray-300 transition-colors backdrop-blur-sm"
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Memory JSON
          </span>
        </button>

        <button
          onClick={() => {
            if (
              confirm(
                "DANGER: This will wipe all long-term memories. Continue?"
              )
            ) {
              memoryService.wipeMemory();
              loadMemoryStats();
            }
          }}
          className="w-full p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg flex items-center justify-between text-sm text-red-400 transition-colors backdrop-blur-sm shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Factory Reset Memory
          </span>
        </button>
      </div>

      <div className="space-y-2 pt-4 border-t border-white/10">
        <label className="text-sm font-bold text-gray-400">Chat History</label>
        <button
          onClick={() => {
            localStorage.removeItem("LUCA_CHAT_HISTORY_V1");
            alert("Chat history cleared. Restart app to see effect.");
          }}
          className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-between text-sm text-gray-300 transition-colors backdrop-blur-sm"
        >
          <span className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Clear Chat Session
          </span>
        </button>
      </div>
    </div>
  );
};

export default SettingsDataTab;
