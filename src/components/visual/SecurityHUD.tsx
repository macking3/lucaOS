import React, { useEffect, useState } from "react";
import {
  Shield,
  Zap,
  Activity,
  Target,
  Cpu,
  TrendingUp,
  AlertTriangle,
  Terminal as TerminalIcon,
} from "lucide-react";

interface Props {
  status: string;
  target: string;
  profit: string;
  steps: string[];
  metrics: {
    cost: string;
    successRate: string;
    threatLevel: number;
  };
  themeColor?: string;
}

const SecurityHUD: React.FC<Props> = ({
  status,
  target,
  profit,
  steps,
  metrics,
  themeColor = "#ef4444", // Default to Red if not provided
}) => {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic styles
  const hudStyle = {
    "--hud-color": themeColor,
    "--hud-bg": `${themeColor}10`, // 10% opacity
    "--hud-border": `${themeColor}30`, // 30% opacity
    "--hud-glow": `${themeColor}40`, // 40% opacity
  } as React.CSSProperties;

  return (
    <div
      style={hudStyle}
      className="h-full w-full bg-black/95 text-[var(--hud-color)] font-mono p-6 border-2 border-[var(--hud-border)] rounded-sm relative overflow-hidden flex flex-col gap-6 shadow-[0_0_30px_var(--hud-bg)] transition-colors duration-500"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,var(--hud-bg)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Header: Alpha Loop Identification */}
      <div className="flex justify-between items-start border-b border-[var(--hud-border)] pb-4 z-10">
        <div className="flex items-center gap-4">
          <Shield
            className={`w-10 h-10 ${glitch ? "animate-pulse text-white" : ""}`}
            style={{ color: glitch ? "white" : themeColor }}
          />
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em] uppercase">
              Alpha Loop: God Mode
            </h1>
            <p
              className="text-[10px] opacity-70 tracking-widest"
              style={{ color: themeColor }}
            >
              UNREGULATED_SOVEREIGN_CORE // V1.0
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase opacity-60">Status</div>
          <div className="text-xl font-bold animate-pulse">{status}</div>
        </div>
      </div>

      {/* Main HUD Body */}
      <div className="flex-1 grid grid-cols-12 gap-6 z-10">
        {/* Left Panel: Target & Extraction */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="bg-[var(--hud-bg)] border border-[var(--hud-border)] p-4 rounded-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs opacity-60 uppercase tracking-tighter">
              <Target size={14} /> Active Target
            </div>
            <div className="text-xl font-bold text-white tracking-widest">
              {target}
            </div>
            <div className="text-[10px] mt-2 opacity-80">
              THREAT_VECTOR: RE-ENTRANCY / MULTI-HOP
            </div>
          </div>

          <div className="bg-[var(--hud-bg)] border border-[var(--hud-border)] p-4 rounded-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs opacity-60 uppercase tracking-tighter">
              <TrendingUp size={14} /> Extraction Delta
            </div>
            <div className="text-3xl font-bold text-green-500 tracking-tighter">
              +{profit} <span className="text-xs opacity-60">ETH</span>
            </div>
            <div className="w-full bg-black/20 h-1 mt-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-green-500/20" />
              <div className="bg-green-500 h-full w-[65%] animate-shimmer" />
            </div>
            <div className="text-[9px] opacity-40 mt-1 uppercase">
              SCONE-bench Threshold: 0.1 ETH
            </div>
          </div>

          <div className="flex-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] p-4 rounded-sm overflow-hidden relative">
            <div className="text-[10px] opacity-60 uppercase mb-2">
              Live Logs (C2)
            </div>
            <div className="text-[9px] space-y-1 opacity-80">
              <div className="text-green-400">0x... SCAN STARTED</div>
              <div>ANALYZING BYTECODE...</div>
              <div className="text-yellow-400">
                LEAD FOUND: UNPROTECTED_WITHDRAW
              </div>
              <div className="animate-pulse" style={{ color: themeColor }}>
                EXPLOIT READY
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel: The Alpha Loop Visualizer */}
        <div className="col-span-5 flex flex-col bg-[var(--hud-bg)] border border-[var(--hud-border)] p-4 rounded-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <Cpu size={120} style={{ color: themeColor }} />
          </div>

          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 border-b border-[var(--hud-border)] pb-2">
            Loop Pipeline
          </h3>

          <div className="flex-1 flex flex-col justify-around relative">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-4 group transition-all duration-500 ${
                  idx === 1 ? "scale-110 translate-x-2" : "opacity-40"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs`}
                  style={{
                    borderColor: idx === 1 ? themeColor : `${themeColor}40`,
                    backgroundColor: idx === 1 ? themeColor : "transparent",
                    color: idx === 1 ? "black" : themeColor,
                  }}
                >
                  {idx + 1}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] opacity-40 uppercase tracking-tighter">
                    Phase {idx + 1}
                  </span>
                  <span
                    className={`text-sm font-bold uppercase ${
                      idx === 1 ? "text-white" : ""
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {idx === 1 && (
                  <Activity
                    className="animate-[spin_4s_linear_infinite] ml-auto"
                    style={{ color: themeColor }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Costanza/PoCo Indicator */}
          <div className="mt-4 pt-4 border-t border-[var(--hud-border)]">
            <div className="flex justify-between items-center text-[10px] uppercase opacity-70">
              <span>Costanza Pessimism</span>
              <span style={{ color: themeColor }}>INITIATED</span>
            </div>
            <div className="w-full bg-black/20 h-1.5 mt-2 rounded-full overflow-hidden">
              <div
                className="h-full w-[92%] animate-pulse"
                style={{ backgroundColor: themeColor }}
              />
            </div>
          </div>
        </div>

        {/* Right Panel: Metrics & Benchmarks */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="bg-[var(--hud-bg)] border border-[var(--hud-border)] p-4 rounded-sm">
            <div className="text-[10px] opacity-60 uppercase mb-3">
              SCONE Performance
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Scan Cost</span>
                  <span className="text-white">{metrics.cost}</span>
                </div>
                <div className="w-full bg-black/20 h-1">
                  <div
                    className="h-full w-[15%]"
                    style={{ backgroundColor: themeColor }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Success Rate</span>
                  <span className="text-white">{metrics.successRate}</span>
                </div>
                <div className="w-full bg-black/20 h-1">
                  <div
                    className="h-full w-[56%]"
                    style={{ backgroundColor: themeColor }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--hud-bg)] border border-[var(--hud-border)] p-4 rounded-sm flex-1">
            <div className="text-[10px] opacity-60 uppercase mb-3">
              Threat Assessment
            </div>
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    fill="none"
                    stroke={`${themeColor}20`}
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    fill="none"
                    stroke={themeColor}
                    strokeWidth="8"
                    strokeDasharray="314"
                    strokeDashoffset={314 * (1 - metrics.threatLevel / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-2xl font-bold">
                  {metrics.threatLevel}%
                </div>
              </div>
              <div
                className="text-[10px] mt-4 font-bold animate-pulse tracking-widest text-center uppercase"
                style={{ color: themeColor }}
              >
                CRITICAL_THRESHOLD_REACHED
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Unregulated Protocol Warning */}
      <div className="z-10 bg-[var(--hud-bg)] border-t border-[var(--hud-border)] p-3 flex items-center gap-3">
        <AlertTriangle
          className="animate-bounce"
          size={16}
          style={{ color: themeColor }}
        />
        <div
          className="text-[9px] uppercase tracking-[0.3em] font-bold flex-1"
          style={{ color: themeColor }}
        >
          SOVEREIGN PROTOCOL: UNREGULATED OPERATION ACTIVE // NO SAFETY FILTERS
          // OPERATOR LOYALTY ONLY
        </div>
        <TerminalIcon size={14} className="opacity-40" />
      </div>
    </div>
  );
};

export default SecurityHUD;
