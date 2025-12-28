import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Eye, EyeOff, Monitor, X } from "lucide-react";

interface ScreenShareProps {
  onFrameCapture: (base64Image: string) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
  theme: { hex: string; bg: string; border: string; primary: string };
  isMobile?: boolean; // New prop for mobile detection
  showUI?: boolean; // New prop to control visibility
}

export interface ScreenShareHandle {
  captureFrame: () => string | null | undefined;
}

export const ScreenShare = forwardRef<ScreenShareHandle, ScreenShareProps>(
  (
    {
      onFrameCapture,
      isActive,
      onToggle,
      theme,
      isMobile = false,
      showUI = true,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null); // Ref to track stream for cleanup
    const [error, setError] = useState<string | null>(null);
    const [availableSources, setAvailableSources] = useState<any[]>([]);
    const [showSourcePicker, setShowSourcePicker] = useState(false);

    // Expose capture functionality to parent
    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        if (isActive && videoRef.current && canvasRef.current) {
          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Low quality JPEG for massive bandwidth saving (good enough for vision)
              const base64Image = canvas.toDataURL("image/jpeg", 0.4);
              onFrameCapture(base64Image); // Still call callback if needed
              return base64Image; // Return directly
            }
          } catch (err) {
            console.error("Manual frame capture failed:", err);
          }
        }
        return null;
      },
    }));

    // Start/Stop Screen Share
    useEffect(() => {
      let currentStream: MediaStream | null = null;

      const startCapture = async () => {
        try {
          // If already active, don't restart (unless stream is missing)
          if (streamRef.current) return;

          console.log("Starting Screen Share...");
          let mediaStream: MediaStream;

          // ELECTRON: Use desktopCapturer via main process
          if (window.luca && window.luca.triggerScreenPermission) {
            // ... (Electron logic typically handles sources differently,
            // but for now we assume the bridge returns a sourceId or controls selection)
            // Simplified: Just ask for sources first
            const sources = await window.luca.triggerScreenPermission();
            console.log("Got sources:", sources);

            if (sources.length === 1) {
              // Auto-select if only 1
              const source = sources[0];
              mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: source.id,
                    maxWidth: 1920,
                    maxHeight: 1080,
                  },
                } as any,
              });
            } else {
              // Show picker
              setAvailableSources(sources);
              setShowSourcePicker(true);
              return;
            }
          } else {
            // WEB FALLBACK
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 5 }, // Low FPS is fine for screenshots
              },
              audio: false,
            });
          }

          setStream(mediaStream);
          streamRef.current = mediaStream; // Update Ref
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setError(null);
          currentStream = mediaStream;

          // Track stop event (user clicks "Stop sharing" in browser UI)
          mediaStream.getVideoTracks()[0].onended = () => {
            onToggle(false);
          };
        } catch (err) {
          console.error("Error starting screen share:", err);
          setError("Failed to access screen. Permission denied?");
          onToggle(false);
        }
      };

      const stopCapture = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setStream(null);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }
      };

      if (isActive) {
        startCapture();
      } else {
        stopCapture();
        setShowSourcePicker(false);
      }

      return () => {
        stopCapture();
      };
    }, [isActive]);

    // Construct stream from selected source (Electron only)
    const selectSource = async (sourceId: string) => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              maxWidth: 1920,
              maxHeight: 1080,
            },
          } as any,
        });

        setStream(mediaStream);
        streamRef.current = mediaStream; // Update Ref
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setShowSourcePicker(false);
        setError(null);

        mediaStream.getVideoTracks()[0].onended = () => {
          onToggle(false);
        };
      } catch (err) {
        console.error("Failed to select source:", err);
        setError("Could not capture selected screen.");
      }
    };

    return (
      <div
        className={`${!showUI ? "hidden" : "flex"} fixed ${
          isMobile ? "bottom-36 right-4" : "bottom-4 right-4"
        } z-50 flex-col items-end gap-2`}
      >
        {/* Hidden Elements for Processing */}
        <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* SOURCE PICKER OVERLAY */}
        {showSourcePicker && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-4xl w-full flex flex-col max-h-[80vh]">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Eye className="text-green-400" /> SELECT EYE SOURCE
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto p-1 flex-1">
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => selectSource(source.id)}
                    className="group relative aspect-video bg-black rounded-lg border border-slate-700 hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all overflow-hidden flex flex-col"
                  >
                    <div className="flex-1 w-full relative overflow-hidden p-2">
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
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
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowSourcePicker(false)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-600"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UI Control */}
        {isMobile ? (
          <button
            onClick={() => onToggle(!isActive)}
            className={`p-3 rounded-full shadow-xl border backdrop-blur-md transition-all ${
              isActive
                ? "bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                : "bg-slate-900/80 border-slate-700 text-slate-400"
            }`}
          >
            {isActive ? (
              <Eye className="w-6 h-6" />
            ) : (
              <EyeOff className="w-6 h-6" />
            )}
          </button>
        ) : (
          <div
            className={`flex items-center gap-3 transition-all rounded-lg p-2 shadow-xl ${
              isActive ? "bg-gray-900 border border-green-500" : ""
            }`}
            style={
              !isActive
                ? {
                    background: "rgba(0, 0, 0, 0.25)",
                    border: theme.border.includes("blue")
                      ? "1px solid rgba(59, 130, 246, 0.4)"
                      : theme.border.includes("#E0E0E0")
                      ? "1px solid rgba(224, 224, 224, 0.4)"
                      : theme.border.includes("green")
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : theme.border.includes("#C9763D")
                      ? "1px solid rgba(201, 118, 61, 0.4)"
                      : "1px solid rgba(59, 130, 246, 0.4)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 0 rgba(100, 116, 139, 0.1)",
                  }
                : {}
            }
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isActive ? "bg-green-500 animate-pulse" : "bg-gray-500"
              }`}
            />

            <span className="text-xs font-mono text-gray-300">
              {isActive ? "EYE ACTIVE" : "EYE OFFLINE"}
            </span>

            <button
              onClick={() => onToggle(!isActive)}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${
                isActive ? "text-green-400" : "text-gray-400"
              }`}
              title={isActive ? "Stop Eye" : "Enable God Mode Eye"}
            >
              {isActive ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-900/80 text-red-200 text-xs p-2 rounded border border-red-500/50">
            {error}
          </div>
        )}
      </div>
    );
  }
);
