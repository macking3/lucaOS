import { GoogleGenAI } from "@google/genai";
import { settingsService } from "./settingsService";

// --- CONFIGURATION ---
// API Key should be set via environment variable: VITE_API_KEY (for Vite/browser) or API_KEY (for Node.js)
const getApiKey = () => {
  // 1. Check Settings Service
  const brainSettings = settingsService.get("brain");
  const settingsKey = brainSettings?.geminiApiKey;

  if (settingsKey && settingsKey.trim().length > 10) {
    console.log("[genAIClient] Found API Key in Settings Service");
    return settingsKey;
  }

  // 2. Check LocalStorage Backup (Redundant Check)
  // This helps when settings service hasn't fully hydrated or failed
  if (typeof localStorage !== "undefined") {
    const backupKey = localStorage.getItem("GEMINI_API_KEY");
    if (backupKey && backupKey.trim().length > 10) {
      console.log("[genAIClient] Found API Key in Backup LocalStorage");
      return backupKey;
    }
  }

  // 3. Try Vite environment variable (browser context)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const key =
      import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || "";
    if (key && key.trim().length > 10) {
      console.log("[genAIClient] Found API Key in Environment Variables");
      return key;
    }
  }

  // 4. Try ALL possible environment variable sources (comprehensive check)
  let envKey = "";

  // 4a. Vite environment (browser build-time)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    envKey =
      import.meta.env.VITE_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.API_KEY ||
      "";
  }

  // 4b. Node.js process.env (backend/Electron main)
  if (!envKey && typeof process !== "undefined" && process.env) {
    envKey =
      process.env.VITE_API_KEY ||
      process.env.API_KEY ||
      process.env.GEMINI_API_KEY ||
      "";
  }

  // 4c. Window object (runtime injection, sometimes used in Electron)
  if (!envKey && typeof window !== "undefined" && (window as any).__ENV__) {
    envKey =
      (window as any).__ENV__.VITE_API_KEY ||
      (window as any).__ENV__.API_KEY ||
      "";
  }

  if (envKey && envKey.trim().length > 10) {
    console.log("[genAIClient] Found API Key in Environment Variables");
    return envKey;
  }

  // 5. DEMO MODE FALLBACK - If user explicitly skipped API key entry
  if (typeof localStorage !== "undefined") {
    const useDemoKey = localStorage.getItem("LUCA_USES_DEMO_KEY") === "true";
    if (useDemoKey) {
      const DEMO_API_KEY = import.meta.env.VITE_API_KEY || "";
      console.log("[genAIClient] Using Demo Mode API Key (configured via env)");
      return DEMO_API_KEY;
    }
  }

  console.warn(
    "[genAIClient] No valid API Key found in Settings, Backup, or Env."
  );
  return "";
};

export const HARDCODED_API_KEY = getApiKey();

// Start with initial key or dummy if missing (to prevent crash)
let currentGenAI: GoogleGenAI | null = null;
try {
  const key = getApiKey();
  if (key) {
    currentGenAI = new GoogleGenAI({ apiKey: key }); // Ensure correct instantiation
  } else {
    console.warn("[LUCA] No API Key found. AI features will be disabled.");
  }
} catch (e) {
  console.error("[LUCA] Failed to init GoogleGenAI:", e);
}

// Helper that throws if client is missing (handling the null)
export const getGenClient = () => {
  if (!currentGenAI) {
    // Try one last time to get it (e.g. if env loaded late)
    const key = getApiKey();
    if (key) {
      currentGenAI = new GoogleGenAI({ apiKey: key });
      return currentGenAI;
    }
    throw new Error(
      "Google GenAI not initialized. Please set VITE_API_KEY or configure settings."
    );
  }
  return currentGenAI;
};

export const setGenClient = (client: GoogleGenAI) => {
  currentGenAI = client;
};
