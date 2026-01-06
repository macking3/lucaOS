import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Camera,
  Aperture,
  Scan,
  Zap,
  Target,
  Crosshair,
  Maximize,
  Eye,
  Activity,
} from "lucide-react";
import { soundService } from "../services/soundService";
import { useMobile } from "../hooks/useMobile";

interface Props {
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  onLiveAnalyze?: (base64Image: string) => Promise<string>;
  theme?: {
    primary: string;
    hex: string;
  };
}

const VisionCameraModal: React.FC<Props> = ({
  onClose,
  onCapture,
  onLiveAnalyze,
  theme,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [scanTargets, setScanTargets] = useState<{ x: number; y: number }[]>(
    []
  );
  const isMobile = useMobile();

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: isMobile ? "user" : "environment", // Use front camera for enrollment
          },
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera Access Denied:", err);
      }
    };

    startCamera();
    soundService.play("HOVER");

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isMobile]);

  // --- LIVE SCANNING LOOP (ASTRA MODE) ---
  useEffect(() => {
    let interval: any;
    if (isLiveScanning && onLiveAnalyze) {
      setScanLog((prev) => [...prev, "> INITIALIZING ASTRA PROTOCOL..."]);
      soundService.play("PROCESSING");

      interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        // 1. Capture Frame silently
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasRef.current.width = 640; // Low res for speed
          canvasRef.current.height = 480;
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          const base64 = canvasRef.current
            .toDataURL("image/jpeg", 0.6)
            .split(",")[1];

          // 2. Random Targets Visual Effect
          setScanTargets(
            Array.from({ length: 3 }).map(() => ({
              x: Math.random() * 80 + 10,
              y: Math.random() * 80 + 10,
            }))
          );

          // 3. Send to AI
          try {
            const analysis = await onLiveAnalyze(base64);
            setScanLog((prev) => [...prev.slice(-6), `> ${analysis}`]);
          } catch (e) {
            console.error("Live Scan Error", e);
          }
        }
      }, 2000); // Every 2 seconds
    } else {
      setScanTargets([]);
    }
    return () => clearInterval(interval);
  }, [isLiveScanning, onLiveAnalyze]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    soundService.play("PROCESSING");
    setAnalyzing(true);

    // Flash effect
    const flash = document.createElement("div");
    flash.className =
      "absolute inset-0 bg-white z-[300] animate-out fade-out duration-500";
    document.body.appendChild(flash);
    setTimeout(() => document.body.removeChild(flash), 500);

    const context = canvasRef.current.getContext("2d");
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      const base64 = canvasRef.current.toDataURL("image/jpeg", 0.85);
      const cleanBase64 = base64.split(",")[1];

      setTimeout(() => {
        onCapture(cleanBase64);
        onClose();
      }, 800);
    }
  };

  const content = (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center overflow-hidden font-mono select-none">
      {/* Camera Feed Layer */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover opacity-90 scale-x-[-1]" // Flip for mirror effect
        />
      </div>

      {/* Live Scan HUD Overlays */}
      {isLiveScanning && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Scrolling Scanline */}
          <div
            className="absolute top-0 left-0 w-full h-1 animate-[scan_2s_linear_infinite]"
            style={{
              backgroundColor: theme ? `${theme.hex}80` : undefined,
              boxShadow: theme ? `0 0 15px ${theme.hex}` : undefined,
            }}
          ></div>

          {/* Side Data Stream */}
          {!isMobile && (
            <div
              className="absolute right-4 top-20 bottom-32 w-64 flex flex-col items-end gap-2 text-[10px] font-bold tracking-wider opacity-90"
              style={{ color: theme?.hex }}
            >
              <div
                className="flex items-center gap-2 border-b pb-1 mb-2"
                style={{ borderColor: theme ? `${theme.hex}4d` : undefined }}
              >
                <Activity size={12} className="animate-pulse" />{" "}
                LIVE_ANALYSIS_STREAM
              </div>
              {scanLog.map((log, i) => (
                <div
                  key={i}
                  className="bg-black/60 px-2 py-1 border-r-2 animate-in slide-in-from-right-4 fade-in duration-300 text-right max-w-full break-words"
                  style={{ borderColor: theme?.hex }}
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HUD Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none p-6 md:p-12 flex flex-col justify-between">
        {/* Top HUD */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 drop-shadow-lg">
            <div
              className={`flex items-center gap-2 ${
                isLiveScanning ? "animate-pulse" : "text-slate-200"
              }`}
              style={isLiveScanning ? { color: theme?.hex } : undefined}
            >
              <Target size={isMobile ? 18 : 24} />
              <span className="text-[10px] md:text-xs font-bold tracking-[0.3em]">
                {isLiveScanning
                  ? "ASTRA_PROTOCOL: ONLINE"
                  : "VISION UPLINK ACTIVE"}
              </span>
            </div>
            <div className="text-[8px] md:text-[10px] text-white/40 uppercase tracking-widest">
              X9-CORE | SYNC: STABLE | LUX: AUTO
            </div>
          </div>
          <button
            onClick={onClose}
            className="pointer-events-auto p-3 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md active:scale-90"
          >
            <X size={isMobile ? 20 : 28} />
          </button>
        </div>

        {/* Center Reticle */}
        {!isLiveScanning && (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              isMobile ? "w-48 h-48" : "w-80 h-80"
            } border-2 border-white/10 rounded-2xl flex items-center justify-center`}
          >
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white/80 rounded-tl-sm"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white/80 rounded-tr-sm"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white/80 rounded-bl-sm"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white/80 rounded-br-sm"></div>

            <Crosshair
              className="text-white/20 animate-spin-slow"
              size={isMobile ? 32 : 48}
            />

            {analyzing && (
              <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] animate-pulse flex items-center justify-center">
                <span className="bg-white text-black px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                  Analyzing...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex items-center justify-center relative gap-12 md:gap-20 pointer-events-auto pb-8">
          {/* Live Scan Toggle */}
          {onLiveAnalyze && (
            <button
              onClick={() => setIsLiveScanning(!isLiveScanning)}
              className={`flex flex-col items-center gap-2 group transition-all active:scale-95 ${
                isLiveScanning ? "" : "text-white/40 hover:text-white"
              }`}
              style={isLiveScanning ? { color: theme?.hex } : undefined}
            >
              <div
                className={`p-4 rounded-full border-2 transition-all ${
                  isLiveScanning ? "" : "bg-black/40 border-white/10"
                }`}
                style={
                  isLiveScanning
                    ? {
                        backgroundColor: `${theme?.hex}33`,
                        borderColor: theme?.hex,
                        boxShadow: `0 0 20px ${theme?.hex}4d`,
                      }
                    : undefined
                }
              >
                <Eye
                  size={isMobile ? 20 : 24}
                  className={isLiveScanning ? "animate-pulse" : ""}
                />
              </div>
              <span className="text-[8px] font-black tracking-[0.2em] uppercase">
                Astra Scan
              </span>
            </button>
          )}

          {/* Capture Button */}
          <button
            onClick={handleCapture}
            disabled={analyzing}
            className={`group relative flex items-center justify-center transition-all active:scale-90 ${
              isLiveScanning ? "opacity-20 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white group-hover:scale-105 transition-transform duration-300 shadow-2xl"></div>
            <div className="absolute w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors"></div>
            <div className="absolute w-16 h-16 md:w-20 md:h-20 rounded-full bg-white transition-all shadow-inner shadow-black/20"></div>

            <Aperture
              size={isMobile ? 24 : 32}
              className="absolute text-black/40 group-hover:text-black group-hover:rotate-180 transition-all duration-700 ease-out"
            />
          </button>

          {/* Symmetry Spacer */}
          {onLiveAnalyze && <div className="w-[60px] md:w-[80px]"></div>}
        </div>
      </div>

      {/* Screen Effects */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_3px,3px_100%] z-20"></div>
    </div>
  );

  return createPortal(content, document.body);
};

export default VisionCameraModal;
