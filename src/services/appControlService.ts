/**
 * App Control Service
 * Handles opening external apps on mobile devices (iOS & Android)
 */

import { AppLauncher } from "@capacitor/app-launcher";
import { Capacitor } from "@capacitor/core";

export interface AppLaunchResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Common app name to package ID / URL scheme mapping
 */
const APP_MAPPINGS = {
  // Social Media
  instagram: {
    android: "com.instagram.android",
    ios: "instagram://",
  },
  facebook: {
    android: "com.facebook.katana",
    ios: "fb://",
  },
  twitter: {
    android: "com.twitter.android",
    ios: "twitter://",
  },
  tiktok: {
    android: "com.zhiliaoapp.musically",
    ios: "snssdk1128://",
  },
  snapchat: {
    android: "com.snapchat.android",
    ios: "snapchat://",
  },
  linkedin: {
    android: "com.linkedin.android",
    ios: "linkedin://",
  },

  // Messaging
  whatsapp: {
    android: "com.whatsapp",
    ios: "whatsapp://",
  },
  telegram: {
    android: "org.telegram.messenger",
    ios: "telegram://",
  },
  messenger: {
    android: "com.facebook.orca",
    ios: "fb-messenger://",
  },
  signal: {
    android: "org.thoughtcrime.securesms",
    ios: "signal://",
  },

  // Media & Entertainment
  spotify: {
    android: "com.spotify.music",
    ios: "spotify://",
  },
  youtube: {
    android: "com.google.android.youtube",
    ios: "youtube://",
  },
  netflix: {
    android: "com.netflix.mediaclient",
    ios: "netflix://",
  },
  twitch: {
    android: "tv.twitch.android.app",
    ios: "twitch://",
  },

  // Productivity
  gmail: {
    android: "com.google.android.gm",
    ios: "googlegmail://",
  },
  calendar: {
    android: "com.google.android.calendar",
    ios: "calshow://",
  },
  notes: {
    android: "com.google.android.keep",
    ios: "mobilenotes://",
  },
  maps: {
    android: "com.google.android.apps.maps",
    ios: "maps://",
  },
  chrome: {
    android: "com.android.chrome",
    ios: "googlechrome://",
  },
  drive: {
    android: "com.google.android.apps.docs",
    ios: "googledrive://",
  },

  // System Apps
  settings: {
    android: "com.android.settings",
    ios: "app-settings://",
  },
  camera: {
    android: "com.android.camera2",
    ios: "camera://",
  },
  phone: {
    android: "com.android.dialer",
    ios: "tel://",
  },
  messages: {
    android: "com.android.mms",
    ios: "sms://",
  },

  // Other
  uber: {
    android: "com.ubercab",
    ios: "uber://",
  },
  amazon: {
    android: "com.amazon.mShop.android.shopping",
    ios: "amazon://",
  },
  reddit: {
    android: "com.reddit.frontpage",
    ios: "reddit://",
  },
};

class AppControlService {
  /**
   * Check if running on mobile (Capacitor)
   */
  private isMobile(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get platform identifier
   */
  private getPlatform(): "android" | "ios" | null {
    const platform = Capacitor.getPlatform();
    if (platform === "android") return "android";
    if (platform === "ios") return "ios";
    return null;
  }

  /**
   * Normalize app name (lowercase, remove spaces/hyphens)
   */
  private normalizeAppName(appName: string): string {
    return appName.toLowerCase().replace(/[-\s]/g, "");
  }

  /**
   * Get app identifier (package name or URL scheme)
   */
  private getAppIdentifier(appName: string): string | null {
    const normalized = this.normalizeAppName(appName);
    const platform = this.getPlatform();

    if (!platform) return null;

    const mapping = APP_MAPPINGS[normalized as keyof typeof APP_MAPPINGS];
    if (!mapping) return null;

    return mapping[platform];
  }

  /**
   * Check if an app can be opened
   */
  async canOpenApp(appName: string): Promise<boolean> {
    if (!this.isMobile()) {
      console.warn("[AppControl] Not running on mobile platform");
      return false;
    }

    const identifier = this.getAppIdentifier(appName);
    if (!identifier) {
      console.warn(`[AppControl] Unknown app: ${appName}`);
      return false;
    }

    try {
      const result = await AppLauncher.canOpenUrl({ url: identifier });
      return result.value;
    } catch (error) {
      console.error("[AppControl] Error checking app availability:", error);
      return false;
    }
  }

  /**
   * Open an app by name
   */
  async openApp(appName: string): Promise<AppLaunchResult> {
    if (!this.isMobile()) {
      return {
        success: false,
        error: "App launching only works on mobile devices",
      };
    }

    const identifier = this.getAppIdentifier(appName);

    if (!identifier) {
      return {
        success: false,
        error: `Unknown app: "${appName}". Supported apps: ${Object.keys(
          APP_MAPPINGS
        ).join(", ")}`,
      };
    }

    try {
      // Check if app is installed first
      const canOpen = await this.canOpenApp(appName);

      if (!canOpen) {
        return {
          success: false,
          error: `${appName} is not installed on this device`,
        };
      }

      // Open the app
      await AppLauncher.openUrl({ url: identifier });

      console.log(`[AppControl] Successfully opened: ${appName}`);

      return {
        success: true,
        message: `Opened ${appName}`,
      };
    } catch (error: any) {
      console.error("[AppControl] Error opening app:", error);
      return {
        success: false,
        error: error.message || "Failed to open app",
      };
    }
  }

  /**
   * Get list of supported apps
   */
  getSupportedApps(): string[] {
    return Object.keys(APP_MAPPINGS);
  }

  /**
   * Search for apps matching query
   */
  searchApps(query: string): string[] {
    const normalized = query.toLowerCase();
    return this.getSupportedApps().filter((app) => app.includes(normalized));
  }
}

// Export singleton instance
export const appControlService = new AppControlService();
