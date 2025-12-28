/**
 * Always-On Controls Component
 * UI buttons for controlling Always-On Vision and Audio monitoring
 */

import React, { useState, useEffect } from "react";
import { Hand, Mic, MicOff } from "lucide-react";
import { apiUrl } from "../config/api";

interface Props {
  onVisionToggle: (active: boolean) => void;
  onAudioToggle: (active: boolean) => void;
  isMobile?: boolean;
  theme: { hex: string; bg: string; border: string; primary: string };
}

const AlwaysOnControls: React.FC<Props> = ({
  onVisionToggle,
  onAudioToggle,
  isMobile = false,
  theme,
}) => {
  const [visionActive, setVisionActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [loading, setLoading] = useState({ vision: false, audio: false });

  // Fetch status on mount and periodically
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      // Fetch vision status
      const visionRes = await fetch(apiUrl("/api/vision/status"));
      if (visionRes.ok) {
        const contentType = visionRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const text = await visionRes.text();
          if (text) {
            try {
              const visionData = JSON.parse(text);
              setVisionActive(visionData.running || false);
              onVisionToggle(visionData.running || false);
            } catch (parseError) {
              console.warn(
                "[AlwaysOnControls] Failed to parse vision status JSON:",
                parseError
              );
            }
          }
        } else {
          console.warn(
            "[AlwaysOnControls] Vision status not JSON, server may not be running"
          );
        }
      }

      // Fetch audio status
      const audioRes = await fetch(apiUrl("/api/audio/status"));
      if (audioRes.ok) {
        const contentType = audioRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const text = await audioRes.text();
          if (text) {
            try {
              const audioData = JSON.parse(text);
              setAudioActive(audioData.isRunning || false);
              onAudioToggle(audioData.isRunning || false);
            } catch (parseError) {
              console.warn(
                "[AlwaysOnControls] Failed to parse audio status JSON:",
                parseError
              );
            }
          }
        } else {
          console.warn(
            "[AlwaysOnControls] Audio status not JSON, server may not be running"
          );
        }
      }
    } catch (error) {
      console.error("[AlwaysOnControls] Failed to fetch status:", error);
    }
  };

  const handleVisionToggle = async () => {
    setLoading((prev) => ({ ...prev, vision: true }));
    try {
      const action = visionActive ? "stop" : "start";
      const response = await fetch(apiUrl(`/api/vision/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "start" ? JSON.stringify({}) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server returned non-JSON response. Is the server running?"
        );
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from server");
      }
      const data = JSON.parse(text);
      if (data.success) {
        setVisionActive(!visionActive);
        onVisionToggle(!visionActive);
      } else {
        alert(
          `Failed to ${action} vision monitoring: ${
            data.error || "Unknown error"
          }`
        );
      }
    } catch (error: any) {
      console.error("[AlwaysOnControls] Vision toggle error:", error);
      alert(
        `Error: ${
          error.message ||
          "Failed to communicate with server. Please ensure the server is running on port 3001."
        }`
      );
    } finally {
      setLoading((prev) => ({ ...prev, vision: false }));
    }
  };

  const handleAudioToggle = async () => {
    setLoading((prev) => ({ ...prev, audio: true }));
    try {
      const action = audioActive ? "stop" : "start";
      const response = await fetch(apiUrl(`/api/audio/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "start" ? JSON.stringify({}) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server returned non-JSON response. Is the server running?"
        );
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from server");
      }
      const data = JSON.parse(text);
      if (data.success) {
        setAudioActive(!audioActive);
        onAudioToggle(!audioActive);
      } else {
        alert(
          `Failed to ${action} audio monitoring: ${
            data.error || "Unknown error"
          }`
        );
      }
    } catch (error: any) {
      console.error("[AlwaysOnControls] Audio toggle error:", error);
      alert(
        `Error: ${
          error.message ||
          "Failed to communicate with server. Please ensure the server is running on port 3001."
        }`
      );
    } finally {
      setLoading((prev) => ({ ...prev, audio: false }));
    }
  };

  return (
    <div className={`flex items-center ${isMobile ? "gap-1" : "gap-2"}`}>
      {/* Vision Control Button */}
      <button
        onClick={handleVisionToggle}
        disabled={loading.vision}
        className={`
                    flex items-center justify-center ${
                      isMobile ? "p-1.5 w-8 h-8" : "gap-2 px-3 py-1.5"
                    } rounded text-xs font-bold transition-all
                    ${
                      visionActive
                        ? `${theme.bg.replace("/20", "/30")} ${theme.border} ${
                            theme.primary
                          } shadow-lg`
                        : `${theme.bg} border ${theme.border} ${theme.primary} opacity-80 hover:opacity-100`
                    }
                    ${
                      loading.vision
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }
                `}
        style={
          !visionActive
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
        onMouseEnter={(e) => {
          if (!visionActive) {
            const borderColor = theme.border.includes("blue")
              ? "rgba(59, 130, 246, 0.4)"
              : theme.border.includes("#E0E0E0")
              ? "rgba(224, 224, 224, 0.4)"
              : theme.border.includes("green")
              ? "rgba(16, 185, 129, 0.4)"
              : theme.border.includes("#C9763D")
              ? "rgba(201, 118, 61, 0.4)"
              : "rgba(59, 130, 246, 0.4)";
            const glow = theme.border.includes("blue")
              ? "0 0 20px rgba(59, 130, 246, 0.15)"
              : theme.border.includes("#E0E0E0")
              ? "0 0 20px rgba(224, 224, 224, 0.15)"
              : theme.border.includes("green")
              ? "0 0 20px rgba(16, 185, 129, 0.15)"
              : theme.border.includes("#C9763D")
              ? "0 0 20px rgba(201, 118, 61, 0.15)"
              : "0 0 20px rgba(59, 130, 246, 0.15)";
            e.currentTarget.style.borderColor = borderColor;
            e.currentTarget.style.boxShadow = `${glow}, inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 0 ${borderColor}`;
          }
        }}
        onMouseLeave={(e) => {
          if (!visionActive) {
            const borderColor = theme.border.includes("blue")
              ? "rgba(59, 130, 246, 0.4)"
              : theme.border.includes("#E0E0E0")
              ? "rgba(224, 224, 224, 0.4)"
              : theme.border.includes("green")
              ? "rgba(16, 185, 129, 0.4)"
              : theme.border.includes("#C9763D")
              ? "rgba(201, 118, 61, 0.4)"
              : "rgba(59, 130, 246, 0.4)";
            e.currentTarget.style.borderColor = borderColor;
            e.currentTarget.style.boxShadow =
              "inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 0 rgba(100, 116, 139, 0.1)";
          }
        }}
        title={visionActive ? "Stop God Hand" : "Start God Hand"}
      >
        {visionActive ? (
          <Hand size={isMobile ? 16 : 14} />
        ) : (
          <Hand size={isMobile ? 16 : 14} className="opacity-50" />
        )}
        {!isMobile && <span>GOD HAND</span>}
        {visionActive && (
          <span
            className="rounded-full animate-pulse"
            style={{
              backgroundColor: theme.hex,
              width: isMobile ? "6px" : "8px",
              height: isMobile ? "6px" : "8px",
              marginLeft: isMobile ? "0px" : "4px",
              position: isMobile ? "absolute" : "relative",
              top: isMobile ? "0px" : "auto",
              right: isMobile ? "0px" : "auto",
              marginTop: isMobile ? "-2px" : "auto",
              marginRight: isMobile ? "-2px" : "auto",
            }}
          />
        )}
      </button>
    </div>
  );
};

export default AlwaysOnControls;
