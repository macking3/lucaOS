import React from "react";
import { detectDeviceCapabilities } from "../../utils/deviceDetection";

interface HologramFace2DProps {
  step:
    | "BOOT"
    | "IDENTITY"
    | "FACE_SCAN"
    | "BRIDGE"
    | "MODE_SELECT"
    | "CONVERSATION"
    | "CALIBRATION"
    | "COMPLETE";
}

/**
 * 2D Fallback for Hologram Face (for weak devices)
 * Uses static icon with CSS animations instead of 3D WebGL
 */
const HologramFace2D: React.FC<HologramFace2DProps> = ({ step }) => {
  // Use ASSISTANT white theme by default
  const color = "#E0E0E0"; // White/Silver
  const glow = "rgba(224, 224, 224, 0.5)";

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Background Starfield */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Large 2D Icon Face */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-40"
        style={{
          filter: `drop-shadow(0 0 40px ${glow}) drop-shadow(0 0 80px ${glow})`,
        }}
      >
        <div className="relative w-[400px] h-[400px] animate-pulse">
          {/* Luca Icon */}
          <img
            src="/icon.png"
            alt="Luca AI"
            className="w-full h-full object-contain transition-all duration-1000"
            style={{
              filter: `brightness(1.2) contrast(1.3)`,
              animation:
                step === "CALIBRATION"
                  ? "spin 8s linear infinite"
                  : "float 6s ease-in-out infinite",
            }}
          />

          {/* Color overlay tint */}
          <div
            className="absolute inset-0 mix-blend-overlay rounded-full"
            style={{
              background: `radial-gradient(circle, ${color}60 0%, transparent 70%)`,
            }}
          />

          {/* Scanline effect (lighter than 3D version) */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 h-[2px]"
                style={{
                  top: `${i * 5}%`,
                  background: color,
                  opacity: 0.1,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Wave Effect Rings - Only during calibration */}
      {step === "CALIBRATION" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-[300px] h-[300px] rounded-full border-2 opacity-20 animate-ping"
              style={{
                borderColor: color,
                animationDelay: `${i * 0.6}s`,
                animationDuration: "3s",
              }}
            />
          ))}
        </div>
      )}

      {/* Subtle Glow Pulse Effect */}
      <div
        className="absolute inset-0 opacity-10 animate-pulse pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 50%)`,
          animationDuration: "4s",
        }}
      />

      {/* CSS Keyframes for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HologramFace2D;
