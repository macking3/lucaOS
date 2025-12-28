import React, { useState, useEffect } from "react";
import { Camera, CheckCircle, SkipForward, Scan, Check } from "lucide-react";
import VisionCameraModal from "../VisionCameraModal";
import { soundService } from "../../services/soundService";
import { useMobile } from "../../hooks/useMobile";
import { apiUrl } from "../../config/api";

interface FaceScanProps {
  userName: string;
  onComplete: (faceData: string | null) => void;
  onSkip: () => void;
  title?: string;
  description?: string;
  enrollmentEndpoint?: string;
  confirmMessage?: string;
  hideHeader?: boolean;
  compact?: boolean;
  theme?: {
    primary: string;
    hex: string;
  };
}

/**
 * Face scan component for operator recognition
 * Captures operator's face for security verification
 */
const FaceScan: React.FC<FaceScanProps> = ({
  userName,
  onComplete,
  onSkip,
  title = "Facial Recognition Setup",
  description,
  enrollmentEndpoint,
  confirmMessage,
  hideHeader = false,
  compact = false,
  theme,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMobile();

  const defaultDescription =
    description ||
    `Hey ${userName}! I'd like to remember your face so I can recognize you in the future. This helps me verify it's really you when you use advanced features.`;

  // Check if camera is available
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some((d) => d.kind === "videoinput");
        setCameraAvailable(hasCamera);

        // Auto-skip if no camera
        if (!hasCamera) {
          console.log("[FaceScan] No camera detected, auto-skipping");
          setTimeout(() => onSkip(), 2000);
        }
      } catch (error) {
        console.error("[FaceScan] Error checking camera:", error);
        setCameraAvailable(false);
        setTimeout(() => onSkip(), 2000);
      }
    };

    checkCamera();
  }, [onSkip]);

  const handleCapture = async (base64Image: string) => {
    setCapturedImage(base64Image);
    setShowCamera(false);
    setScanning(true);
    soundService.play("PROCESSING");

    // Perform Enrollment if endpoint provided
    let enrollmentSuccessful = true;
    if (enrollmentEndpoint) {
      try {
        console.log(`[FaceScan] Enrolling to ${enrollmentEndpoint}...`);
        const res = await fetch(apiUrl(enrollmentEndpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userName,
            faceImageBase64: base64Image,
          }),
        });
        if (!res.ok) enrollmentSuccessful = false;
      } catch (e) {
        console.error("[FaceScan] Enrollment failed:", e);
        enrollmentSuccessful = false;
      }
    }

    // Simulate scanning animation for 2 seconds (plus actual network time if any)
    setTimeout(() => {
      setScanning(false);

      if (enrollmentSuccessful) {
        setConfirmed(true);
        soundService.play("SUCCESS");

        // Speak confirmation
        speakConfirmation();

        // Complete after showing confirmation
        setTimeout(() => {
          onComplete(base64Image);
        }, 2000);
      } else {
        setError("Enrollment failed. Please try again.");
        soundService.play("ALERT");
        // Reset after error
        setTimeout(() => {
          setCapturedImage(null);
          setError(null);
        }, 3000);
      }
    }, 2500);
  };

  const speakConfirmation = () => {
    const messages = [
      confirmMessage || `Perfect! I've got your face saved, ${userName}.`,
      `Face recognized and stored securely, ${userName}.`,
    ];

    const message =
      messages[
        Math.floor(Math.random() * (confirmMessage ? 1 : messages.length))
      ];

    // Try to use speech synthesis
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!cameraAvailable) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl text-center">
        <div className="w-20 h-20 mx-auto bg-white/10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-xl">
          <Camera className="w-10 h-10 text-white/40" />
        </div>
        <p className="text-gray-400 text-sm">
          No camera detected. Skipping facial recognition setup...
        </p>
      </div>
    );
  }

  // Scanning animation overlay
  if (scanning && capturedImage) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl">
        <div className="relative">
          {/* Captured image */}
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Captured face"
            className="w-full max-w-md mx-auto rounded-lg border-2"
            style={{ borderColor: theme ? `${theme.hex}80` : undefined }}
          />

          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0 animate-scan-line"
              style={{
                background: theme
                  ? `linear-gradient(to bottom, transparent, ${theme.hex}33, transparent)`
                  : undefined,
              }}
            />

            {/* Scan grid effect */}
            <div
              className="absolute inset-0 bg-[size:20px_20px]"
              style={{
                backgroundImage: theme
                  ? `linear-gradient(${theme.hex}1a 1px, transparent 1px), linear-gradient(90deg, ${theme.hex}1a 1px, transparent 1px)`
                  : undefined,
              }}
            />

            {/* Corner brackets */}
            <div
              className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />
            <div
              className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />
            <div
              className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />
            <div
              className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 animate-pulse"
              style={{ borderColor: theme?.hex }}
            />

            {/* Center scanning icon */}
            <div
              className="bg-black/60 backdrop-blur-sm px-6 py-3 rounded-lg border"
              style={{ borderColor: theme ? `${theme.hex}80` : undefined }}
            >
              <div className="flex items-center gap-3">
                <Scan
                  className="w-5 h-5 animate-pulse"
                  style={{ color: theme?.hex }}
                />
                <span
                  className="font-mono text-sm"
                  style={{ color: theme?.hex }}
                >
                  {enrollmentEndpoint
                    ? "ENROLLING BIOMETRIC DATA..."
                    : "SCANNING BIOMETRIC DATA..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm animate-pulse">
          {enrollmentEndpoint
            ? "Registering identity with local core..."
            : "Processing facial recognition data..."}
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl text-center">
        <div className="w-24 h-24 mx-auto bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center backdrop-blur-xl">
          <CheckCircle className="w-12 h-12 text-red-500 rotate-45" />
        </div>
        <h3 className="text-xl font-bold text-white">Enrollment Failed</h3>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  // Confirmation state
  if (confirmed && capturedImage) {
    return (
      <div className="space-y-6 animate-fade-in-up w-full max-w-2xl text-center">
        <div className="w-24 h-24 mx-auto bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center backdrop-blur-xl animate-scale-in">
          <Check className="w-12 h-12 text-green-500" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Face Recognized!</h3>
          <p className="text-green-400 text-sm">
            {confirmMessage ||
              `Perfect! I've got your face saved, ${userName}.`}
          </p>
        </div>

        <img
          src={`data:image/jpeg;base64,${capturedImage}`}
          alt="Your face"
          className="w-32 h-32 mx-auto rounded-lg border-2 border-green-500/50 object-cover"
        />

        <p className="text-gray-400 text-xs">Proceeding to next step...</p>
      </div>
    );
  }

  return (
    <div
      className={`${
        compact
          ? isMobile
            ? "space-y-1"
            : "space-y-3"
          : isMobile
          ? "space-y-4"
          : "space-y-6"
      } animate-fade-in-up w-full max-w-2xl mx-auto transition-all`}
    >
      {/* Luca's Introduction */}
      {!hideHeader && (
        <div className={`text-center ${compact ? "space-y-0.5" : "space-y-4"}`}>
          <div
            className={`${
              compact ? (isMobile ? "w-8 h-8" : "w-12 h-12") : "w-20 h-20"
            } mx-auto bg-white/10 border rounded-full flex items-center justify-center backdrop-blur-xl transition-all`}
            style={{
              borderColor: theme ? `${theme.hex}50` : "rgba(255,255,255,0.2)",
              boxShadow: theme ? `0 0 20px ${theme.hex}33` : "none",
            }}
          >
            <Camera
              className={`${
                compact ? (isMobile ? "w-4 h-4" : "w-6 h-6") : "w-10 h-10"
              }`}
              style={{ color: theme ? theme.hex : "rgba(255,255,255,0.8)" }}
            />
          </div>

          <h2
            className={`${
              compact ? (isMobile ? "text-sm" : "text-base") : "text-2xl"
            } font-bold uppercase tracking-widest text-white transition-all`}
          >
            {title}
          </h2>

          <p
            className={`text-gray-400 ${
              compact ? (isMobile ? "text-[8.5px]" : "text-[11px]") : "text-sm"
            } max-w-md mx-auto transition-all pt-0.5 leading-tight`}
          >
            {defaultDescription}
          </p>
        </div>
      )}

      <div
        className={`bg-white/5 border border-white/10 rounded-xl ${
          compact
            ? isMobile
              ? "p-1.5 space-y-0.5"
              : "p-3 space-y-1.5"
            : "p-5 space-y-3"
        } backdrop-blur-xl text-gray-400 shadow-inner transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle
              size={compact ? 9 : 14}
              className="text-green-500/80"
            />
          </div>
          <span
            className={`${compact ? "text-[9px]" : "text-xs"} leading-tight`}
          >
            Photo is processed locally and stays on your device (never uploaded)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle
              size={compact ? 9 : 14}
              className="text-green-500/80"
            />
          </div>
          <span
            className={`${compact ? "text-[9px]" : "text-xs"} leading-tight`}
          >
            Used exclusively for high-security verification protocols
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle
              size={compact ? 9 : 14}
              className="text-green-500/80"
            />
          </div>
          <span
            className={`${compact ? "text-[9px]" : "text-xs"} leading-tight`}
          >
            Revocable at any time through System Settings
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className={`flex flex-col ${
          compact ? (isMobile ? "gap-1" : "gap-2") : "gap-3"
        }`}
      >
        <button
          onClick={() => setShowCamera(true)}
          className={`
            w-full 
            bg-white/10 
            border 
            hover:bg-white/20 
            text-white 
            ${compact ? (isMobile ? "py-2" : "py-3") : "py-4"} 
            rounded-xl 
            uppercase 
            tracking-[0.2em] 
            ${
              compact ? (isMobile ? "text-[9px]" : "text-[10px]") : "text-xs"
            } font-bold
            transition-all 
            flex 
            items-center 
            justify-center 
            ${compact ? "gap-1.5" : "gap-3"}
            backdrop-blur-xl
            active:scale-[0.98]
            shadow-lg
            group
          `}
          style={{
            borderColor: theme ? `${theme.hex}50` : "rgba(255,255,255,0.3)",
            boxShadow: theme
              ? `0 0 30px ${theme.hex}33`
              : "0 0 20px -10px rgba(255,255,255,0.3)",
          }}
        >
          <Camera
            size={compact ? (isMobile ? 12 : 14) : 18}
            className="group-hover:scale-110 transition-transform"
            style={{ color: theme?.hex }}
          />
          Capture My Face
        </button>

        <button
          onClick={onSkip}
          className={`
            w-full 
            bg-transparent 
            border border-white/5 
            hover:bg-white/5 
            hover:border-white/20 
            text-gray-500 
            hover:text-gray-300
            ${compact ? (isMobile ? "py-1" : "py-2") : "py-3"} 
            rounded-lg 
            ${compact ? (isMobile ? "text-[9px]" : "text-[10px]") : "text-xs"} 
            font-medium
            transition-all 
            flex 
            items-center 
            justify-center 
            gap-1.5
          `}
        >
          <SkipForward size={compact ? 10 : 14} />
          Skip for Now
        </button>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <VisionCameraModal
          onClose={() => setShowCamera(false)}
          onCapture={handleCapture}
          theme={theme}
        />
      )}
    </div>
  );
};

export default FaceScan;
