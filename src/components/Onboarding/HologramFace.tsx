import React, { useMemo } from "react";
import HologramScene from "../Hologram/HologramScene";
import HologramFace2D from "./HologramFace2D";
import { detectDeviceCapabilities } from "../../utils/deviceDetection";

interface HologramFaceProps {
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
 * Smart Hologram Face Component
 * - Uses 3D WebGL version on capable devices
 * - Falls back to 2D CSS version on weak devices
 */
const HologramFace: React.FC<HologramFaceProps> = ({ step }) => {
  // Detect device capabilities once
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);

  // Use ASSISTANT white theme by default
  const color = "#E0E0E0"; // White/Silver
  const glow = "rgba(224, 224, 224, 0.3)";

  // Use 2D fallback for low-performance devices
  if (capabilities.isLowPerformance) {
    console.log(
      "[Hologram] Low-performance device detected, using 2D fallback"
    );
    return <HologramFace2D step={step} />;
  }

  // Use full 3D for capable devices
  console.log(`[Hologram] Using 3D version (GPU: ${capabilities.gpuTier})`);

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Background Starfield */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(100)].map((_, i) => (
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

      {/* Large 3D Holographic Face */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-30"
        style={{
          filter: `drop-shadow(0 0 60px ${glow}) drop-shadow(0 0 100px ${glow})`,
        }}
      >
        <div className="w-full h-full max-w-[800px] max-h-[800px]">
          <HologramScene
            color={color}
            audioLevel={step === "CALIBRATION" ? 150 : 0}
          />
        </div>
      </div>

      {/* Wave Effect Rings - Only during calibration */}
      {step === "CALIBRATION" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-[400px] h-[400px] rounded-full border-2 opacity-20 animate-ping"
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
    </div>
  );
};

export default HologramFace;
