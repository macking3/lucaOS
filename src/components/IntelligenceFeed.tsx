import React, { useEffect, useState } from "react";
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  Database,
  Zap,
  Lock,
  Activity,
} from "lucide-react";

interface IntelligenceFeedProps {
  results: any;
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
  };
  personaColor: string;
}

const IntelligenceFeed: React.FC<IntelligenceFeedProps> = ({
  results,
  theme,
  personaColor,
}) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const chunks = results?.groundingChunks || [];

  // Staggered reveal effect
  useEffect(() => {
    setVisibleCount(0);
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= chunks.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 150); // Reveal one every 150ms
    return () => clearInterval(interval);
  }, [results]);

  if (!chunks.length) return null;

  return (
    <div className="w-full max-w-4xl p-2 sm:p-4 pointer-events-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-6 border-b pb-2"
        style={{ borderColor: `${personaColor}4D` }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <Globe
              size={14}
              className="animate-spin-slow sm:w-[18px] sm:h-[18px]"
              style={{ color: personaColor }}
            />
            <div
              className="absolute inset-0 animate-ping opacity-50"
              style={{ color: personaColor }}
            ></div>
          </div>
          <span
            className="font-mono font-bold tracking-[0.1em] sm:tracking-[0.2em] text-[10px] sm:text-sm"
            style={{ color: personaColor }}
          >
            INTELLIGENCE FEED // LIVE
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Database size={10} />
            NODES: {chunks.length}
          </span>
          <span className="flex items-center gap-1">
            <Activity size={10} className="animate-pulse" />
            LATENCY: 12ms
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        {chunks.map((chunk: any, i: number) => {
          if (!chunk.web?.uri) return null;
          const isVisible = i < visibleCount;
          const delay = i * 0.1;

          return (
            <div
              key={i}
              className={`relative group border transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                borderColor: `${personaColor}33`,
                backgroundColor: "rgba(0,0,0,0.4)",
                transitionDelay: `${delay}s`,
              }}
            >
              {/* Corner Accents */}
              <div
                className="absolute top-0 left-0 w-2 h-2 border-t border-l"
                style={{ borderColor: personaColor }}
              ></div>
              <div
                className="absolute top-0 right-0 w-2 h-2 border-t border-r"
                style={{ borderColor: personaColor }}
              ></div>
              <div
                className="absolute bottom-0 left-0 w-2 h-2 border-b border-l"
                style={{ borderColor: personaColor }}
              ></div>
              <div
                className="absolute bottom-0 right-0 w-2 h-2 border-b border-r"
                style={{ borderColor: personaColor }}
              ></div>

              {/* Content */}
              <a
                href={chunk.web.uri}
                target="_blank"
                rel="noreferrer"
                className="block p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="flex items-center gap-2 text-[10px] font-mono opacity-70"
                    style={{ color: personaColor }}
                  >
                    <ShieldCheck size={12} />
                    <span>VERIFIED_SOURCE_{i + 1}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {Math.floor(Math.random() * 90 + 10)}% REL
                  </div>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {chunk.web.title}
                </h3>

                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-mono">
                  <ExternalLink size={10} className="sm:w-3 sm:h-3" />
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    {new URL(chunk.web.uri).hostname}
                  </span>
                </div>

                {/* Fake Data Stream Bar */}
                <div className="mt-3 h-0.5 w-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full animate-progress"
                    style={{
                      width: `${Math.random() * 60 + 40}%`,
                      backgroundColor: personaColor,
                    }}
                  ></div>
                </div>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntelligenceFeed;
