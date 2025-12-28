import React, { useState } from "react";
import { Maximize2, Minimize2, MoreVertical } from "lucide-react";

interface DataRoomTileProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onExpand?: () => void;
  isExpanded?: boolean;
  themeHex?: string;
}

const DataRoomTile: React.FC<DataRoomTileProps> = ({
  title,
  icon,
  children,
  className = "",
  onExpand,
  isExpanded = false,
  themeHex = "#06b6d4", // Default Cyan
}) => {
  return (
    <div
      className={`relative flex flex-col bg-black/40 backdrop-blur-md border rounded-xl overflow-hidden transition-all duration-300 group ${className} ${
        isExpanded ? "z-50 m-0" : ""
      }`}
      style={{
        borderColor: `${themeHex}33`,
        boxShadow: isExpanded
          ? `0 0 50px ${themeHex}33`
          : "0 0 15px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = `${themeHex}66`)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = `${themeHex}33`)
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex items-center" style={{ color: themeHex }}>
              {icon}
            </div>
          )}
          <div
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: themeHex }}
          >
            {title}
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}

        {/* Corner Accents */}
        <div
          className="absolute top-0 left-0 w-2 h-2 border-l border-t"
          style={{ borderColor: `${themeHex}4d` }}
        />
        <div
          className="absolute top-0 right-0 w-2 h-2 border-r border-t"
          style={{ borderColor: `${themeHex}4d` }}
        />
        <div
          className="absolute bottom-0 left-0 w-2 h-2 border-l border-b"
          style={{ borderColor: `${themeHex}4d` }}
        />
        <div
          className="absolute bottom-0 right-0 w-2 h-2 border-r border-b"
          style={{ borderColor: `${themeHex}4d` }}
        />
      </div>

      {/* Grid Overlay Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to top, ${themeHex}0d, transparent)`,
        }}
      />
    </div>
  );
};

export default DataRoomTile;
