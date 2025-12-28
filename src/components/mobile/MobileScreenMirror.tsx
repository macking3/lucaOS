import React, { useRef } from "react";
import { Cast, MousePointer2 } from "lucide-react";
import { SmartDevice } from "../../types";

interface MobileScreenMirrorProps {
  device: SmartDevice;
  isAdbConnected: boolean;
  screenImage: string | null;
  onSendKey: (keyCode: number) => void;
  onSendTap: (x: number, y: number) => void;
  onStartNativeStream: () => void;
}

const MobileScreenMirror: React.FC<MobileScreenMirrorProps> = ({
  device,
  isAdbConnected,
  screenImage,
  onSendKey,
  onSendTap,
  onStartNativeStream,
}) => {
  // Handle Tap on Image
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAdbConnected) return;

    // Calculate relative coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    // Assuming 1080x1920 standard resolution for now (simplification)
    const realX = Math.round(xRatio * 1080);
    const realY = Math.round(yRatio * 2340);

    onSendTap(realX, realY);
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
          <div className="relative h-full aspect-[9/19] bg-black border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {screenImage ? (
              <img
                src={`data:image/png;base64,${screenImage}`}
                alt="Device Screen"
                className="w-full h-full object-cover cursor-pointer"
                onClick={handleImageClick}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-700 animate-pulse">
                WAITING FOR STREAM...
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded flex flex-col gap-2">
              <button
                onClick={() => onSendKey(3)}
                className="px-4 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-xs font-bold rounded"
              >
                HOME
              </button>
              <button
                onClick={() => onSendKey(4)}
                className="px-4 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-xs font-bold rounded"
              >
                BACK
              </button>
              <button
                onClick={() => onSendKey(187)}
                className="px-4 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-xs font-bold rounded"
              >
                APPS
              </button>
              <button
                onClick={() => onSendKey(26)}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold rounded mt-2"
              >
                POWER
              </button>
              <button
                onClick={onStartNativeStream}
                className="px-4 py-2 bg-purple-900/50 hover:bg-purple-500 text-purple-400 hover:text-white text-xs font-bold rounded mt-4 border border-purple-900 shadow-[0_0_15px_rgba(168,85,247,0.2)] tracking-widest"
              >
                LAUNCH NATIVE STREAM
              </button>
            </div>
            <div className="text-[10px] font-mono text-slate-500 max-w-[150px]">
              <MousePointer2 size={12} className="inline mr-1" />
              Tap screen to send input events.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileScreenMirror;
