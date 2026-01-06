/**
 * Chrome Profile Import Prompt
 * Shown when Luca tries to use Ghost Browser but no Chrome profile is imported.
 * Offers user to import Chrome data or continue with clean browser.
 */

import React, { useState } from "react";
import { Chrome, X, RefreshCw, AlertCircle } from "lucide-react";
import { apiUrl } from "../config/api";

interface ChromeProfilePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  onSkip?: () => void;
  theme: { hex: string };
}

const ChromeProfilePrompt: React.FC<ChromeProfilePromptProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  onSkip,
  theme,
}) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chromeRunning, setChromeRunning] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      // Check status first
      const statusRes = await fetch(apiUrl("/api/chrome-profile/status"));
      const status = await statusRes.json();

      if (status.chromeRunning) {
        setChromeRunning(true);
        setError("Please close Chrome before importing.");
        setImporting(false);
        return;
      }

      // Import
      const res = await fetch(apiUrl("/api/chrome-profile/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName: "Default" }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        onImportComplete?.();
        onClose();
      }
    } catch (e: any) {
      setError(e.message);
    }
    setImporting(false);
  };

  const handleSkip = () => {
    onSkip?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${theme.hex}20` }}
            >
              <Chrome className="w-5 h-5" style={{ color: theme.hex }} />
            </div>
            <h3 className="text-lg font-bold text-white">
              Use Your Browser Sessions?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-4">
            Luca can use your Chrome browser's logged-in sessions, bookmarks,
            and saved passwords for a seamless browsing experience.
          </p>

          <div className="bg-white/5 p-3 rounded-lg border border-white/10 mb-4">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-300">What gets imported:</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
              <li>• Cookies & Login Sessions</li>
              <li>• Bookmarks & History</li>
              <li>• Saved Passwords</li>
            </ul>
          </div>

          {chromeRunning && (
            <div className="flex items-center gap-2 text-orange-400 text-xs mb-3 bg-orange-500/10 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>Chrome is running. Please close it first.</span>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 px-4 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Use Clean Browser
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            style={{
              backgroundColor: theme.hex,
              color: "#000",
            }}
          >
            {importing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-4 h-4" />
            )}
            Import Chrome
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChromeProfilePrompt;

// Global event for triggering the prompt from anywhere
export const chromeProfilePromptEvents = {
  listeners: new Set<() => void>(),
  trigger() {
    this.listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
};
