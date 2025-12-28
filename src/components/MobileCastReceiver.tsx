import React, { useState, useEffect, useRef } from "react";
import { Activity, Cast, Wifi, Zap, Eye, Monitor } from "lucide-react";
import io, { Socket } from "socket.io-client";
import { WS_PORT } from "../config/api";

// Simple receiver view for the phone
const MobileCastReceiver = () => {
  const [status, setStatus] = useState("CONNECTING");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTask, setActiveTask] = useState("System Idle");
  const [vitals, setVitals] = useState({ cpu: 0, mem: 0 });
  const [theme, setTheme] = useState({
    hex: "#a855f7", // Default Purple
    primary: "text-purple-500",
  });

  useEffect(() => {
    // Connect to Neural Link Server
    // Assuming the phone is on same network, we use window.location.hostname
    const wsUrl = `http://${window.location.hostname}:${WS_PORT}`;
    const newSocket = io(wsUrl, {
      path: "/mobile/socket.io",
      query: { clientType: "mobile" },
    });

    newSocket.on("connect", () => {
      setStatus("CONNECTED");
      newSocket.emit("register", {
        name: "Mobile Commander",
        capabilities: ["remote_control", "visual_display"],
      });
    });

    newSocket.on("disconnect", () => setStatus("DISCONNECTED"));

    // Listen for updates from desktop
    newSocket.on("client:message", (msg: any) => {
      if (msg.type === "vitals_update") {
        setVitals(msg.data);
      } else if (msg.type === "task_update") {
        setActiveTask(msg.data.taskName);
      } else if (msg.type === "theme_update") {
        // Apply new theme
        setTheme(msg.theme);
      }
    });

    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  const sendCommand = (cmd: string, payload: any = {}) => {
    if (socket && status === "CONNECTED") {
      socket.emit("client:message", {
        type: "command",
        target: "desktop",
        command: cmd,
        payload,
      });
      // Haptic feedback simulation
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  // Gestures
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const endY = e.changedTouches[0].clientY;
    const diffY = touchStart.current.y - endY; // Positive if swipe UP

    if (diffY > 100) {
      // Swipe Up Detected
      sendCommand("trigger_action", { action: "mobile_throw" });
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
    touchStart.current = null;
  };

  return (
    <div
      className="h-screen w-screen bg-black font-mono flex flex-col p-6 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      {/* Header */}
      <div
        className="flex items-center justify-between mb-8 z-10 border-b pb-4"
        style={{ borderColor: `${theme.hex}50` }} // 30% opacity
      >
        <div className="flex items-center gap-2">
          <Wifi
            size={16}
            style={{ color: status === "CONNECTED" ? theme.hex : "#ef4444" }}
            className="animate-pulse"
          />
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: theme.hex }}
          >
            {status}
          </span>
        </div>
        <div className="text-xs text-slate-600 font-semibold">
          SESSION: {socket?.id?.substring(0, 4) || "XXXX"}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center mb-8 z-10">
        <div className="mb-6 relative group">
          <div
            className="absolute inset-0 blur-3xl opacity-20 animate-pulse"
            style={{ backgroundColor: theme.hex }}
          />
          <div
            className="relative border-2 p-6 rounded-full bg-black/50 backdrop-blur-sm"
            style={{ borderColor: `${theme.hex}50` }}
          >
            <Cast size={48} style={{ color: theme.hex }} />
          </div>
        </div>
        <h1
          className="text-2xl font-black tracking-[0.2em] mb-2 text-transparent bg-clip-text"
          style={{
            backgroundImage: `linear-gradient(to right, white, ${theme.hex})`,
          }}
        >
          LUCA OS
        </h1>
        <p
          className="text-[10px] tracking-[0.3em] opacity-70"
          style={{ color: theme.hex }}
        >
          NEURAL BRIDGE ACTIVE
        </p>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 z-10">
        <button
          onClick={() => sendCommand("switch_mode", { mode: "DATA_ROOM" })}
          className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 active:scale-95 flex flex-col items-center gap-2 transition-all"
          style={{
            borderColor: `${theme.hex}40`,
            boxShadow: `0 0 15px ${theme.hex}10`,
          }}
        >
          <Activity size={24} style={{ color: theme.hex }} />
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ color: theme.hex }}
          >
            DATA CORE
          </span>
        </button>

        <button
          onClick={() => sendCommand("switch_mode", { mode: "CINEMA" })}
          className="p-4 bg-red-900/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 active:scale-95 flex flex-col items-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
        >
          <Monitor size={24} className="text-red-400" />
          <span className="text-[10px] font-bold text-red-200 tracking-wider">
            CINEMA PROTOCOL
          </span>
        </button>

        <button
          onClick={() =>
            sendCommand("trigger_action", { action: "scan_system" })
          }
          className="p-4 bg-white/5 border rounded-xl hover:bg-white/10 active:scale-95 flex flex-col items-center gap-2 transition-all shadow-lg"
          style={{
            borderColor: `${theme.hex}50`,
            boxShadow: `0 0 15px ${theme.hex}20`,
          }}
        >
          <Eye size={24} style={{ color: theme.hex }} />
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ color: theme.hex }}
          >
            DEEP SCAN
          </span>
        </button>

        <button
          onClick={() =>
            sendCommand("trigger_action", { action: "emergency_stop" })
          }
          className="p-4 bg-orange-900/10 border border-orange-500/30 rounded-xl hover:bg-orange-500/20 active:scale-95 flex flex-col items-center gap-2 transition-all shadow-[0_0_15px_rgba(249,115,22,0.1)]"
        >
          <Zap size={24} className="text-orange-400" />
          <span className="text-[10px] font-bold text-orange-200 tracking-wider">
            SYSTEM HALT
          </span>
        </button>
      </div>

      {/* Status Footer */}
      <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-lg mt-auto z-10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-slate-500 tracking-widest">
            CURRENT OBJECTIVE
          </span>
          <span
            className="text-[9px] px-2 py-0.5 rounded border"
            style={{
              borderColor: `${theme.hex}40`,
              backgroundColor: `${theme.hex}20`,
              color: theme.hex,
            }}
          >
            EXECUTING
          </span>
        </div>
        <div className="text-xs text-white/80 font-mono truncate">
          {activeTask.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default MobileCastReceiver;
