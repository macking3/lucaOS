import React from "react";
import { AlertTriangle, Check, X, Mic } from "lucide-react";

interface VoiceCommandConfirmationProps {
  originalTranscript: string;
  interpretedCommand: string;
  confidence?: number;
  isRisky: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export const VoiceCommandConfirmation: React.FC<
  VoiceCommandConfirmationProps
> = ({
  originalTranscript,
  interpretedCommand,
  confidence,
  isRisky,
  onConfirm,
  onCancel,
  theme,
}) => {
  return (
    <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="bg-[#0f172a] border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          borderColor: theme ? `${theme.hex}50` : "rgba(6,182,212,0.3)",
          boxShadow: theme
            ? `0 0 50px ${theme.hex}26`
            : "0 0 50px rgba(6,182,212,0.1)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          {isRisky ? (
            <AlertTriangle className="text-red-400 w-6 h-6" />
          ) : (
            <Mic size={24} style={{ color: theme?.hex || "#22d3ee" }} />
          )}
          <h2 className="text-xl font-bold text-white">
            {isRisky ? "Confirm Risky Command" : "Confirm Command"}
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
              What You Said
            </label>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-sm">
              "{originalTranscript}"
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
              LUCA Interpreted
            </label>
            <div
              className="rounded-lg p-3 text-sm font-medium"
              style={{
                backgroundColor: theme
                  ? `${theme.hex}1a`
                  : "rgba(6,182,212,0.1)",
                borderColor: theme ? `${theme.hex}50` : "rgba(6,182,212,0.3)",
                color: theme?.hex || "#22d3ee",
                border: "1px solid",
              }}
            >
              "{interpretedCommand}"
            </div>
          </div>

          {confidence !== undefined && (
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
                Recognition Confidence
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      confidence > 0.8
                        ? "bg-green-500"
                        : confidence > 0.6
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {isRisky && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-400">
                ⚠️ This command may have destructive effects. Please confirm
                this is what you intended.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2`}
            style={
              isRisky
                ? { backgroundColor: "#ef4444", color: "white" }
                : {
                    backgroundColor: theme?.hex || "#06b6d4",
                    color: "black",
                    boxShadow: theme ? `0 0 20px ${theme.hex}66` : "none",
                  }
            }
          >
            <Check size={18} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
