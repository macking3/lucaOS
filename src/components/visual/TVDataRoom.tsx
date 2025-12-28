import React from "react";
import { Monitor, Activity } from "lucide-react";
import DataRoomTile from "../DataRoomTile";

interface TVDataRoomProps {
  themeHex: string;
  vitals: { cpu: number; mem: number };
}

const TVDataRoom: React.FC<TVDataRoomProps> = ({ themeHex, vitals }) => {
  return (
    <div className="h-screen w-screen bg-black p-8 grid grid-cols-2 gap-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <Monitor size={32} style={{ color: themeHex }} />
          <span className="text-xl font-black text-white tracking-[0.3em]">
            DATA ROOM // MIRROR
          </span>
        </div>
        <div className="text-white/50 font-mono">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Tile 1: System Vitals (Mirrored from Dashboard Logic) */}
      <DataRoomTile
        title="SYSTEM OBSERVABILITY"
        icon={<Activity size={24} />}
        themeHex={themeHex}
      >
        <div className="p-8 space-y-8 h-full flex flex-col justify-center">
          <div className="space-y-2">
            <div
              className="flex justify-between text-2xl font-mono opacity-80"
              style={{ color: themeHex }}
            >
              <span>CPU LOAD</span>
              <span>{vitals.cpu}%</span>
            </div>
            <div
              className="w-full h-4 rounded-full overflow-hidden"
              style={{ backgroundColor: `${themeHex}33` }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${vitals.cpu}%`, backgroundColor: themeHex }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div
              className="flex justify-between text-2xl font-mono opacity-80"
              style={{ color: themeHex }}
            >
              <span>MEMORY</span>
              <span>
                {Math.round((vitals.mem / 1024 / 1024 / 1024) * 10) / 10} GB
              </span>
            </div>
            <div
              className="w-full h-4 rounded-full overflow-hidden"
              style={{ backgroundColor: `${themeHex}33` }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${(vitals.mem / 16000000000) * 100}%`,
                  backgroundColor: themeHex,
                }}
              />
            </div>
          </div>
        </div>
      </DataRoomTile>

      {/* Tile 2: Active Vision (Placeholder for now, or piped if we send stream URL) */}
      {/* Since WebRTC isn't set up for casting stream yet, show scan animation */}
      <DataRoomTile
        title="VISION FEED TARGET"
        icon={<Monitor size={24} />}
        themeHex={themeHex}
      >
        <div className="w-full h-full flex items-center justify-center bg-black/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
          <div className="text-center">
            <div
              className="w-32 h-32 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-8"
              style={{
                borderColor: `${themeHex}50`,
                borderTopColor: themeHex,
              }}
            />
            <div className="text-2xl font-mono text-white/50 tracking-widest">
              AWAITING VISION UPLINK
            </div>
          </div>
        </div>
      </DataRoomTile>
    </div>
  );
};

export default TVDataRoom;
