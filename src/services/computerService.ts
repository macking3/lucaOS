// Service for Computer Access via Cortex (Python Backend)
// Handles Keyboard, Mouse (Advanced), and AppleScript

import { CORTEX_URL } from "../config/api";

export const computerService = {
  // 1. Keyboard Input (Typing)
  typeText: async (text: string, interval = 0.05) => {
    try {
      const res = await fetch(`${CORTEX_URL}/keyboard/type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, interval }),
      });
      return res.ok;
    } catch (e) {
      console.error("[COMPUTER] Type Failed:", e);
      return false;
    }
  },

  // 2. Keyboard Press (Hotkeys)
  pressKey: async (keys: string[]) => {
    try {
      const res = await fetch(`${CORTEX_URL}/keyboard/press`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      return res.ok;
    } catch (e) {
      console.error("[COMPUTER] Press Failed:", e);
      return false;
    }
  },

  // 3. AppleScript (Mac Automation)
  runAppleScript: async (script: string) => {
    try {
      const res = await fetch(`${CORTEX_URL}/system/applescript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      if (data.status === "error") throw new Error(data.message);
      return data.output || "Script Executed.";
    } catch (e: any) {
      console.error("[COMPUTER] AppleScript Failed:", e);
      return `Error: ${e.message}`;
    }
  },
};
