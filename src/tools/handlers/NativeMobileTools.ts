import { MobileToolResult } from "./MobileTools";

/**
 * Native Mobile Tools
 *
 * Handlers for tools that require mobile device hardware access.
 * These work via Web APIs (if in mobile browser) or Capacitor plugins (if in native app).
 */

export async function vibrate(args: {
  pattern?: number[];
}): Promise<MobileToolResult> {
  try {
    const pattern = args.pattern || [100, 50, 100];
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
      return { success: true, message: "Haptic feedback triggered." };
    }
    return {
      success: false,
      error: "Haptics not supported on this device/browser.",
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getLocation(): Promise<MobileToolResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ success: false, error: "Geolocation not supported." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          message: "Location retrieved.",
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          },
        });
      },
      (error) => {
        resolve({
          success: false,
          error: `Location access denied: ${error.message}`,
        });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

export async function sendSMS(args: {
  phoneNumber: string;
  message: string;
}): Promise<MobileToolResult> {
  try {
    // Note: In browser, we can only trigger 'sms:' URI
    // In native app, we use Capacitor SMS plugin
    const url = `sms:${args.phoneNumber}?body=${encodeURIComponent(
      args.message
    )}`;
    window.open(url, "_blank");
    return { success: true, message: "SMS composer opened." };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function makeCall(args: {
  phoneNumber: string;
}): Promise<MobileToolResult> {
  try {
    const url = `tel:${args.phoneNumber}`;
    window.open(url, "_blank");
    return { success: true, message: "Dialer opened." };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export const nativeMobileToolHandlers = {
  vibrate,
  getLocation,
  sendSMS,
  makeCall,
};
