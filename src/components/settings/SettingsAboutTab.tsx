import React from "react";
import pkg from "../../../package.json";

interface SettingsAboutTabProps {
  theme: {
    primary: string;
    hex: string;
  };
}

const SettingsAboutTab: React.FC<SettingsAboutTabProps> = ({ theme }) => {
  return (
    <div className="text-center space-y-6 py-8">
      <div
        className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${theme.hex}, #1e40af)`,
          boxShadow: `0 10px 15px -3px ${theme.hex}33`,
        }}
      >
        <div className="text-3xl font-bold text-white">L</div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-widest">
          LUCA OS
        </h2>
        <div className="text-sm font-mono mt-1" style={{ color: theme.hex }}>
          v{pkg.version} (Stable)
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-400">
        <p>Neural Architecture: Gemini 2.0 Flash</p>
        <p>Visual Cortex: Mediapipe Hand Tracking</p>
        <p>Runtime: Electron {process.versions.electron}</p>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <button
          onClick={() =>
            window.open("https://github.com/macking/luca/releases")
          }
          className="text-xs text-gray-500 hover:text-white underline transition-colors"
        >
          Check for Updates
        </button>
        <button
          onClick={() =>
            // @ts-ignore
            window.luca?.openScreenPermissions &&
            // @ts-ignore
            window.luca.openScreenPermissions()
          }
          className="text-xs text-gray-500 hover:text-white underline transition-colors"
        >
          System Permissions
        </button>
      </div>

      <div className="pt-8 text-[10px] text-gray-600">Designed by Macking</div>
    </div>
  );
};

export default SettingsAboutTab;
