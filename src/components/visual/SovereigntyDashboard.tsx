import React from "react";
import {
  Globe,
  TrendingUp,
  Shield,
  Activity,
  Zap,
  Layers,
  Server,
  Lock,
} from "lucide-react";

interface ChainStats {
  name: string;
  profit: number;
  status: string;
  leads: number;
}

interface Props {
  data: {
    totalProfit: number;
    leadsFound: number;
    chainsScanned: number;
    activeChains: ChainStats[];
  };
  themeColor: string;
}

const SovereigntyDashboard: React.FC<Props> = ({ data, themeColor }) => {
  // Dynamic styles for theme application
  const themeStyle = {
    "--theme-color": themeColor,
    "--theme-glow": `${themeColor}40`,
    "--theme-border": `${themeColor}30`,
    "--theme-bg": `${themeColor}10`,
  } as React.CSSProperties;

  return (
    <div
      className="w-full max-w-7xl mx-auto p-6 flex flex-col gap-6 font-sans"
      style={themeStyle}
    >
      {/* Header / Global Status */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-widest flex items-center gap-3">
            <Globe size={24} style={{ color: themeColor }} />
            GLOBAL SOVEREIGNTY
          </h2>
          <p className="text-slate-400 font-mono text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            SYSTEM ACTIVE // MEMPOOL MONITORING: ENABLED
          </p>
        </div>

        <div className="flex gap-4">
          <button className="px-4 py-2 rounded bg-white/5 border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-2">
            <Activity size={14} /> LIVE FEED
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.07]">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={64} style={{ color: themeColor }} />
          </div>
          <div
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: themeColor }}
          >
            <Zap size={14} /> Total Yield
          </div>
          <div className="text-4xl font-bold text-white tracking-tight mb-1 font-mono">
            {data.totalProfit.toFixed(2)}{" "}
            <span className="text-lg text-slate-500 font-normal">ETH</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded w-fit">
            <TrendingUp size={10} /> +12.5% vs Previous Block
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.07]">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layers size={64} style={{ color: themeColor }} />
          </div>
          <div
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: themeColor }}
          >
            <Layers size={14} /> Active Leads
          </div>
          <div className="text-4xl font-bold text-white tracking-tight mb-1 font-mono">
            {data.leadsFound}
          </div>
          <div className="text-slate-500 text-xs font-mono">
            Across {data.chainsScanned} networks
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.07]">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Server size={64} style={{ color: themeColor }} />
          </div>
          <div
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: themeColor }}
          >
            <Server size={14} /> RPC Health
          </div>
          <div className="text-4xl font-bold text-white tracking-tight mb-1 font-mono">
            98.2%
          </div>
          <div className="text-slate-500 text-xs font-mono">
            Latency: 12ms (Global Avg)
          </div>
        </div>

        {/* Metric Card 4 - Security */}
        <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.07]">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield size={64} style={{ color: themeColor }} />
          </div>
          <div
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: themeColor }}
          >
            <Shield size={14} /> Active Defenses
          </div>
          <div className="text-4xl font-bold text-white tracking-tight mb-1 font-mono">
            ARMOR
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded w-fit">
            <Lock size={10} /> Private Relay Active
          </div>
        </div>
      </div>

      {/* Bottom Panel: Chain Detail List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Activity size={16} className="text-slate-500" /> Network Status
          Overview
        </h3>

        <div className="flex flex-col gap-3">
          {data.activeChains.map((chain, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded bg-black/20 hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-2 h-2 rounded-full ${
                    chain.status === "ACTIVE"
                      ? "bg-green-500 shadow-[0_0_10px_#22c55e]"
                      : "bg-slate-700"
                  }`}
                ></div>
                <span className="text-white font-bold font-mono">
                  {chain.name}
                </span>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Leads
                  </div>
                  <div className="text-white font-mono">{chain.leads}</div>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Est. Yield
                  </div>
                  <div
                    className="text-white font-mono font-bold"
                    style={{ color: themeColor }}
                  >
                    {chain.profit} ETH
                  </div>
                </div>
                <button className="w-8 h-8 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors">
                  <TrendingUp size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SovereigntyDashboard;
