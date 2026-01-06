/**
 * Shared Glass Morphism Utilities for Luca UI
 * Provides consistent glassmorphic styling across all components
 */

export interface GlassStyleOptions {
  isActive?: boolean;
  isDanger?: boolean;
  themeColor?: string;
}

export const getGlassStyle = ({
  isActive = false,
  isDanger = false,
  themeColor = "#10b981", // Default emerald green
}: GlassStyleOptions = {}) => {
  const baseColor = isDanger ? "#ef4444" : themeColor;

  return {
    background: `${baseColor}${isActive ? "26" : "0d"}`,
    border: `1px solid ${baseColor}66`,
    boxShadow: isActive
      ? `0 0 20px ${baseColor}26, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
      : `inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 0 rgba(100, 116, 139, 0.1)`,
    borderColor: `${baseColor}66`,
    glow: `0 0 20px ${baseColor}26`,
  };
};

export const glassClasses = {
  modal: "bg-black/40 backdrop-blur-xl border border-white/10",
  panel: "bg-black/20 backdrop-blur-sm border border-white/5",
  button: "backdrop-blur-sm transition-all duration-200",
  input:
    "bg-black/30 backdrop-blur-sm border border-white/10 focus:border-white/30",
};

export const getThemeColor = (theme?: string): string => {
  const themes: Record<string, string> = {
    emerald: "#10b981",
    blue: "#3b82f6",
    purple: "#a855f7",
    red: "#ef4444",
    amber: "#f59e0b",
  };
  return themes[theme || "emerald"] || "#10b981";
};
