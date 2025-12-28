/**
 * Voice Permission Utilities
 * Handles microphone permission requests for voice onboarding
 */

/**
 * Request microphone permission
 */
export async function requestVoicePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // Stop immediately, we just needed permission
    stream.getTracks().forEach((track) => track.stop());

    console.log("[Voice] Microphone permission granted");
    return true;
  } catch (error) {
    console.error("[Voice] Permission denied:", error);
    return false;
  }
}

/**
 * Check if voice permission is already granted
 */
export async function checkVoicePermission(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn("[Voice] MediaDevices API not available");
    return false;
  }

  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state === "granted";
  } catch {
    // Fallback: try to request access
    return await requestVoicePermission();
  }
}

/**
 * Check if voice is supported on this device
 */
export function isVoiceSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
