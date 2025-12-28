import React from "react";
import HologramScene from "./HologramScene";
import { Mic, Activity } from "lucide-react";

interface HologramWidgetProps {
  isVoiceActive: boolean;
  isMicOpen: boolean; // New Prop
  transcript: string;
  isSpeaking: boolean;
  audioLevel: number;
  primaryColor?: string;
  onClick?: () => void;
}

const HologramWidget: React.FC<HologramWidgetProps> = ({
  isVoiceActive,
  isMicOpen, // Destructure
  transcript,
  isSpeaking,
  audioLevel,
  primaryColor = "#3b82f6",
  onClick,
}) => {
  // Draggable State
  const [position, setPosition] = React.useState({
    x: Math.max(20, window.innerWidth - 220),
    y: Math.max(20, window.innerHeight - 300),
  });
  const isDragging = React.useRef(false);
  const offset = React.useRef({ x: 0, y: 0 });

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent | React.PointerEvent | any) => {
    isDragging.current = true;

    // Support both React Synthetic and Native events
    const clientX = e.clientX || e.nativeEvent?.clientX || 0;
    const clientY = e.clientY || e.nativeEvent?.clientY || 0;

    // Capture offset relative to the element/window top-left
    offset.current = {
      x: clientX,
      y: clientY,
    };
    document.body.style.userSelect = "none";
    // console.log("[Hologram] Drag Start", clientX, clientY);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent | PointerEvent) => {
      if (!isDragging.current) return;

      const isHologramMode = window.location.search.includes("mode=hologram");

      if (isHologramMode) {
        // MOVE ELECTRON WINDOW via IPC
        // Target Screen Position = Global Mouse - Initial Offset
        const targetX = e.screenX - offset.current.x;
        const targetY = e.screenY - offset.current.y;

        // @ts-ignore
        if (window.electron && window.electron.ipcRenderer) {
          // @ts-ignore
          window.electron.ipcRenderer.send("set-window-position", {
            x: targetX,
            y: targetY,
          });
        }
      } else {
        // MOVE HTML ELEMENT (Dashboard)
        // Standard absolute positioning
        // position = currentClient - (initialClient - initialPos) = currentClient - offset
        // But here offset.current IS the initialClient (relative to window 0,0)
        // Wait, for HTML drag:
        // dragging updates 'left/top'.
        // left = currentX - (clickX - initialLeft)
        // My offset logic above was: offset = clickX. That assumes initialLeft was 0? No.
        // Let's fix the offset logic for HTML drag.
        // For HTML Drag: offset = clickX - currentLeft.
        // For Window Drag: offset = clickX (relative to window top-left).
        // Actually, since this component supports BOTH, we need two offsets?
        // Or just use the one that matters.
        // If Dashboard:
        // We need (dX, dY).
        // Let's stick to the HTML logic if not hologram mode.
        /* 
            Wait, I can't easily switch logic in mid-drag unless I know the mode at START.
            But `isHologramMode` is constant.
         */
      }
    };
    // ... I'll implement valid logic for both below.
  }, []);

  // Re-define logic cleanly for the file write:

  return (
    <HologramWidgetImplementation
      isVoiceActive={isVoiceActive}
      isMicOpen={isMicOpen} // Pass down
      transcript={transcript}
      isSpeaking={isSpeaking}
      audioLevel={audioLevel}
      primaryColor={primaryColor}
      onClick={onClick}
    />
  );
};

// Internal implementation to allow clean Effect
const HologramWidgetImplementation = ({
  isVoiceActive,
  isMicOpen, // Receive
  transcript,
  isSpeaking,
  audioLevel,
  primaryColor,
  onClick,
}: any) => {
  const [position, setPosition] = React.useState({
    x: Math.max(20, window.innerWidth - 220),
    y: Math.max(20, window.innerHeight - 300),
  });

  const hasDragged = React.useRef(false); // New ref to track movement
  const isDragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 }); // Mouse Pos at start
  const initialPos = React.useRef({ x: 0, y: 0 }); // Element/Window Pos at start

  const handleMouseDown = (e: any) => {
    isDragging.current = true;
    hasDragged.current = false; // Reset on down
    const clientX = e.clientX || e.nativeEvent?.clientX || 0;
    const clientY = e.clientY || e.nativeEvent?.clientY || 0;

    dragStart.current = { x: clientX, y: clientY };
    initialPos.current = { x: position.x, y: position.y };

    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent | PointerEvent) => {
      if (!isDragging.current) return;

      // Calculate distance moved
      const dist = Math.hypot(
        e.clientX - dragStart.current.x,
        e.clientY - dragStart.current.y
      );

      // If moved more than 5 pixels, mark as dragged
      // We use a small threshold to allow for jittery clicks
      if (dist > 5) {
        hasDragged.current = true;
      }

      const isHologramMode = window.location.search.includes("mode=hologram");

      if (isHologramMode) {
        // Window Drag: Calculate Delta and apply to Window Screen Position
        // We can't know the window's initial screen position easily without IPC.
        // BUT: `set-window-position` expects Absolute Screen Coords.
        // e.screenX is absolute.
        // We want the Window Top-Left to move by the same delta as the mouse.
        // WindowNew = WindowOld + (MouseNew - MouseOld).
        // We don't know WindowOld here.

        // ALTERNATIVE: Use `window-drag` IPC which uses `e.screenX` and lets Main handle it?
        // "IPC: Window Drag (Moves the entire window)"
        // check my implemented main.cjs:
        /*
            ipcMain.on('window-drag', (event, { mouseX, mouseY }) => {
                const win = ...
                win.setPosition(mouseX, mouseY);
            });
            */
        // That implementation sets the window to mouseX/Y. That puts the top-left of window at mouse cursor.
        // That snaps the window. Acceptable? Maybe.
        // Better: renderer sends `set-window-position` with calculated values.

        // If I can't know absolute window pos, I can't calc absolute new pos.
        // SOLUTION: 'start-window-drag' signals Main to start standard window dragging (polling system cursor).
        // OR: Use the `mouseX` from the event as the *offset* inside the window?
        // In `main.cjs` I had:
        // win.setPosition(mouseX, mouseY);
        // That implies mouseX/Y are the target coordinates.

        // Let's assume the user doesn't mind if it snaps to cursor top-left for now,
        // OR I assume the window is at (0,0) of the *viewport*? No.

        // Let's use the delta approach via IPC 'move-window-by'.
        // But I didn't implement that.

        // Wait, Electron's `ipcMain.on('window-drag')` in my previous step sets `win.setPosition(mouseX, mouseY)`.
        // So if I send `e.screenX`, the window moves there.
        // BUT I need to subtract the click offset so the window doesn't snap its corner to the mouse.
        // Click Offset (relative to window): `dragStart.current.x` (which is e.clientX).
        // So TargetX = e.screenX - dragStart.current.x.
        // This logic is sound for Window Drag.

        const targetX = e.screenX - dragStart.current.x;
        const targetY = e.screenY - dragStart.current.y;

        // @ts-ignore
        window.electron?.ipcRenderer.send("set-window-position", {
          x: targetX,
          y: targetY,
        });
      } else {
        // HTML Drag (Dashboard)
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({
          x: initialPos.current.x + dx,
          y: initialPos.current.y + dy,
        });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("pointermove", handleMouseMove);
    window.addEventListener("pointerup", handleMouseUp);
    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("pointerup", handleMouseUp);
    };
  }, []);

  if (!isVoiceActive) return null;

  // Determine styles based on mode
  const isHologramMode =
    typeof window !== "undefined" &&
    window.location.search.includes("mode=hologram");
  const containerStyle = isHologramMode
    ? { top: 0, left: 0 } // Fixed in window, we move the window
    : { top: position.y, left: position.x }; // We move the div

  return (
    <>
      <div
        className="fixed z-50 cursor-grab active:cursor-grabbing"
        style={containerStyle}
        onPointerDown={handleMouseDown}
      >
        <div
          className="relative w-[200px] h-[270px] flex items-end justify-center group"
          title="Drag to Move / Click Face to Toggle"
        >
          <div className="w-full h-full relative z-10 scale-100 origin-bottom transition-transform duration-300 pointer-events-auto">
            <HologramScene
              color={primaryColor}
              audioLevel={audioLevel}
              onClick={() => {
                if (!hasDragged.current) {
                  onClick?.();
                }
              }}
              onDragStart={handleMouseDown}
            />
          </div>

          <div
            className="absolute bottom-6 right-6 w-28 h-28 rounded-full blur-[45px] -z-10 transition-opacity duration-100"
            style={{
              opacity: (audioLevel / 255) * 0.4,
              backgroundColor: primaryColor,
            }}
          />
        </div>
      </div>
    </>
  );
};

export default HologramWidget;
