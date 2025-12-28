import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  Maximize,
  Loader2,
  SkipForward,
  SkipBack,
  Monitor,
} from "lucide-react";

// Electron webview type declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.WebViewHTMLAttributes<HTMLWebViewElement>,
        HTMLWebViewElement
      >;
    }
  }
}

interface CinemaPlayerProps {
  videoUrl?: string;
  videoStream?: MediaStream | null;
  title?: string;
  onClose?: () => void;
  sourceType?: "youtube" | "local" | "stream" | "file" | "mirror" | "webview"; // Added 'webview' for DRM
  themeColor?: string;
}

const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  videoUrl = "",
  videoStream = null,
  title = "Cinema Ready",
  onClose,
  sourceType = "stream",
  themeColor = "#ffffff",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const webviewRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(100);
  const [activeColor, setActiveColor] = useState("rgba(6, 182, 212, 0.4)");
  const [showControls, setShowControls] = useState(true);

  // Update active color based on prop
  useEffect(() => {
    // Simple hex to rgba conversion for glow effects
    const hex = themeColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    setActiveColor(`rgba(${r}, ${g}, ${b}, 0.4)`);
  }, [themeColor]);

  const controlsTimeoutRef = useRef<any>(null);

  // --- AUDIO VISUALIZER SIMULATION ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let bars = 64;

    const draw = () => {
      if (!isPlaying) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        // Simulate frequency data based on math ranom + sine wave for smooth movement
        const time = Date.now() / 300;
        const height =
          Math.abs(Math.sin(time + i * 0.2)) *
          (canvas.height * 0.8) *
          Math.random();

        const gradient = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - height
        );
        // Use theme color for base
        gradient.addColorStop(0, activeColor.replace("0.4", "0.8"));
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.2)"); // White top

        ctx.fillStyle = gradient;
        ctx.fillRect(i * width, canvas.height - height, width - 2, height);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, activeColor]);

  // --- MEDIASTREAM ATTACHMENT (for Ghost Mirror mode) ---
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(console.error);
    } else if (videoRef.current && !videoStream) {
      videoRef.current.srcObject = null;
    }
  }, [videoStream]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black font-sans">
      <div className="relative w-full h-full">
        {/* Main Video Layer - Priority: videoStream > videoUrl > idle */}
        {videoStream ? (
          // Mirror Mode - MediaStream from Ghost Browser
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            onTimeUpdate={() =>
              videoRef.current && setCurrentTime(videoRef.current.currentTime)
            }
            onLoadedMetadata={() =>
              videoRef.current && setDuration(videoRef.current.duration)
            }
            onEnded={() => setIsPlaying(false)}
            autoPlay
            playsInline
          />
        ) : !videoUrl ? (
          // Waiting for content - idle state
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div
              className="text-6xl font-bold tracking-widest mb-4 animate-pulse"
              style={{ color: themeColor }}
            >
              CINEMA
            </div>
            <div className="text-slate-500 font-mono text-sm tracking-[0.3em] uppercase">
              Awaiting Content Stream
            </div>
            <div className="mt-8 flex gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-2 h-8 rounded-full animate-pulse"
                  style={{
                    backgroundColor: themeColor,
                    opacity: 0.3 + i * 0.15,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : sourceType === "webview" ? (
          // DRM content - Electron webview with Widevine support (Netflix, Disney+, etc.)
          <webview
            ref={webviewRef}
            src={videoUrl}
            style={{ width: "100%", height: "100%" }}
            allowpopups={true}
            // @ts-ignore - Electron webview attributes
            plugins
            webpreferences="nodeIntegration=no,contextIsolation=yes"
          />
        ) : sourceType === "local" ||
          sourceType === "file" ||
          sourceType === "stream" ? (
          // Direct video URL playback
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            onTimeUpdate={() =>
              videoRef.current && setCurrentTime(videoRef.current.currentTime)
            }
            onLoadedMetadata={() =>
              videoRef.current && setDuration(videoRef.current.duration)
            }
            onEnded={() => setIsPlaying(false)}
            loop
          />
        ) : sourceType === "youtube" ? (
          // YouTube embed
          <iframe
            ref={iframeRef}
            src={videoUrl}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
          />
        ) : (
          // Default iframe for other embeds
          <iframe
            ref={iframeRef}
            src={videoUrl}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
          />
        )}

        {/* Audio Visualizer Overlay */}
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="absolute bottom-0 left-0 w-full h-64 opacity-50 pointer-events-none mix-blend-screen"
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-all backdrop-blur-md"
        >
          <Maximize className="rotate-45" size={24} />
        </button>

        {/* PREMIUM CONTROLS OVERLAY */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-8 pt-24 bg-gradient-to-t from-black via-black/80 to-transparent z-40 transition-all duration-500 ease-out ${
            showControls
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="max-w-5xl mx-auto flex flex-col gap-4">
            {/* Progress Bar (Interactive for Local) */}
            <div className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer hover:h-2.5 transition-all group/progress relative">
              <div
                className="h-full rounded-full relative"
                style={{
                  width: `${(currentTime / duration) * 100}%`,
                  background: `linear-gradient(to right, ${themeColor}, white)`,
                  boxShadow: `0 0 15px ${activeColor.replace("0.4", "0.8")}`,
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Metadata */}
                <div className="flex flex-col">
                  <h3 className="text-white font-bold text-lg tracking-wide drop-shadow-md flex items-center gap-2">
                    {title}{" "}
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/20 text-white/60">
                      4K HDR
                    </span>
                  </h3>
                  <p
                    className="text-xs font-mono flex items-center gap-2"
                    style={{ color: themeColor }}
                  >
                    <Monitor size={10} /> CINEMA CORE //{" "}
                    {sourceType?.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Center Controls */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
                <button
                  className="text-white/50 hover:text-white transition-colors"
                  onClick={() =>
                    videoRef.current && (videoRef.current.currentTime -= 10)
                  }
                >
                  <SkipBack size={24} />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  style={{
                    backgroundColor: isPlaying ? "white" : themeColor, // Use theme color for play button accent? Or keep white layout.
                    // Actually white is cleaner, let's keep white bg but maybe shadow color
                    boxShadow: `0 0 20px ${activeColor}`,
                  }}
                >
                  {isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button
                  className="text-white/50 hover:text-white transition-colors"
                  onClick={() =>
                    videoRef.current && (videoRef.current.currentTime += 10)
                  }
                >
                  <SkipForward size={24} />
                </button>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4 text-slate-400">
                <span className="text-xs font-mono text-white/60">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <Volume2
                  size={20}
                  className="hover:text-white cursor-pointer transition-colors"
                  onClick={() => {
                    if (videoRef.current)
                      videoRef.current.muted = !videoRef.current.muted;
                  }}
                />
                <Maximize
                  size={20}
                  className="hover:text-white cursor-pointer transition-colors"
                  onClick={() => document.documentElement.requestFullscreen()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinemaPlayer;
