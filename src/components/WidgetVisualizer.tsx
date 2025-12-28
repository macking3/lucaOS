import React, { useEffect, useRef } from "react";

// Shared Theme Constants (Consider moving to a shared constants file later)
export const THEME_COLORS = {
  RUTHLESS: { primary: "#3b82f6", secondary: "#60a5fa", dark: "#1d4ed8" }, // Blue
  ENGINEER: { primary: "#C9763D", secondary: "#E09F70", dark: "#8B4513" }, // Terracotta
  ASSISTANT: { primary: "#E0E0E0", secondary: "#F5F5F5", dark: "#9E9E9E" }, // Light Grey
  HACKER: { primary: "#10b981", secondary: "#34d399", dark: "#047857" }, // Green
  DICTATION: { primary: "#a855f7", secondary: "#d8b4fe", dark: "#7e22ce" }, // Purple
};

interface WidgetVisualizerProps {
  amplitude: number;
  isVadActive: boolean;
  isSpeaking: boolean;
  persona?: string;
  onClick?: () => void;
}

const WidgetVisualizer: React.FC<WidgetVisualizerProps> = ({
  amplitude,
  isVadActive,
  isSpeaking,
  persona,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Refs for tracking animation state without re-rendering loop
  const stateRef = useRef({ amplitude, isVadActive, isSpeaking, persona });

  // Update refs when props change (this avoids restarting the animation loop)
  useEffect(() => {
    stateRef.current = { amplitude, isVadActive, isSpeaking, persona };
  }, [amplitude, isVadActive, isSpeaking, persona]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      // Access fresh state from Ref
      const { amplitude, isVadActive, isSpeaking, persona } = stateRef.current;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() * 0.001;
      const tick = time;

      // Base Config
      const baseOrbRadius = 25;
      const activeScale = isVadActive ? 1.2 : 1.0;

      // THEMED COLORS
      const currentTheme =
        THEME_COLORS[persona as keyof typeof THEME_COLORS] ||
        THEME_COLORS.RUTHLESS;

      const primaryColor = currentTheme.primary;
      const secondaryColor = currentTheme.secondary;
      const darkColor = currentTheme.dark;

      // 1. LIQUID PLASMA ORB
      ctx.save();
      ctx.translate(centerX, centerY);

      ctx.beginPath();
      // Draw fluid shape
      const points = 100;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        // Wave math
        const w1 = Math.sin(angle * 3 + tick) * 5;
        const w2 = Math.cos(angle * 6 - tick * 1.5) * 4;
        const w3 = Math.sin(angle * 12 + tick * 5) * (amplitude * 30);
        const pulse = amplitude * 15;
        const r = (baseOrbRadius + w1 + w2 + w3 + pulse) * activeScale;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Gradients
      const gradient = ctx.createRadialGradient(
        0,
        0,
        baseOrbRadius * 0.2,
        0,
        0,
        baseOrbRadius * 1.5
      );

      if (isVadActive) {
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.4, secondaryColor);
        gradient.addColorStop(1, `${primaryColor}00`);
      } else if (isSpeaking && amplitude > 0.05) {
        gradient.addColorStop(0, secondaryColor);
        gradient.addColorStop(0.5, primaryColor);
        gradient.addColorStop(1, `${primaryColor}00`);
      } else {
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.6, `${darkColor}80`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Outer Glow
      ctx.shadowBlur = 10 + amplitude * 20;
      ctx.shadowColor = isVadActive ? secondaryColor : primaryColor;
      ctx.strokeStyle = isVadActive ? "#ffffff" : `${primaryColor}80`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // 2. ORBITAL RINGS
      // Ring 1: Dashed Outer
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tick * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, baseOrbRadius * 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = `${primaryColor}33`;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 15]);
      ctx.stroke();
      ctx.restore();

      // Ring 2: Audio Spectrum Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.arc(0, 0, baseOrbRadius * 2.2 + amplitude * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `${primaryColor}33`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []); // Run once on mount! loop depends on ref

  return (
    <div
      className="relative w-32 h-32 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform group"
      style={{ WebkitAppRegion: "no-drag" } as any}
      onClick={onClick}
      title="Toggle Voice Input"
    >
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Hover Hint Ring */}
      <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 transition-all pointer-events-none"></div>
    </div>
  );
};

export default WidgetVisualizer;
