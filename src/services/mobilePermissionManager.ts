/**
 * Mobile Permission Manager
 * Handles all permission requests for Capacitor mobile app
 */

export type PermissionType =
  | "camera"
  | "microphone"
  | "geolocation"
  | "notifications";

export interface PermissionResult {
  granted: boolean;
  error?: string;
}

class MobilePermissionManager {
  private permissionCache: Map<PermissionType, boolean> = new Map();

  /**
   * Check if running on mobile (Capacitor)
   */
  private isMobile(): boolean {
    return !!(window as any).Capacitor;
  }

  /**
   * Request microphone permission
   */
  async requestMicrophone(): Promise<PermissionResult> {
    try {
      // Check cache first
      if (this.permissionCache.has("microphone")) {
        return { granted: this.permissionCache.get("microphone")! };
      }

      // Request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Stop the stream immediately (we just needed permission)
      stream.getTracks().forEach((track) => track.stop());

      this.permissionCache.set("microphone", true);
      return { granted: true };
    } catch (error) {
      console.error("Microphone permission denied:", error);
      this.permissionCache.set("microphone", false);
      return {
        granted: false,
        error:
          "Microphone access denied. Please enable it in your device settings.",
      };
    }
  }

  /**
   * Request camera permission
   */
  async requestCamera(): Promise<PermissionResult> {
    try {
      // Check cache first
      if (this.permissionCache.has("camera")) {
        return { granted: this.permissionCache.get("camera")! };
      }

      // Request permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Stop the stream immediately
      stream.getTracks().forEach((track) => track.stop());

      this.permissionCache.set("camera", true);
      return { granted: true };
    } catch (error) {
      console.error("Camera permission denied:", error);
      this.permissionCache.set("camera", false);
      return {
        granted: false,
        error:
          "Camera access denied. Please enable it in your device settings.",
      };
    }
  }

  /**
   * Request camera AND microphone (for video recording)
   */
  async requestCameraAndMicrophone(): Promise<PermissionResult> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stream.getTracks().forEach((track) => track.stop());

      this.permissionCache.set("camera", true);
      this.permissionCache.set("microphone", true);
      return { granted: true };
    } catch (error) {
      console.error("Camera/Microphone permission denied:", error);
      return {
        granted: false,
        error:
          "Camera and microphone access denied. Please enable them in your device settings.",
      };
    }
  }

  /**
   * Request geolocation permission
   */
  async requestGeolocation(): Promise<PermissionResult> {
    try {
      // Check cache first
      if (this.permissionCache.has("geolocation")) {
        return { granted: this.permissionCache.get("geolocation")! };
      }

      // Request permission
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      this.permissionCache.set("geolocation", true);
      return { granted: true };
    } catch (error) {
      console.error("Geolocation permission denied:", error);
      this.permissionCache.set("geolocation", false);
      return {
        granted: false,
        error:
          "Location access denied. Please enable it in your device settings.",
      };
    }
  }

  /**
   * Request notification permission
   */
  async requestNotifications(): Promise<PermissionResult> {
    try {
      // Check cache first
      if (this.permissionCache.has("notifications")) {
        return { granted: this.permissionCache.get("notifications")! };
      }

      if (!("Notification" in window)) {
        return { granted: false, error: "Notifications not supported" };
      }

      const permission = await Notification.requestPermission();
      const granted = permission === "granted";

      this.permissionCache.set("notifications", granted);
      return {
        granted,
        error: granted ? undefined : "Notification permission denied.",
      };
    } catch (error) {
      console.error("Notification permission denied:", error);
      this.permissionCache.set("notifications", false);
      return {
        granted: false,
        error: "Notification access denied.",
      };
    }
  }

  /**
   * Check if permission is already granted (from cache)
   */
  hasPermission(type: PermissionType): boolean {
    return this.permissionCache.get(type) === true;
  }

  /**
   * Clear permission cache (force re-check)
   */
  clearCache(type?: PermissionType) {
    if (type) {
      this.permissionCache.delete(type);
    } else {
      this.permissionCache.clear();
    }
  }

  /**
   * Show user-friendly permission denied message
   */
  showPermissionDeniedAlert(type: PermissionType, customMessage?: string) {
    const messages = {
      camera:
        "Camera access is required for this feature. Please enable it in Settings → Luca → Camera.",
      microphone:
        "Microphone access is required for this feature. Please enable it in Settings → Luca → Microphone.",
      geolocation:
        "Location access is required for this feature. Please enable it in Settings → Luca → Location.",
      notifications:
        "Notification permission is required. Please enable it in Settings → Luca → Notifications.",
    };

    alert(customMessage || messages[type]);
  }
}

// Export singleton instance
export const permissionManager = new MobilePermissionManager();
