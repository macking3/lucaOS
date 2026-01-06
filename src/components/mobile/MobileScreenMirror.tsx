import React, { useState } from "react";
import { Cast, Eye, EyeOff, Crosshair } from "lucide-react";
import { SmartDevice } from "../../types";
import UiTreeOverlay, { UiNode } from "./UiTreeOverlay";

interface MobileScreenMirrorProps {
  device: SmartDevice;
  isAdbConnected: boolean;
  screenImage: string | null;
  uiTree?: UiNode | null;
  onSendKey: (keyCode: number) => void;
  onSendTap: (x: number, y: number) => void;
  onStartNativeStream: () => void;
}

const MobileScreenMirror: React.FC<MobileScreenMirrorProps> = ({
  isAdbConnected,
  screenImage,
  uiTree,
  onSendKey,
  onSendTap,
  onStartNativeStream,
}) => {
  const [visionMode, setVisionMode] = useState(true);

  // Handle Tap on Image
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdbConnected) return;

    // Calculate relative coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    // Assuming 1080x2340 standard resolution for modern Android
    const realX = Math.round(xRatio * 1080);
    const realY = Math.round(yRatio * 2340);

    onSendTap(realX, realY);
  };

  const handleElementClick = (node: UiNode) => {
    // Logic to click the center of the node bounds
    const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      const x1 = parseInt(match[1]);
      const y1 = parseInt(match[2]);
      const x2 = parseInt(match[3]);
      const y2 = parseInt(match[4]);
      onSendTap(Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2));
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {!isAdbConnected ? (
        <div className="text-center text-slate-500">
          <Cast size={48} className="mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-white mb-2">
            ADB LINK OFFLINE
          </h3>
          <p className="text-xs font-mono max-w-md mx-auto">
            To enable remote control, connect your device via USB and enable USB
            Debugging in Developer Options. Ensure ADB is running on the host.
          </p>
        </div>
      ) : (
        <div className="relative flex-1 w-full flex justify-center items-center gap-8">
          {/* Phone Frame */}
          <div
            className="relative h-full aspect-[9/19.5] bg-black border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl group/frame"
            style={{
              boxShadow:
                "0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(6,182,212,0.1)",
            }}
          >
            {/* Screen Content Container */}
            <div
              className="relative w-full h-full cursor-crosshair overflow-hidden"
              onClick={handleImageClick}
            >
              {screenImage ? (
                <img
                  src={`data:image/png;base64,${screenImage}`}
                  alt="Device Screen"
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 animate-pulse gap-2 bg-slate-950">
                  <div className="w-8 h-8 border-2 border-slate-800 border-t-rq-blue rounded-full animate-spin"></div>
                  <span className="text-[10px] font-mono tracking-widest mt-2">
                    LINKING CORE...
                  </span>
                </div>
              )}

              {/* UI Tree Overlay */}
              {visionMode && uiTree && (
                <UiTreeOverlay
                  tree={uiTree}
                  onElementClick={handleElementClick}
                />
              )}

              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%]"></div>
            </div>

            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-b-xl z-50"></div>
          </div>

          {/* Controls Sidebar */}
          <div className="flex flex-col gap-3 w-48">
            {/* VISION MODES */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-sm backdrop-blur-sm">
              <div className="text-[10px] font-mono text-rq-blue mb-2 font-bold uppercase tracking-widest">
                Vision Systems
              </div>
              <button
                onClick={() => setVisionMode(!visionMode)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-bold transition-all ${
                  visionMode
                    ? "bg-rq-blue/20 text-rq-blue border border-rq-blue/30"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  {visionMode ? <Eye size={14} /> : <EyeOff size={14} />}
                  INSPECTOR
                </span>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    visionMode
                      ? "bg-rq-blue animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                      : "bg-slate-600"
                  }`}
                ></div>
              </button>
            </div>

            {/* NAVIGATION */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-sm backdrop-blur-sm flex flex-col gap-2">
              <div className="text-[10px] font-mono text-slate-500 mb-1 font-bold uppercase tracking-widest">
                Hardware Navigation
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSendKey(3)}
                  className="px-3 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-[10px] font-bold rounded-sm border border-slate-700 transition-colors"
                >
                  HOME
                </button>
                <button
                  onClick={() => onSendKey(4)}
                  className="px-3 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-[10px] font-bold rounded-sm border border-slate-700 transition-colors"
                >
                  BACK
                </button>
                <button
                  onClick={() => onSendKey(187)}
                  className="px-3 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-[10px] font-bold rounded-sm border border-slate-700 transition-colors"
                >
                  RECENTS
                </button>
                <button
                  onClick={() => onSendKey(26)}
                  className="px-3 py-2 bg-red-900/20 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-bold rounded-sm border border-red-900/30 transition-colors"
                >
                  POWER
                </button>
              </div>
            </div>

            <button
              onClick={onStartNativeStream}
              className="group relative flex items-center justify-center gap-2 px-4 py-3 bg-purple-900/20 hover:bg-purple-600 text-purple-400 hover:text-white text-[10px] font-bold rounded-sm border border-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all overflow-hidden"
            >
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Cast size={14} />
              <span className="tracking-widest">CROSS-LINK MIRROR</span>
            </button>

            <div className="mt-2 p-2 rounded bg-cyan-950/20 border border-cyan-900/20 flex gap-2">
              <Crosshair size={12} className="text-rq-blue shrink-0 mt-0.5" />
              <div className="text-[9px] font-mono text-slate-400 leading-tight">
                Precision Mode Active. Tap screen to send raw events. Use
                Inspector to target meta-elements.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileScreenMirror;
