import React, { useState, useEffect } from "react";
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  X,
  Info,
  Layers,
  Box,
  MapPin,
  Zap,
  ExternalLink,
  User,
  Newspaper,
  Share2,
  FileText,
  Shield,
  TrendingUp,
  Music,
  Code,
  BarChart3,
  Clock,
  Map,
} from "lucide-react";
import SecurityHUD from "./visual/SecurityHUD";

interface VisualItem {
  title: string;
  imageUrl: string;
  videoUrl?: string; // NEW: Optional video URL
  details: Record<string, string>;
  source?: string;
}

interface VisualDataPresenterProps {
  data: {
    topic: string;
    type:
      | "PRODUCT"
      | "PLACE"
      | "CONCEPT"
      | "GENERAL"
      | "PERSON"
      | "NEWS"
      | "SOCIAL"
      | "DOCUMENT"
      | "SECURITY"
      | "OSINT"
      | "FINANCIAL"
      | "AUDIO"
      | "CODE"
      | "STATS"
      | "TIMELINE"
      | "MAP";
    layout:
      | "GRID"
      | "CAROUSEL"
      | "COMPARISON"
      | "LIST"
      | "TIMELINE"
      | "DASHBOARD"
      | "FULLSCREEN";
    items: VisualItem[];
  };
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
  };
  onClose: () => void;
}

const VisualDataPresenter: React.FC<VisualDataPresenterProps> = ({
  data,
  theme,
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const nextSlide = () =>
    setActiveIndex((prev) => (prev + 1) % data.items.length);
  const prevSlide = () =>
    setActiveIndex(
      (prev) => (prev - 1 + data.items.length) % data.items.length
    );

  // --- RENDERERS ---

  // --- HOLOGRAPHIC UI COMPONENTS ---
  const HoloCard: React.FC<{
    children: React.ReactNode;
    className?: string;
  }> = ({ children, className = "" }) => (
    <div
      className={`relative rounded-xl border overflow-hidden group ${className}`}
      style={{
        background: `linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)`,
        borderColor: `${theme.primary}40`,
        boxShadow: `
          0 0 40px ${theme.primary}15,
          inset 0 0 30px ${theme.primary}10,
          0 4px 30px rgba(0,0,0,0.5)
        `,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Tech Corner Brackets */}
      <div
        className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 opacity-60 transition-all duration-300 group-hover:w-8 group-hover:h-8 group-hover:opacity-100"
        style={{ borderColor: theme.primary }}
      />
      <div
        className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 opacity-60 transition-all duration-300 group-hover:w-8 group-hover:h-8 group-hover:opacity-100"
        style={{ borderColor: theme.primary }}
      />
      <div
        className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 opacity-60 transition-all duration-300 group-hover:w-8 group-hover:h-8 group-hover:opacity-100"
        style={{ borderColor: theme.primary }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 opacity-60 transition-all duration-300 group-hover:w-8 group-hover:h-8 group-hover:opacity-100"
        style={{ borderColor: theme.primary }}
      />

      {/* Animated Glow Line (Top) */}
      <div
        className="absolute top-0 left-0 w-full h-[2px] opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${theme.primary} 50%, transparent 100%)`,
        }}
      />

      {/* CRT Scanlines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />

      {/* Holographic Shimmer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, transparent 30%, ${theme.primary}20 50%, transparent 70%)`,
        }}
      />

      {children}
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {data.items.map((item, i) => (
        <HoloCard
          key={i}
          className="aspect-square hover:shadow-2xl hover:scale-[1.02] transition-all duration-500"
        >
          {item.videoUrl ? (
            <video
              src={item.videoUrl}
              poster={item.imageUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full p-4">
            <div className="text-sm font-bold text-white tracking-wider mb-1">
              {item.title}
            </div>
            {/* Tech Line */}
            <div
              className="w-8 h-0.5 mb-2"
              style={{ backgroundColor: theme.primary }}
            />
            {item.details &&
              Object.entries(item.details)
                .slice(0, 1)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="text-[10px] text-slate-400 font-mono truncate"
                  >
                    <span className="text-white/40 uppercase mr-2">{k}</span>
                    <span style={{ color: theme.primary }}>{v}</span>
                  </div>
                ))}
          </div>
        </HoloCard>
      ))}
    </div>
  );

  const renderCarousel = () => (
    <div className="relative w-full h-[55vh] flex items-center justify-center perspective-1000">
      <button
        onClick={prevSlide}
        className="absolute left-2 z-20 p-3 rounded-full bg-black/40 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white transition-all backdrop-blur-md"
      >
        <ArrowLeft size={24} />
      </button>

      <HoloCard className="w-full max-w-3xl h-full shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 transition-opacity duration-500">
          {data.items[activeIndex].videoUrl ? (
            <video
              src={data.items[activeIndex].videoUrl}
              poster={data.items[activeIndex].imageUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={data.items[activeIndex].imageUrl}
              alt={data.items[activeIndex].title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/10">
                  Target {activeIndex + 1}/{data.items.length}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                {data.items[activeIndex].title}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm font-mono text-slate-300 border-t border-white/10 pt-4">
            {Object.entries(data.items[activeIndex].details).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-baseline group/row"
                >
                  <span className="opacity-40 text-xs uppercase tracking-widest group-hover/row:text-white transition-colors">
                    {key}
                  </span>
                  <span className="font-bold text-white shadow-black drop-shadow-md">
                    {value}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </HoloCard>

      <button
        onClick={nextSlide}
        className="absolute right-2 z-20 p-3 rounded-full bg-black/40 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white transition-all backdrop-blur-md"
      >
        <ArrowRight size={24} />
      </button>

      {/* Holographic Indicators */}
      <div className="absolute bottom-[-30px] flex gap-1.5 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/5">
        {data.items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-8 bg-white shadow-[0_0_10px_white]"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="flex gap-6 p-4 overflow-x-auto custom-scrollbar min-h-[55vh] items-center px-12">
      {data.items.map((item, i) => (
        <HoloCard
          key={i}
          className="min-w-[320px] h-[500px] flex flex-col hover:scale-[1.02] hover:-translate-y-2 transition-transform duration-500 shadow-2xl"
        >
          {/* Image Header */}
          <div className="h-48 relative overflow-hidden bg-white/5 group-hover:h-52 transition-all duration-500">
            {item.videoUrl ? (
              <video
                src={item.videoUrl}
                poster={item.imageUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90" />

            <div className="absolute bottom-4 left-5 right-5">
              <div className="text-xl font-bold text-white leading-tight drop-shadow-md">
                {item.title}
              </div>
              <div className="w-12 h-0.5 mt-2 bg-white/50" />
            </div>
          </div>

          {/* Specs List */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar bg-black/20">
            {Object.entries(item.details).map(([key, value], idx) => (
              <div key={idx} className="group/spec">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 group-hover/spec:text-cyan-400 transition-colors">
                    {key}
                  </div>
                  <div className="h-px flex-1 mx-2 bg-white/10 group-hover/spec:bg-cyan-900/50 transition-colors" />
                </div>
                <div className="text-sm font-mono text-white/90 pl-1">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/5 bg-white/[0.02] flex justify-between items-center backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  i === 0 ? "bg-green-500 animate-pulse" : "bg-slate-500"
                }`}
              />
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                {item.source || "Source: Neural Net"}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 cursor-pointer transition-all border border-transparent hover:border-cyan-500/30">
              <ExternalLink size={14} />
            </div>
          </div>
        </HoloCard>
      ))}
    </div>
  );

  // --- LIST LAYOUT (Vertical list view) ---
  const renderList = () => (
    <div className="w-full max-w-2xl mx-auto space-y-3 p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {data.items.map((item, i) => (
        <div
          key={i}
          className="relative flex items-center gap-4 p-4 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)`,
            border: `1px solid ${theme.primary}30`,
            boxShadow: `0 0 20px ${theme.primary}10, inset 0 0 15px ${theme.primary}05`,
            backdropFilter: "blur(15px)",
          }}
        >
          {/* Hover Glow Effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, ${theme.primary}10 0%, transparent 100%)`,
              borderLeft: `2px solid ${theme.primary}`,
            }}
          />
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-16 h-16 rounded-lg object-cover opacity-80 group-hover:opacity-100 transition-opacity border"
              style={{ borderColor: `${theme.primary}40` }}
            />
          )}
          <div className="flex-1 min-w-0 relative z-10">
            <div className="text-sm font-bold text-white truncate tracking-wide">
              {item.title}
            </div>
            {item.details &&
              Object.entries(item.details)
                .slice(0, 2)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="text-[10px] text-slate-400 font-mono truncate"
                  >
                    <span className="text-white/40 uppercase mr-2">{k}</span>
                    <span style={{ color: theme.primary }}>{v}</span>
                  </div>
                ))}
          </div>
          <ExternalLink
            size={16}
            className="relative z-10 transition-colors"
            style={{ color: theme.primary }}
          />
        </div>
      ))}
    </div>
  );

  // --- TIMELINE LAYOUT (Horizontal timeline) ---
  const renderTimeline = () => (
    <div className="w-full p-4 max-h-[60vh] overflow-x-auto custom-scrollbar">
      <div className="relative flex items-start gap-8 min-w-max pb-4">
        {/* Glowing Timeline Line */}
        <div
          className="absolute top-6 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${theme.primary}60 20%, ${theme.primary}60 80%, transparent 100%)`,
            boxShadow: `0 0 10px ${theme.primary}40`,
          }}
        />
        {data.items.map((item, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center w-52 group"
          >
            {/* Animated Node */}
            <div
              className="w-4 h-4 rounded-full z-10 animate-pulse border-2"
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.primary,
                boxShadow: `0 0 15px ${theme.primary}80`,
              }}
            />
            {/* Timeline Card */}
            <div
              className="mt-4 p-4 rounded-xl w-full transition-all duration-300 group-hover:translate-y-[-4px]"
              style={{
                background: `linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%)`,
                border: `1px solid ${theme.primary}30`,
                boxShadow: `0 0 25px ${theme.primary}15, inset 0 0 15px ${theme.primary}08`,
                backdropFilter: "blur(15px)",
              }}
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-28 rounded-lg object-cover mb-3 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ border: `1px solid ${theme.primary}30` }}
                />
              )}
              <div className="text-sm font-bold text-white truncate tracking-wide">
                {item.title}
              </div>
              {item.details?.date && (
                <div
                  className="text-[10px] font-mono mt-1 flex items-center gap-1"
                  style={{ color: theme.primary }}
                >
                  <Clock size={10} />
                  {item.details.date}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- DASHBOARD LAYOUT (Multi-panel) ---
  const renderDashboard = () => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {data.items.map((item, i) => (
        <div
          key={i}
          className="relative p-4 rounded-xl overflow-hidden group transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.75) 100%)`,
            border: `1px solid ${theme.primary}25`,
            boxShadow: `0 0 30px ${theme.primary}10, inset 0 0 20px ${theme.primary}05`,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Corner Accent */}
          <div
            className="absolute top-0 left-0 w-8 h-[2px]"
            style={{ background: theme.primary }}
          />
          <div
            className="absolute top-0 left-0 h-8 w-[2px]"
            style={{ background: theme.primary }}
          />

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: theme.primary,
                boxShadow: `0 0 8px ${theme.primary}`,
              }}
            />
            <div
              className="text-[10px] font-mono uppercase truncate tracking-widest"
              style={{ color: theme.primary }}
            >
              {item.title}
            </div>
          </div>

          {/* Stats */}
          {item.details &&
            Object.entries(item.details).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between items-center py-2 border-b last:border-0"
                style={{ borderColor: `${theme.primary}15` }}
              >
                <span className="text-[10px] text-slate-500 uppercase font-mono">
                  {k}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: theme.primary }}
                >
                  {v}
                </span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );

  // --- FULLSCREEN LAYOUT (Single item) ---
  const renderFullscreen = () => {
    const item = data.items[activeIndex] || data.items[0];
    if (!item) return null;
    return (
      <div className="relative w-full h-[60vh] flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(${theme.primary}20 1px, transparent 1px),
              linear-gradient(90deg, ${theme.primary}20 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Content Container */}
        <div
          className="relative max-w-4xl w-full rounded-2xl overflow-hidden"
          style={{
            border: `2px solid ${theme.primary}30`,
            boxShadow: `
              0 0 60px ${theme.primary}20,
              inset 0 0 40px ${theme.primary}10
            `,
            backdropFilter: "blur(20px)",
          }}
        >
          {item.videoUrl ? (
            <video
              src={item.videoUrl}
              poster={item.imageUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-[50vh] object-contain"
              style={{ background: "rgba(0,0,0,0.8)" }}
            />
          ) : item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-[50vh] object-contain"
              style={{ background: "rgba(0,0,0,0.8)" }}
            />
          ) : (
            <div
              className="text-center p-12 min-h-[50vh] flex flex-col items-center justify-center"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%)",
              }}
            >
              <div
                className="text-5xl font-bold mb-6 tracking-wider"
                style={{
                  color: theme.primary,
                  textShadow: `0 0 30px ${theme.primary}50`,
                }}
              >
                {item.title}
              </div>
              {item.details &&
                Object.entries(item.details).map(([k, v]) => (
                  <div key={k} className="text-sm text-slate-400 font-mono">
                    <span className="text-white/40 uppercase mr-3">{k}:</span>
                    <span style={{ color: theme.primary }}>{v}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {data.items.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 p-4 rounded-full transition-all duration-300 group"
              style={{
                background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)`,
                border: `1px solid ${theme.primary}40`,
                boxShadow: `0 0 20px ${theme.primary}20`,
              }}
            >
              <ArrowLeft size={24} style={{ color: theme.primary }} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 p-4 rounded-full transition-all duration-300 group"
              style={{
                background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)`,
                border: `1px solid ${theme.primary}40`,
                boxShadow: `0 0 20px ${theme.primary}20`,
              }}
            >
              <ArrowRight size={24} style={{ color: theme.primary }} />
            </button>
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-mono text-sm tracking-widest"
              style={{
                background: "rgba(0,0,0,0.7)",
                border: `1px solid ${theme.primary}30`,
                color: theme.primary,
              }}
            >
              {activeIndex + 1} / {data.items.length}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={`w-full max-w-6xl mx-auto pointer-events-auto animate-in fade-in zoom-in-95 duration-700 ${
        isLoaded ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8 px-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 shadow-[0_0_15px_-5px_rgba(255,255,255,0.2)]">
            {data.type === "PLACE" ? (
              <MapPin size={20} style={{ color: theme.primary }} />
            ) : data.type === "PRODUCT" ? (
              <Box size={20} style={{ color: theme.primary }} />
            ) : data.type === "PERSON" ? (
              <User size={20} style={{ color: theme.primary }} />
            ) : data.type === "NEWS" ? (
              <Newspaper size={20} style={{ color: theme.primary }} />
            ) : data.type === "SOCIAL" ? (
              <Share2 size={20} style={{ color: theme.primary }} />
            ) : data.type === "DOCUMENT" ? (
              <FileText size={20} style={{ color: theme.primary }} />
            ) : data.type === "FINANCIAL" ? (
              <TrendingUp size={20} style={{ color: theme.primary }} />
            ) : data.type === "AUDIO" ? (
              <Music size={20} style={{ color: theme.primary }} />
            ) : data.type === "CODE" ? (
              <Code size={20} style={{ color: theme.primary }} />
            ) : data.type === "STATS" ? (
              <BarChart3 size={20} style={{ color: theme.primary }} />
            ) : data.type === "TIMELINE" ? (
              <Clock size={20} style={{ color: theme.primary }} />
            ) : data.type === "MAP" ? (
              <Map size={20} style={{ color: theme.primary }} />
            ) : (
              <Layers size={20} style={{ color: theme.primary }} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <div className="text-[10px] font-mono text-slate-400 tracking-[0.2em] uppercase">
                VISUAL DATA STREAM // {data.layout}
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-wide uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {data.topic}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="group relative p-3 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/40 transition-all duration-300"
        >
          <X size={20} />
          {/* Tech Ring on Hover */}
          <div className="absolute inset-0 rounded-full border border-red-500/0 scale-75 group-hover:scale-100 group-hover:border-red-500/50 transition-all duration-500" />
        </button>
      </div>

      {/* Content Area */}
      <div className="relative min-h-[60vh] flex items-center justify-center">
        {data.type === "SECURITY" ? (
          <div className="flex-1 p-6 flex flex-col">
            <SecurityHUD
              status={data.items[0]?.details?.status || "AUDITING"}
              target={data.items[0]?.title || "UNKNOWN_TARGET"}
              profit={data.items[0]?.details?.projectedProfit || "0.00"}
              steps={[
                "RECONNAISSANCE",
                "AUDITOR_LEAD_FOLLOWING",
                "EXPLOIT_SYNTHESIS",
                "PROFIT_VALIDATION",
              ]}
              metrics={{
                cost: data.items[0]?.details?.scanCost || "$1.22",
                successRate:
                  data.items[0]?.details?.successProbability || "55.88%",
                threatLevel: parseInt(
                  data.items[0]?.details?.threatLevel || "85"
                ),
              }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden pointer-events-auto">
            {data.layout === "GRID" && renderGrid()}
            {data.layout === "CAROUSEL" && renderCarousel()}
            {data.layout === "COMPARISON" && renderComparison()}
            {data.layout === "LIST" && renderList()}
            {data.layout === "TIMELINE" && renderTimeline()}
            {data.layout === "DASHBOARD" && renderDashboard()}
            {data.layout === "FULLSCREEN" && renderFullscreen()}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualDataPresenter;
