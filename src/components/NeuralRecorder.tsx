import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Monitor,
  Disc,
  Square,
  Lock,
  Eye,
  X,
  Upload,
} from "lucide-react";
import { soundService } from "../services/soundService";

interface Props {
  onClose: () => void;
  onSave: (
    blob: Blob,
    type: "DIGITAL" | "PHYSICAL",
    metadata: { name: string; description: string },
    events: any[]
  ) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export const NeuralRecorder: React.FC<Props> = ({
  onClose,
  onSave,
  theme,
}) => {
  const themePrimary = theme?.primary || "text-cyan-400";
  const themeBorder = theme?.border || "border-cyan-500";
  const themeBg = theme?.bg || "bg-cyan-950/10";
  const themeHex = theme?.hex || "#06b6d4";
  const [mode, setMode] = useState<"DIGITAL" | "PHYSICAL">("DIGITAL");
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [duration, setDuration] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  // --- SOURCE SELECTION STATE ---
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [availableSources, setAvailableSources] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- SAVE DETAILS STATE ---
  const [showSaveDetails, setShowSaveDetails] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");

  // --- STREAM HANDLING ---
  const initDigitalStream = async () => {
    try {
      if (window.luca && window.luca.triggerScreenPermission) {
        const sources = await window.luca.triggerScreenPermission();
        if (sources && sources.length > 0) {
          setAvailableSources(sources);
          setShowSourcePicker(true);
        } else {
          // Fallback to standard API if no sources returned (or not in Electron)
          const newStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
            // @ts-ignore
            cursor: "always",
          });
          handleStreamSuccess(newStream);
        }
      } else {
        // Not in Electron or missing bridge
        const newStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
          // @ts-ignore
          cursor: "always",
        });
        handleStreamSuccess(newStream);
      }
    } catch (err) {
      console.error("Digital stream init failed:", err);
      soundService.play("ALERT");
    }
  };

  const selectSource = async (sourceId: string) => {
    try {
      setShowSourcePicker(false);
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
          },
        },
      });
      handleStreamSuccess(newStream);
    } catch (err) {
      console.error("Source selection failed:", err);
      soundService.play("ALERT");
    }
  };

  const startStream = async () => {
    if (mode === "DIGITAL") {
      await initDigitalStream();
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        handleStreamSuccess(newStream);
      } catch (err) {
        console.error("Physical stream init failed:", err);
        soundService.play("ALERT");
      }
    }
  };

  const handleStreamSuccess = (newStream: MediaStream) => {
    setStream(newStream);
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
    }
    // Handle stream stop
    newStream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // --- RECORDING ---
  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    setEvents([]);

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      // Instead of saving immediately, show details modal
      stopStream();
      setShowSaveDetails(true);
    };

    recorder.start(1000); // 1s chunks
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    soundService.play("PROCESSING");

    // Start Timer
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Start Event Listeners for Digital Mode
    if (mode === "DIGITAL") {
      attachEventListeners();
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      soundService.play("SUCCESS");
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    detachEventListeners();
  };

  const handleFinalSave = () => {
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const finalEvents = mode === "DIGITAL" ? events : [];

    onSave(
      blob,
      mode,
      { name: skillName, description: skillDescription },
      finalEvents
    );
    onClose();
  };

  // --- EVENT LOGGING (DIGITAL MODE) ---
  const attachEventListeners = () => {
    window.addEventListener("click", handleGlobalClick, true);
    window.addEventListener("keydown", handleGlobalKeydown, true);
  };

  const detachEventListeners = () => {
    window.removeEventListener("click", handleGlobalClick, true);
    window.removeEventListener("keydown", handleGlobalKeydown, true);
  };

  const handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Basic selector generation
    const selector = target.id ? `#${target.id}` : target.tagName.toLowerCase();

    setEvents((prev) => [
      ...prev,
      {
        type: "click",
        timestamp: Date.now(),
        selector: selector,
        text: target.innerText?.substring(0, 20) || "",
        x: e.clientX,
        y: e.clientY,
      },
    ]);
  };

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    // SECURE INPUT MASKING
    const target = e.target as HTMLElement;
    const isPassword =
      target instanceof HTMLInputElement && target.type === "password";

    setEvents((prev) => [
      ...prev,
      {
        type: "keydown",
        timestamp: Date.now(),
        key: isPassword ? "[REDACTED]" : e.key,
        isSecure: isPassword,
      },
    ]);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      detachEventListeners();
    };
  }, []);

  // Format duration
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-0 sm:p-4">
      <div
        className={`w-full h-full sm:h-auto sm:max-w-4xl bg-slate-900/90 backdrop-blur-2xl border-none sm:border ${themeBorder}/30 rounded-none sm:rounded-xl overflow-y-auto sm:overflow-hidden flex flex-col relative`}
        style={{
          boxShadow: `0 0 50px ${themeHex}26`,
        }}
      >
        {/* SAVE DETAILS OVERLAY */}
        {showSaveDetails && (
          <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-md space-y-4 sm:space-y-6 my-auto py-8">
              <h3 className="text-lg sm:text-xl font-display font-bold text-white flex items-center gap-2">
                <Disc className="text-red-500 animate-pulse size-5 sm:size-6" />{" "}
                RECORDING COMPLETE
              </h3>

              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest uppercase">
                  SKILL NAME
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g., Crypto Trading Routine"
                  className="w-full bg-slate-800 border border-slate-700 rounded p-3 sm:p-4 text-white text-sm outline-none transition-colors"
                  style={{ borderColor: "rgba(51, 65, 85, 1)" }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = themeHex)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(51, 65, 85, 1)")
                  }
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest uppercase">
                  DESCRIPTION / GOAL
                </label>
                <textarea
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                  placeholder="Describe what you demonstrated so LUCA understands..."
                  className="w-full bg-slate-800 border border-slate-700 rounded p-3 sm:p-4 text-white text-sm h-32 sm:h-40 resize-none outline-none transition-colors"
                  style={{ borderColor: "rgba(51, 65, 85, 1)" }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = themeHex)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(51, 65, 85, 1)")
                  }
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 font-mono">
                <button
                  onClick={handleFinalSave}
                  disabled={!skillName}
                  className={`order-1 sm:order-2 flex-1 py-3 sm:py-4 font-bold rounded flex items-center justify-center gap-2 transition-all ${
                    skillName
                      ? "text-white shadow-lg active:scale-95"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                  style={
                    skillName
                      ? {
                          backgroundColor: themeHex,
                          boxShadow: `0 0 20px ${themeHex}4d`,
                        }
                      : {}
                  }
                >
                  <Upload size={16} /> SAVE IMPRINT
                </button>
                <button
                  onClick={() => {
                    setShowSaveDetails(false);
                    onClose();
                  }}
                  className="order-2 sm:order-1 flex-1 py-3 sm:py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded border border-slate-700 transition-colors"
                >
                  DISCARD
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SOURCE PICKER OVERLAY */}
        {showSourcePicker && (
          <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur flex flex-col animate-in fade-in">
            <div className="p-4 sm:p-8 flex-1 flex flex-col min-h-0">
              <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <Monitor className={themePrimary} size={20} /> SELECT SOURCE
              </h3>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 overflow-y-auto pb-24 p-1">
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => selectSource(source.id)}
                    className="group relative aspect-video bg-black rounded-lg border border-slate-700 transition-all overflow-hidden flex flex-col hover:shadow-lg"
                    style={{
                      borderColor: "rgba(51, 65, 85, 1)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = themeHex)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(51, 65, 85, 1)")
                    }
                  >
                    <div className="flex-1 w-full relative overflow-hidden p-2 flex items-center justify-center">
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="h-8 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center px-2 w-full">
                      <span className="text-[10px] text-slate-300 truncate font-mono w-full text-center">
                        {source.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 sm:p-8 border-t border-white/5 bg-black/60 backdrop-blur-md flex justify-end">
              <button
                onClick={() => setShowSourcePicker(false)}
                className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded border border-slate-700 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div
          className={`h-16 flex-shrink-0 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 backdrop-blur-md`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isRecording ? "bg-red-500 animate-pulse" : "bg-slate-600"
              }`}
            ></div>
            <h2
              className={`font-display font-bold ${themePrimary} tracking-[0.1em] sm:tracking-widest text-xs sm:text-sm truncate uppercase`}
            >
              NEURAL IMPRINTING
            </h2>
            {isRecording && (
              <span className="font-mono text-red-400 text-[10px] sm:text-xs ml-2 sm:ml-4 whitespace-nowrap">
                {formatTime(duration)}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="relative z-50 p-2 text-slate-500 hover:text-white transition-all cursor-pointer active:scale-95 flex-shrink-0"
          >
            <X size={20} className="sm:size-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col-reverse sm:flex-row gap-4 sm:gap-6 overflow-y-auto sm:overflow-hidden lg:items-stretch font-mono">
          {/* Left: Controls */}
          <div className="w-full sm:w-64 space-y-4 sm:space-y-6 flex-shrink-0">
            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                IMPRINT MODE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => !isRecording && setMode("DIGITAL")}
                  className={`p-3 rounded border flex flex-col items-center justify-center gap-2 transition-all ${
                    mode === "DIGITAL"
                      ? `${themeBg} ${themeBorder} ${themePrimary}`
                      : "bg-slate-800/50 border-white/5 text-slate-500 hover:border-white/10"
                  }`}
                  disabled={isRecording}
                >
                  <Monitor size={18} />
                  <span className="text-[9px] font-bold tracking-wider">
                    DIGITAL
                  </span>
                </button>
                <button
                  onClick={() => !isRecording && setMode("PHYSICAL")}
                  className={`p-3 rounded border flex flex-col items-center justify-center gap-2 transition-all ${
                    mode === "PHYSICAL"
                      ? `${themeBg} ${themeBorder} ${themePrimary}`
                      : "bg-slate-800/50 border-white/5 text-slate-500 hover:border-white/10"
                  }`}
                  disabled={isRecording}
                >
                  <Camera size={18} />
                  <span className="text-[9px] font-bold tracking-wider">
                    PHYSICAL
                  </span>
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/[0.02] p-4 rounded border border-white/5">
              <h3 className="text-[10px] font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                {mode === "DIGITAL" ? (
                  <Lock size={12} className={themePrimary} />
                ) : (
                  <Eye size={12} className={themePrimary} />
                )}
                {mode === "DIGITAL" ? "SECURE CAPTURE" : "VISUAL ANALYSIS"}
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                {mode === "DIGITAL"
                  ? "Screen & click tracking active. Passwords masked. Perform the task for automation."
                  : "Technique analysis active. Ensure good lighting and clear action visibility."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {!stream ? (
                <button
                  onClick={startStream}
                  className="w-full py-3 sm:py-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
                >
                  <Eye size={16} /> INITIALIZE SENSORS
                </button>
              ) : !isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-full py-3 sm:py-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95 animate-pulse"
                >
                  <Disc size={16} /> START IMPRINTING
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full py-3 sm:py-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95"
                >
                  <Square size={14} fill="currentColor" /> STOP REPLAY
                </button>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 min-h-[220px] sm:min-h-0 bg-black rounded-lg border border-white/5 overflow-hidden relative group aspect-video sm:aspect-auto flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="max-w-full max-h-full object-contain"
            />

            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 flex-col gap-4">
                <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02]">
                  {mode === "DIGITAL" ? (
                    <Monitor size={24} className="opacity-20" />
                  ) : (
                    <Camera size={24} className="opacity-20" />
                  )}
                </div>
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40">
                  SIGNAL_OFFLINE
                </span>
              </div>
            )}

            {/* Overlay Info */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-sm text-[9px] font-bold text-white flex items-center gap-2 border border-red-500/30">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                LIVE_DATA_FEED
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
