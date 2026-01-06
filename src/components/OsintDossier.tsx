import React, { useEffect, useState } from "react";
import { OsintProfile } from "../types";
import {
  X,
  User,
  Globe,
  ShieldAlert,
  Search,
  Lock,
  AlertTriangle,
  UserSearch,
  Share2,
  Fingerprint,
  Network,
  PieChart,
} from "lucide-react";

interface Props {
  profile: OsintProfile | null;
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const OsintDossier: React.FC<Props> = ({ profile, onClose, theme }) => {
  const themePrimary = theme?.primary || "text-rq-blue";
  const themeBorder = theme?.border || "border-rq-blue";
  const themeBg = theme?.bg || "bg-blue-950/10";
  const themeHex = theme?.hex || "#3b82f6";
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    if (profile?.status === "SCANNING") {
      const interval = setInterval(() => {
        setScanProgress((prev) => (prev < 100 ? prev + 1 : 100));
      }, 30);
      return () => clearInterval(interval);
    } else {
      setScanProgress(100);
    }
  }, [profile]);

  if (!profile) return null;

  const socialCount = profile.hits.filter(
    (h) => h.category === "SOCIAL"
  ).length;
  const darkCount = profile.hits.filter(
    (h) => h.category === "DARK_WEB"
  ).length;
  const domainCount = profile.hits.filter(
    (h) => h.category === "DOMAIN"
  ).length;
  const totalCount = profile.hits.length;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
      <div
        className={`relative w-[95%] max-w-5xl h-[85vh] bg-black border ${themeBorder}/40 rounded-sm flex flex-col overflow-hidden shadow-2xl`}
        style={{
          boxShadow: `0 0 40px ${themeHex}26`,
        }}
      >
        {/* Background Scanning Grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
          style={{
            backgroundImage: `radial-gradient(${themeHex} 1px, transparent 0)`,
            backgroundSize: "30px 30px",
          }}
        ></div>

        {/* Global Corner Brackets */}
        <div
          className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${themeBorder} opacity-50 z-10 animate-pulse`}
        ></div>
        <div
          className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${themeBorder} opacity-50 z-10 animate-pulse`}
        ></div>
        <div
          className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${themeBorder} opacity-50 z-10 animate-pulse`}
        ></div>
        <div
          className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${themeBorder} opacity-50 z-10 animate-pulse`}
        ></div>

        {/* Scanning Overlay */}
        {scanProgress < 100 && (
          <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center font-mono gap-4">
            <div className="relative">
              <UserSearch
                size={48}
                className={`${themePrimary} animate-pulse`}
              />
              <div
                className={`absolute -inset-4 border border-dashed ${themeBorder} rounded-full animate-[spin_10s_linear_infinite] opacity-30`}
              ></div>
            </div>
            <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${themePrimary} transition-all duration-100`}
                style={{
                  width: `${scanProgress}%`,
                  backgroundColor: themeHex,
                }}
              ></div>
            </div>
            <div
              className={`text-[10px] ${themePrimary} tracking-[0.3em] font-bold`}
            >
              INITIALIZING TARGET RECONNAISSANCE... {scanProgress}%
            </div>
          </div>
        )}

        {/* Header */}
        <div
          className={`h-16 border-b ${themeBorder} ${themeBg} flex items-center justify-between px-6 relative z-10`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`p-2 border ${themeBorder}/50 ${themeBg} rounded-sm ${themePrimary} relative overflow-hidden`}
            >
              <ShieldAlert size={20} />
              <div className="absolute inset-0 bg-current opacity-10 animate-pulse"></div>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white tracking-[0.2em]">
                INTEL DOSSIER V2
              </h2>
              <div className="text-[10px] font-mono text-slate-500 flex gap-4 uppercase tracking-tighter">
                <span>[REF: {profile.target}]</span>
                <span>SOURCE: NEURAL LINK NODE X7</span>
                <span>[STATUS: ENCRYPTED]</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative z-10">
          {/* Left Column: Identity & Risk Assessment */}
          <div className="w-[300px] border-r border-rq-border p-5 bg-[#050505] flex flex-col gap-6 relative">
            <div className="relative aspect-square bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden rounded-sm group">
              {/* Inner Brackets for Image */}
              <div
                className={`absolute top-2 left-2 w-4 h-4 border-t border-l ${themeBorder} opacity-60`}
              ></div>
              <div
                className={`absolute top-2 right-2 w-4 h-4 border-t border-r ${themeBorder} opacity-60`}
              ></div>
              <div
                className={`absolute bottom-2 left-2 w-4 h-4 border-b border-l ${themeBorder} opacity-60`}
              ></div>
              <div
                className={`absolute bottom-2 right-2 w-4 h-4 border-b border-r ${themeBorder} opacity-60`}
              ></div>

              <User
                size={80}
                className="text-slate-800 group-hover:scale-110 transition-transform duration-700"
              />

              {/* Scanner Effect */}
              <div
                className={`absolute inset-x-0 h-0.5 bg-current opacity-20 shadow-[0_0_10px_currentColor] animate-[scan_3s_ease-in-out_infinite] ${themePrimary}`}
              ></div>

              <div
                className={`absolute top-3 right-3 text-[9px] font-mono ${themePrimary} bg-black/60 px-1 py-0.5 border border-current/20`}
              >
                99.8% MATCH
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent h-12 flex items-end justify-center pb-2">
                <div className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">
                  ID: TARGET_{profile.target.slice(0, 4)}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-[9px] font-bold text-slate-500 tracking-[0.2em] mb-1.5 uppercase opacity-70">
                  TARGET PROFILE
                </div>
                <div
                  className={`font-mono text-xl text-white font-bold border-b-2 ${themeBorder}/40 pb-2 tracking-wide uppercase italic`}
                >
                  {profile.target}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-500 tracking-[0.2em] mb-2 uppercase opacity-70">
                  THREAT LEVEL INDEX
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className={`font-display text-5xl font-bold leading-none ${
                      profile.riskScore > 70 ? "text-rq-red" : themePrimary
                    }`}
                  >
                    {profile.riskScore}
                  </div>
                  <div className="text-[8px] text-slate-500 leading-tight font-mono">
                    [AGGREGATED]
                    <br />
                    [SYSTEM RISK]
                  </div>
                </div>
                {/* Mini Risk Bars */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>EXPOSURE</span>
                      <span>{Math.min(100, totalCount * 10)}%</span>
                    </div>
                    <div className="h-1 bg-slate-900 w-full overflow-hidden">
                      <div
                        className={`h-full opacity-80 shadow-[0_0_5px_currentColor] ${themePrimary}`}
                        style={{
                          width: `${Math.min(100, totalCount * 10)}%`,
                          backgroundColor: themeHex,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>LEAK GRAVITY</span>
                      <span>{Math.min(100, darkCount * 30)}%</span>
                    </div>
                    <div className="h-1 bg-slate-900 w-full overflow-hidden">
                      <div
                        className="h-full bg-rq-red shadow-[0_0_5px_#ef4444]"
                        style={{ width: `${Math.min(100, darkCount * 30)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-sm relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 w-full h-0.5 ${
                    profile.riskScore > 70
                      ? "bg-rq-red"
                      : themePrimary.replace("text-", "bg-")
                  } opacity-50`}
                ></div>
                <div className="flex items-center gap-2 text-white/90 text-[10px] font-bold mb-2 uppercase tracking-tight">
                  <AlertTriangle
                    size={12}
                    className={
                      profile.riskScore > 70 ? "text-rq-red" : themePrimary
                    }
                  />{" "}
                  ANALYST VERDICT
                </div>
                <p className="text-[10px] text-slate-400 leading-normal font-mono">
                  Target displays significant digital footprint patterns.{" "}
                  {darkCount > 0
                    ? "CRITICAL: Security breach detected in upstream archives."
                    : "Operational security appears consistent with baseline."}
                </p>
              </div>
            </div>
          </div>

          {/* Center Column: Intelligence Data Feed */}
          <div className="flex-1 bg-black flex flex-col border-r border-rq-border relative overflow-hidden">
            {/* HUD Scanning Line */}
            <div
              className={`absolute left-0 right-0 h-px ${themeBorder} opacity-20 z-0 animate-[scan_8s_linear_infinite] shadow-[0_0_10px_currentColor]`}
            ></div>

            {/* Filter Stats Bar */}
            <div className="h-12 border-b border-rq-border flex divide-x divide-rq-border bg-white/5 relative z-10">
              <div className="flex-1 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                <Globe size={14} className={themePrimary} />
                <span>SOCIAL {socialCount}</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                <Lock size={14} className="text-rq-red" />
                <span>LEAKS {darkCount}</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                <Network size={14} className="text-emerald-500" />
                <span>NODES {domainCount}</span>
              </div>
            </div>

            {/* Hits List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 custom-scrollbar">
              {/* Background Vertical Line */}
              <div className="absolute top-0 bottom-0 left-10 w-px bg-slate-800/40 z-0"></div>

              {/* TECHNICAL INTELLIGENCE SUB-SECTION */}
              {profile.intel && (
                <div className="space-y-4 mb-6 relative z-10">
                  {profile.intel.dns && (
                    <div className="bg-emerald-950/10 border border-emerald-500/20 p-4 rounded-sm">
                      <div className="text-[10px] font-bold text-emerald-500 tracking-widest mb-3 uppercase flex items-center gap-2">
                        <Network size={14} /> [DNS ANALYSIS]
                      </div>
                      <div className="grid grid-cols-1 gap-3 font-mono text-[10px]">
                        {profile.intel.dns.A &&
                          profile.intel.dns.A.length > 0 && (
                            <div className="flex gap-4">
                              <span className="text-slate-500 w-12">
                                A RECORDS:
                              </span>
                              <span className="text-white">
                                {profile.intel.dns.A.join(", ")}
                              </span>
                            </div>
                          )}
                        {profile.intel.dns.MX &&
                          profile.intel.dns.MX.length > 0 && (
                            <div className="flex gap-4">
                              <span className="text-slate-500 w-12">
                                MX NODES:
                              </span>
                              <span className="text-white">
                                {profile.intel.dns.MX.join(", ")}
                              </span>
                            </div>
                          )}
                        {profile.intel.whois && (
                          <div className="flex gap-4 border-t border-white/5 pt-2 mt-2">
                            <span className="text-slate-500 w-12">
                              REGISTRAR:
                            </span>
                            <span className="text-blue-400 capitalize">
                              {profile.intel.whois.data.registrar || "Unknown"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {profile.hits.length === 0 && !profile.intel && (
                <div className="text-slate-600 italic text-sm font-mono text-center mt-10">
                  [NO RECORDS FOUND IN BUFFER]
                </div>
              )}

              {profile.hits.map((hit, i) => (
                <div key={i} className="relative z-10 flex gap-4 group">
                  <div
                    className={`w-8 h-8 rounded-sm border flex items-center justify-center bg-black shrink-0 transition-all duration-300 ${
                      hit.category === "DARK_WEB"
                        ? "border-red-900 group-hover:border-rq-red text-rq-red group-hover:shadow-[0_0_10px_#ef4444]"
                        : hit.category === "SOCIAL"
                        ? `border-blue-900 group-hover:border-rq-blue ${themePrimary} group-hover:shadow-[0_0_10px_currentColor]`
                        : "border-emerald-900 group-hover:border-emerald-500 text-emerald-500 group-hover:shadow-[0_0_10px_#10b981]"
                    }`}
                  >
                    {hit.category === "DARK_WEB" ? (
                      <Lock size={14} />
                    ) : hit.category === "DOMAIN" ? (
                      <Globe size={14} />
                    ) : (
                      <Search size={14} />
                    )}
                  </div>

                  <div className="flex-1 border border-rq-border bg-white/[0.02] p-3 group-hover:bg-white/[0.05] group-hover:border-rq-blue/30 transition-all cursor-pointer relative overflow-hidden">
                    {/* Decorative corner for each entry */}
                    <div
                      className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${themeBorder} opacity-0 group-hover:opacity-60 transition-opacity`}
                    ></div>

                    <div className="flex justify-between items-start">
                      <div className="font-bold text-[11px] text-white/90 mb-1 font-mono uppercase tracking-wider">
                        {hit.platform}
                      </div>
                      <div className="text-[9px] font-mono px-2 py-0.5 bg-black/40 text-slate-400 border border-slate-800">
                        [CONF: {(hit.confidence * 100).toFixed(0)}%]
                      </div>
                    </div>
                    <div
                      className={`font-mono text-[10px] text-slate-500 truncate group-hover:${themePrimary} transition-colors`}
                    >
                      {hit.url}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Metadata Footer */}
            <div className="p-4 border-t border-rq-border bg-black grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[10px] relative z-10">
              <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: "100% 4px",
                }}
              ></div>
              {Object.entries(profile.meta).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between border-b border-white/5 pb-1 group"
                >
                  <span className="text-slate-600 uppercase group-hover:text-slate-400 transition-colors tracking-tighter">
                    {key}
                  </span>
                  <span
                    className={`max-w-[150px] truncate text-right ${themePrimary}`}
                    title={String(value)}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Relationship Graph */}
          <div className="w-[320px] bg-[#020202] flex flex-col relative overflow-hidden">
            {/* Technical Grid for Graph */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

            <div className="p-4 border-b border-rq-border bg-white/5 relative z-10">
              <h3
                className={`text-[10px] font-bold ${themePrimary} tracking-[0.2em] flex items-center gap-2 uppercase`}
              >
                <Share2 size={14} className="animate-pulse" /> [RELATIONSHIP
                MATRIX]
              </h3>
            </div>

            <div className="flex-1 relative p-4 flex flex-col justify-center items-center">
              {/* Rotating Scanner Reticle Background */}
              <div
                className={`absolute w-64 h-64 border border-dashed ${themeBorder} rounded-full opacity-10 animate-[spin_20s_linear_infinite]`}
              ></div>
              <div
                className={`absolute w-40 h-40 border-2 border-dotted ${themeBorder} rounded-full opacity-5 animate-[spin_15s_linear_infinite_reverse]`}
              ></div>

              <div className="relative w-full h-full flex items-center justify-center">
                {/* Center Node */}
                <div
                  className={`absolute z-20 w-16 h-16 bg-black border-2 ${themeBorder} rounded-sm flex items-center justify-center shadow-[0_0_30px_${themeHex}33]`}
                >
                  <Fingerprint size={32} className="text-white animate-pulse" />
                  {/* Inner corners for node */}
                  <div
                    className={`absolute top-1 left-1 w-2 h-2 border-t border-l ${themeBorder} opacity-60`}
                  ></div>
                  <div
                    className={`absolute bottom-1 right-1 w-2 h-2 border-b border-r ${themeBorder} opacity-60`}
                  ></div>
                </div>

                {/* Orbiting Nodes */}
                {profile.hits.slice(0, 8).map((hit, i, arr) => {
                  const angle = (i / arr.length) * Math.PI * 2;
                  const radius = 100;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <div
                      key={i}
                      className="absolute z-10"
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      {/* Line to center */}
                      <div
                        className={`absolute top-1/2 left-1/2 h-[0.5px] bg-gradient-to-r from-transparent via-${themeBorder.replace(
                          "border-",
                          ""
                        )}/40 to-white/10 origin-left -z-10`}
                        style={{
                          width: `${radius}px`,
                          transform: `rotate(${angle + Math.PI}rad)`,
                          backgroundColor:
                            themeHex === "#3b82f6"
                              ? "rgba(59,130,246,0.2)"
                              : `${themeHex}33`,
                        }}
                      ></div>

                      <div
                        className={`w-8 h-8 rounded-sm border bg-black flex items-center justify-center transition-transform hover:scale-125 hover:z-30 cursor-crosshair ${
                          hit.category === "DARK_WEB"
                            ? "border-rq-red text-rq-red"
                            : `border-slate-700 text-slate-500`
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                      </div>
                      <div className="absolute top-9 left-1/2 -translate-x-1/2 text-[7px] font-mono text-slate-500 tracking-tighter whitespace-nowrap bg-black/90 border border-white/5 px-1 py-0.5 uppercase">
                        {hit.platform}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-1/3 border-t border-rq-border p-4 bg-white/5 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-500 tracking-[0.2em] mb-4 flex items-center gap-2 uppercase">
                <PieChart size={12} /> [DATA ALLOCATION]
              </h3>
              <div className="space-y-3 font-mono">
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>SOCIAL OSINT</span>
                    <span className={themePrimary}>
                      {((socialCount / totalCount) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-900 w-full overflow-hidden">
                    <div
                      className={`h-full ${themePrimary.replace(
                        "text-",
                        "bg-"
                      )}`}
                      style={{
                        width: `${(socialCount / totalCount) * 100}%`,
                        backgroundColor: themeHex,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>LEAK DETECTED</span>
                    <span className="text-rq-red">
                      {((darkCount / totalCount) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-900 w-full overflow-hidden">
                    <div
                      className="h-full bg-rq-red"
                      style={{ width: `${(darkCount / totalCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>NET INFRA</span>
                    <span className="text-emerald-500">
                      {((domainCount / totalCount) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-900 w-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(domainCount / totalCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OsintDossier;
