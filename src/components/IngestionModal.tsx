import React, { useState } from "react";
import { X, Github, Download, Terminal, Database } from "lucide-react";

interface Props {
  onClose: () => void;
  onIngest: (url: string) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const IngestionModal: React.FC<Props> = ({ onClose, onIngest, theme }) => {
  const themePrimary = theme?.primary || "text-green-400";
  const themeBorder = theme?.border || "border-green-500";
  const themeBg = theme?.bg || "bg-green-950/10";
  const themeHex = theme?.hex || "#22c55e";
  const [url, setUrl] = useState("");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div
        className={`w-full max-w-lg bg-black/60 backdrop-blur-xl border ${themeBorder}/30 rounded-lg p-4 sm:p-6 relative overflow-hidden`}
        style={{ boxShadow: `0 0 50px ${themeHex}1a` }}
      >
        <div
          className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent opacity-50`}
          style={{
            background: `linear-gradient(to right, transparent, ${themeHex}, transparent)`,
          }}
        ></div>

        {/* Header */}
        <div
          className={`h-16 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-6 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-2 ${themeBg} rounded border ${themeBorder}/50 ${themePrimary}`}
            >
              <Github size={24} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-widest">
                KNOWLEDGE INGESTION
              </h2>
              <div
                className={`text-[10px] font-mono ${themePrimary} flex gap-4`}
              >
                <span>INTEGRATE EXTERNAL OPEN SOURCE INTELLIGENCE</span>
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

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400">
              TARGET REPOSITORY URL
            </label>
            <div className="relative">
              <Terminal
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                size={16}
              />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className={`w-full bg-black border border-slate-800 rounded p-3 pl-10 text-sm font-mono ${themePrimary} focus:outline-none placeholder:text-slate-700`}
                style={
                  {
                    borderColor: "rgb(30 41 59)",
                    "--tw-ring-color": themeHex,
                  } as any
                }
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = themeHex;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgb(30 41 59)";
                }}
                autoFocus
              />
            </div>
          </div>

          <div
            className={`p-4 border ${themeBorder}/30 ${themeBg} rounded text-[10px] font-mono text-slate-400`}
          >
            <div
              className={`flex items-center gap-2 ${themePrimary} mb-2 font-bold`}
            >
              <Database size={12} /> NEURAL PROTOCOL:
            </div>
            <ul className="space-y-1 list-disc pl-4">
              <li>Deep recursive scan of source trees.</li>
              <li>Extracts core logic patterns (Python/JS/Rust).</li>
              <li>Vectorizes capabilities for autonomous usage.</li>
              <li>Auto-generates wrapper scripts via Engineer Persona.</li>
            </ul>
          </div>

          <button
            onClick={() => {
              if (url) onIngest(url);
            }}
            disabled={!url}
            className={`w-full py-4 font-bold tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{
              backgroundColor: themeHex,
              color: "#000000",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${themeHex}cc`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeHex;
            }}
          >
            <Download size={18} /> INITIATE TRANSFER
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngestionModal;
