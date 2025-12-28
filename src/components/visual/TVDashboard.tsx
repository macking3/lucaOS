import React from "react";
import { Monitor, Wifi, Cpu, Database } from "lucide-react";

interface TVDashboardProps {
  themeHex: string;
  status: string;
  activeTask: string;
  vitals: { cpu: number; mem: number };
}

const TVDashboard: React.FC<TVDashboardProps> = ({
  themeHex,
  status,
  activeTask,
  vitals,
}) => {
  return (
    <div className="h-screen w-screen bg-black font-mono flex flex-col p-12 overflow-hidden relative text-white">
      {/* Dynamic Background Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

      {/* Ambient Glow */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[150px] opacity-20 transition-colors duration-1000"
        style={{ backgroundColor: themeHex }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] blur-[150px] opacity-20 transition-colors duration-1000"
        style={{ backgroundColor: themeHex }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-16 z-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-6">
          <Monitor size={48} style={{ color: themeHex }} />
          <div>
            <h1 className="text-4xl font-black tracking-[0.3em]">LUCA OS</h1>
            <div
              className="text-sm tracking-widest mt-1 opacity-60"
              style={{ color: themeHex }}
            >
              VISUAL CORTEX EXTENSION // TV NODE
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
            <Wifi
              size={20}
              className={
                status === "CONNECTED"
                  ? "text-green-500 animate-pulse"
                  : "text-red-500"
              }
            />
            <span className="text-sm font-bold tracking-widest">{status}</span>
          </div>
          <div className="text-xl font-thin tracking-widest opacity-50">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-12 z-10">
        {/* Left Column: Task Status (Big) */}
        <div className="col-span-8 flex flex-col justify-center">
          <div
            className="text-xl tracking-[0.5em] mb-4 uppercase opacity-50 font-bold"
            style={{ color: themeHex }}
          >
            Current Directive
          </div>
          <div
            className="text-7xl font-black leading-tight break-words uppercase transition-colors duration-500"
            style={{
              color: "white",
              textShadow: `0 0 30px ${themeHex}50`,
            }}
          >
            {activeTask}
          </div>

          {/* Decorative Visualizer Line */}
          <div className="mt-12 flex gap-1 h-32 items-end opacity-50">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-4 bg-white/20 animate-pulse"
                style={{
                  height: `${30 + Math.random() * 70}%`,
                  animationDelay: `${i * 0.05}s`,
                  backgroundColor: themeHex,
                }}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Vitals (Detail) */}
        <div className="col-span-4 space-y-8 flex flex-col justify-center border-l border-white/10 pl-12">
          {/* CPU Widget */}
          <div className="bg-white/5 p-8 rounded-2xl border border-white/5 backdrop-blur-sm">
            <div
              className="flex items-center gap-4 mb-4 opacity-70"
              style={{ color: themeHex }}
            >
              <Cpu size={24} />
              <span className="tracking-widest">PROCESSING POWER</span>
            </div>
            <div className="text-6xl font-thin font-mono mb-2">
              {vitals.cpu}%
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${vitals.cpu}%`, backgroundColor: themeHex }}
              />
            </div>
          </div>

          {/* RAM Widget */}
          <div className="bg-white/5 p-8 rounded-2xl border border-white/5 backdrop-blur-sm">
            <div
              className="flex items-center gap-4 mb-4 opacity-70"
              style={{ color: themeHex }}
            >
              <Database size={24} />
              <span className="tracking-widest">MEMORY ALLOCATION</span>
            </div>
            <div className="text-6xl font-thin font-mono mb-2">
              {Math.round((vitals.mem / 1024 / 1024 / 1024) * 10) / 10}{" "}
              <span className="text-2xl">GB</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(vitals.mem / 16000000000) * 100}%`,
                  backgroundColor: themeHex,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVDashboard;
