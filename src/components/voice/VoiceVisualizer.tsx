import React, { useEffect, useRef } from "react";
import { PersonaType } from "../../services/lucaService";

// --- CANVAS THEME COLORS (Raw Hex for Canvas API) ---
const CANVAS_THEME_COLORS: Record<
  PersonaType,
  { primary: string; secondary: string; dark: string }
> = {
  DEFAULT: { primary: "#3b82f6", secondary: "#60a5fa", dark: "#1d4ed8" }, // Blue
  RUTHLESS: { primary: "#3b82f6", secondary: "#60a5fa", dark: "#1d4ed8" }, // Blue
  ENGINEER: { primary: "#C9763D", secondary: "#E09F70", dark: "#8B4513" }, // Terracotta
  ASSISTANT: { primary: "#E0E0E0", secondary: "#F5F5F5", dark: "#9E9E9E" }, // Light Grey
  HACKER: { primary: "#10b981", secondary: "#34d399", dark: "#047857" }, // Green
  DICTATION: { primary: "#a855f7", secondary: "#d8b4fe", dark: "#9333ea" }, // Purple
};

interface VoiceVisualizerProps {
  amplitude: number;
  isVadActive: boolean;
  transcriptSource: "user" | "model";
  persona: PersonaType;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  amplitude,
  isVadActive,
  transcriptSource,
  persona,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amplitudeRef = useRef(amplitude);
  const isVadActiveRef = useRef(isVadActive);
  const transcriptSourceRef = useRef(transcriptSource);
  const personaRef = useRef(persona);

  // Sync refs with props for the animation loop
  useEffect(() => {
    amplitudeRef.current = amplitude;
    isVadActiveRef.current = isVadActive;
    transcriptSourceRef.current = transcriptSource;
    personaRef.current = persona;
  }, [amplitude, isVadActive, transcriptSource, persona]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      if (!canvas || !ctx) return;

      const currentAmplitude = amplitudeRef.current;
      const currentIsVadActive = isVadActiveRef.current;
      const currentSource = transcriptSourceRef.current;
      const currentPersona = personaRef.current;
      const themeColors = CANVAS_THEME_COLORS[currentPersona];

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 150;
      const time = Date.now() * 0.001;
      const tick = time;

      // --- 1. LIQUID PLASMA ORB (The Core) ---
      const baseOrbRadius = Math.min(canvas.width, canvas.height) * 0.18; // Size of the orb
      const activeScale = currentIsVadActive ? 1.2 : 1.0;

      ctx.save();
      ctx.translate(centerX, centerY);

      ctx.beginPath();
      // Draw fluid shape
      const points = 120;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;

        // Wave superposition for "liquid" effect
        const w1 = Math.sin(angle * 3 + tick) * 10;
        const w2 = Math.cos(angle * 6 - tick * 1.5) * 8;
        const w3 = Math.sin(angle * 12 + tick * 5) * (currentAmplitude * 60);
        const pulse = currentAmplitude * 30;

        const r = (baseOrbRadius + w1 + w2 + w3 + pulse) * activeScale;

        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Fill Gradient Logic
      const gradient = ctx.createRadialGradient(
        0,
        0,
        baseOrbRadius * 0.2,
        0,
        0,
        baseOrbRadius * 1.5
      );

      if (currentIsVadActive) {
        // LISTENING: Bright Core
        gradient.addColorStop(0, "#ffffff"); // White hot core
        gradient.addColorStop(0.4, themeColors.secondary);
        gradient.addColorStop(1, `${themeColors.primary}00`); // Transparent edge
      } else if (currentSource === "model" && currentAmplitude > 0.05) {
        // SPEAKING: Deep Pulse
        gradient.addColorStop(0, themeColors.secondary);
        gradient.addColorStop(0.5, themeColors.primary);
        gradient.addColorStop(1, `${themeColors.primary}00`);
      } else {
        // STANDBY: Subtle Glow
        gradient.addColorStop(0, themeColors.primary);
        gradient.addColorStop(0.6, `${themeColors.dark}80`); // 50% opacity
        gradient.addColorStop(1, "rgba(0,0,0,0)");
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Outer Glow Stroke
      ctx.shadowBlur = 20 + currentAmplitude * 30;
      ctx.shadowColor = currentIsVadActive
        ? themeColors.secondary
        : themeColors.primary;
      ctx.strokeStyle = currentIsVadActive
        ? "#ffffff"
        : `${themeColors.primary}80`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
      ctx.restore();

      // Ring 1: Dashed Outer
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tick * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = `${themeColors.primary}33`; // 20% opacity
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 20]); // Dashed
      ctx.stroke();
      ctx.restore();

      // Ring 2: Segmented Containment
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-tick * 0.5);
      const segments = 3;
      for (let i = 0; i < segments; i++) {
        ctx.rotate((Math.PI * 2) / segments);
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 2.2, 0, Math.PI * 0.4); // Arc segment
        ctx.strokeStyle = currentIsVadActive
          ? themeColors.secondary
          : themeColors.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Ring 3: Audio Spectrum Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        baseOrbRadius * 2.5 + currentAmplitude * 20,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = `${themeColors.primary}33`; // 20% opacity
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []); // Run setup once, loop uses refs for updating values

  return (
    <div className="relative w-full h-full flex items-center justify-center z-20 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute inset-0 w-full h-full"
      />
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[size:60px_60px]"
        style={{
          backgroundImage: `linear-gradient(${CANVAS_THEME_COLORS[persona].primary}1A 1px, transparent 1px), linear-gradient(90deg, ${CANVAS_THEME_COLORS[persona].primary}1A 1px, transparent 1px)`,
        }}
      ></div>
    </div>
  );
};

export default VoiceVisualizer;
