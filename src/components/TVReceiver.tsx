import React, { useState, useEffect } from "react";
import { Wifi } from "lucide-react";
import io, { Socket } from "socket.io-client";
import CinemaPlayer from "./CinemaPlayer";
import GhostBrowser from "./GhostBrowser";

// Import Refactored Components
import TVDataRoom from "./visual/TVDataRoom";
import TVDashboard from "./visual/TVDashboard";

import { WS_PORT } from "../config/api";

const TVReceiver = () => {
  const [status, setStatus] = useState("CONNECTING");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTask, setActiveTask] = useState("SYSTEM IDLE");
  const [vitals, setVitals] = useState({ cpu: 0, mem: 0 });
  const [theme, setTheme] = useState({
    hex: "#a855f7", // Default Purple
    primary: "text-purple-500",
  });

  // VISUAL CORE STATE
  const [mode, setMode] = useState<
    "IDLE" | "DATA_ROOM" | "CINEMA" | "BROWSER" | "DATA"
  >("IDLE");
  const [visualData, setVisualData] = useState<any>(null);
  const [browserUrl, setBrowserUrl] = useState<string>("");

  useEffect(() => {
    // Connect to Neural Link Server (Same as Mobile)
    const wsUrl = `http://${window.location.hostname}:${WS_PORT}`;
    const newSocket = io(wsUrl, {
      path: "/mobile/socket.io",
      query: { clientType: "tv" },
    });

    newSocket.on("connect", () => {
      setStatus("CONNECTED");
      newSocket.emit("register", {
        name: "Samsung TV Node",
        capabilities: ["display_target", "4k_render", "mirroring"],
      });
    });

    newSocket.on("disconnect", () => setStatus("DISCONNECTED"));

    // Listen for updates
    newSocket.on("client:message", (msg: any) => {
      if (msg.type === "vitals_update") {
        setVitals(msg.data);
      } else if (msg.type === "task_update") {
        setActiveTask(msg.data.taskName || "SYSTEM IDLE");
      } else if (msg.type === "theme_update") {
        setTheme(msg.theme);
      } else if (msg.type === "visual_core_sync") {
        // MIRRORING UPDATE
        console.log("[TV] Syncing Visual Core:", msg.data);
        setMode(msg.data.mode);
        setVisualData(msg.data.visualData);
        setBrowserUrl(msg.data.browserUrl);
      }
    });

    // Listen for Audio Streams (TTS Relay)
    newSocket.on("server:stream", async (msg: any) => {
      if (msg.type === "tts_audio" && msg.data) {
        try {
          // Decode output audio
          const audio = new Audio(msg.data);
          audio.volume = 1.0;
          await audio.play();
        } catch (e) {
          console.error("[TV] Audio Playback Error:", e);
        }
      }
    });

    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  // --- RENDERERS ---

  if (mode === "CINEMA") {
    return (
      <div className="h-screen w-screen bg-black overflow-hidden relative">
        <CinemaPlayer /> {/* Removed themeColor */}
        <div className="absolute top-8 right-8 flex items-center gap-2 opacity-50">
          <Wifi
            size={24}
            className={
              status === "CONNECTED" ? "text-green-500" : "text-red-500"
            }
          />
          <span className="text-white font-mono tracking-widest">
            TV MODE // LINKED
          </span>
        </div>
      </div>
    );
  }

  if (mode === "BROWSER" && browserUrl) {
    return (
      <div className="h-screen w-screen bg-black overflow-hidden relative">
        <GhostBrowser
          url={browserUrl}
          onClose={() => {}}
          sessionId="tv-session"
          mode="EMBEDDED"
        />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
      </div>
    );
  }

  if (mode === "DATA_ROOM") {
    return <TVDataRoom themeHex={theme.hex} vitals={vitals} />;
  }

  // DEFAULT DASHBOARD (IDLE)
  return (
    <TVDashboard
      themeHex={theme.hex}
      status={status}
      activeTask={activeTask}
      vitals={vitals}
    />
  );
};

export default TVReceiver;
