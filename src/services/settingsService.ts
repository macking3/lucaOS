import { EventEmitter } from "events";

export interface LucaSettings {
  general: {
    theme: "DEFAULT" | "RUTHLESS" | "ENGINEER" | "ASSISTANT" | "HACKER";
    startOnBoot: boolean;
    minimizeToTray: boolean;
    debugMode: boolean;
    userName: string; // New
  };
  brain: {
    useCustomApiKey: boolean;
    geminiApiKey: string;
    anthropicApiKey: string; // New
    openaiApiKey: string; // New
    xaiApiKey: string; // New
    model: string;
    voiceModel: string;
    memoryModel: string;
    temperature: number;
    autoContextWindow: boolean;
  };
  voice: {
    provider: "native" | "google" | "local-neural" | "gemini-genai";
    googleApiKey: string;
    voiceId: string; // e.g., 'Google US English' or specific ID
    rate: number;
    pitch: number;
    style: string; // Gemini 2.5: "Natural", "Excited", "Somber", etc.
    pacing: "Fast" | "Normal" | "Slow" | "Dramatic"; // Gemini 2.5 Pacing
  };
  iot: {
    haUrl: string;
    haToken: string;
  };
  // Connectors managed via CredentialVault, but UI state (e.g. "show in dashboard") could be here
  connectors: {
    whatsapp: boolean;
    telegram: boolean;
    linkedin: boolean;
    google: boolean;
    youtube: boolean;
    twitter: boolean;
    instagram: boolean;
    discord: boolean;
    signal: boolean;
  };
  telegram: {
    apiId: string;
    apiHash: string;
    phoneNumber: string;
  };
  neuralLink: {
    enabled: boolean;
    connectionMode: "auto" | "local" | "vpn" | "relay";
    relayServerUrl: string;
    vpnServerUrl: string;
  };
  security?: {
    faceData?: string;
    faceEnabled: boolean;
    faceCreated?: Date;
  };
  mcp: {
    servers: Array<{
      id: string;
      name: string;
      type: "stdio" | "sse";
      command?: string;
      args?: string[];
      url?: string;
      env?: Record<string, string>;
      autoConnect: boolean;
    }>;
  };
  mobile: {
    offlineModel: "none" | "gemma-2b";
    offlineModelDownloaded: boolean;
  };
}

const getEnvVar = (key: string) => {
  // Browser (Vite)
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env[key]
  ) {
    return import.meta.env[key];
  }
  // Node.js
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return "";
};

const DEFAULT_SETTINGS: LucaSettings = {
  general: {
    theme: "ASSISTANT",
    startOnBoot: false,
    minimizeToTray: false,
    debugMode: false,
    userName: localStorage.getItem("LUCA_USER_NAME") || "Operator",
  },
  brain: {
    useCustomApiKey: false,
    geminiApiKey:
      localStorage.getItem("GEMINI_API_KEY") ||
      getEnvVar("VITE_GEMINI_API_KEY") ||
      getEnvVar("VITE_API_KEY") ||
      getEnvVar("GEMINI_API_KEY") ||
      "",
    anthropicApiKey:
      getEnvVar("VITE_ANTHROPIC_API_KEY") ||
      getEnvVar("ANTHROPIC_API_KEY") ||
      "",
    openaiApiKey:
      getEnvVar("VITE_OPENAI_API_KEY") || getEnvVar("OPENAI_API_KEY") || "",
    xaiApiKey: getEnvVar("VITE_XAI_API_KEY") || getEnvVar("XAI_API_KEY") || "",
    model: "gemini-3-flash-preview", // or "local-gemma-2b"
    voiceModel: "models/gemini-2.5-flash-native-audio-latest",
    memoryModel: "gemini-3-pro-preview",
    temperature: 0.7,
    autoContextWindow: true,
  },
  voice: {
    provider: "local-neural", // Default to Local Neural
    googleApiKey: getEnvVar("VITE_GOOGLE_CLOUD_KEY") || "",
    voiceId: "en_US-amy-medium",
    rate: 1.0,
    pitch: 1.0,
    style:
      "Feminine, sophisticated, calm, highly intelligent, slightly synthetic but warm.",
    pacing: "Normal",
  },
  iot: {
    haUrl: "",
    haToken: "",
  },
  mobile: {
    offlineModel: "none",
    offlineModelDownloaded: false,
  },
  connectors: {
    whatsapp: false,
    telegram: false,
    linkedin: false,
    google: false,
    youtube: false,
    twitter: false,
    instagram: false,
    discord: false,
    signal: false,
  },
  telegram: {
    apiId: "",
    apiHash: "",
    phoneNumber: "",
  },
  neuralLink: {
    enabled: true,
    connectionMode: "auto",
    relayServerUrl: "https://lucaos.onrender.com", // Production relay server
    vpnServerUrl: "",
  },
  mcp: {
    servers: [], // No default MCP servers
  },
};

const STORAGE_KEY = "LUCA_SETTINGS_V1";

class SettingsService extends EventEmitter {
  private settings: LucaSettings;

  constructor() {
    super();
    this.settings = this.loadSettings();
  }

  private loadSettings(): LucaSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to ensure new keys exist
        return this.deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {
      console.warn("[SETTINGS] Failed to load settings, using defaults", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  // Simple deep merge helper
  private deepMerge(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any) {
    return item && typeof item === "object" && !Array.isArray(item);
  }

  public getSettings(): LucaSettings {
    return this.settings;
  }

  public get<K extends keyof LucaSettings>(section: K): LucaSettings[K] {
    return this.settings[section];
  }

  public async saveSettings(newSettings: Partial<LucaSettings>) {
    this.settings = this.deepMerge(this.settings, newSettings);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));

      // REDUNDANT SAVE: Also save to root GEMINI_API_KEY for legacy/default loader compatibility
      if (this.settings.brain.geminiApiKey) {
        localStorage.setItem(
          "GEMINI_API_KEY",
          this.settings.brain.geminiApiKey
        );
      }

      this.emit("settings-changed", this.settings);

      // Persist to backend if needed (optional backup)
      // await window.electron.ipcRenderer.invoke('save-settings', this.settings);
    } catch (e) {
      console.error("[SETTINGS] Failed to save settings", e);
    }
  }

  public resetToDefaults() {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.saveSettings(this.settings);
  }

  // Face data management
  public saveFaceData(base64Image: string) {
    const settings = this.getSettings();
    const security = {
      ...settings.security,
      faceData: base64Image,
      faceEnabled: true,
      faceCreated: new Date(),
    };
    this.saveSettings({ security });
  }

  public getFaceData(): string | null {
    const settings = this.getSettings();
    return settings.security?.faceData || null;
  }

  public deleteFaceData() {
    const settings = this.getSettings();
    if (settings.security) {
      delete settings.security.faceData;
      settings.security.faceEnabled = false;
    }
    this.saveSettings({ security: settings.security });
  }

  // Get all settings (alias for compatibility)
  public getAll(): LucaSettings {
    return this.getSettings();
  }

  // Operator Profile management
  public saveOperatorProfile(profile: any) {
    const settings = this.getSettings();
    const updatedSettings = {
      ...settings,
      operatorProfile: profile,
    };
    this.saveSettings(updatedSettings);

    // Also save separately for quick access
    localStorage.setItem("LUCA_OPERATOR_PROFILE", JSON.stringify(profile));
  }

  public getOperatorProfile(): any | null {
    // Try settings first
    const settings = this.getSettings();
    if ((settings as any).operatorProfile) {
      return (settings as any).operatorProfile;
    }

    // Fallback to separate storage
    const stored = localStorage.getItem("LUCA_OPERATOR_PROFILE");
    return stored ? JSON.parse(stored) : null;
  }

  public updateOperatorProfile(updates: any) {
    const current = this.getOperatorProfile();
    if (!current) return;

    const updated = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date(),
      },
    };

    this.saveOperatorProfile(updated);
  }
}

export const settingsService = new SettingsService();
