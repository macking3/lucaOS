import React from "react";
import { PersonaType } from "../../services/lucaService";

interface VoiceStatusOrbProps {
  isVadActive: boolean;
  transcriptSource: "user" | "model";
  amplitude: number;
  persona: PersonaType;
  canvasThemeColor: string;
}

const VoiceStatusOrb: React.FC<VoiceStatusOrbProps> = ({
  isVadActive,
  transcriptSource,
  amplitude,
  // persona is used by parent to determine color passed in here
  canvasThemeColor,
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      {/* Center Status Text - Positioned exactly in the middle */}
      <div className="absolute z-20 flex flex-col items-center pointer-events-none">
        <div
          className={`font-mono text-sm tracking-[0.5em] font-bold mb-96 transition-all duration-300 ${
            isVadActive ? "text-white scale-110" : ""
          }`}
          style={{
            color: isVadActive ? undefined : canvasThemeColor,
          }}
        >
          {isVadActive
            ? "LISTENING"
            : transcriptSource === "model" && amplitude > 0.05
            ? "SPEAKING"
            : "STANDBY"}
        </div>
      </div>
    </div>
  );
};

export default VoiceStatusOrb;
