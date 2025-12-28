/**
 * Capability Detection Utilities
 * Provides graceful degradation between standalone and Neural Link modes
 */

/**
 * Check if a specific capability is available
 * Enables graceful fallback for mobile standalone
 */
export function hasCapability(capability: string): boolean {
  switch (capability) {
    case "neuralLink":
      // Check if Neural Link manager is available and connected
      try {
        // Dynamic import check to avoid errors if not bundled
        if (
          typeof window !== "undefined" &&
          (window as any).neuralLinkManager
        ) {
          return (window as any).neuralLinkManager.isConnected();
        }
        return false;
      } catch {
        return false;
      }

    case "getActiveApp":
      // Requires desktop (via Neural Link) or native implementation
      return hasCapability("neuralLink");

    case "phoenix":
      // Phoenix supervisor requires Node.js (desktop only)
      return typeof process !== "undefined" && !!process.versions?.node;

    case "localStorage":
      // Available on all platforms
      try {
        return typeof localStorage !== "undefined";
      } catch {
        return false;
      }

    case "navigator":
      return typeof navigator !== "undefined";

    case "capacitor":
      // Check if running in Capacitor (mobile)
      return typeof window !== "undefined" && !!(window as any).Capacitor;

    default:
      return false;
  }
}

/**
 * Get platform type
 */
export function getPlatform(): "desktop" | "mobile" | "web" {
  if (hasCapability("capacitor")) {
    return "mobile";
  }

  if (hasCapability("phoenix")) {
    return "desktop";
  }

  return "web";
}

/**
 * Check if running standalone (no Neural Link)
 */
export function isStandalone(): boolean {
  return !hasCapability("neuralLink");
}

/**
 * Get capability-based feature flags
 */
export function getFeatureFlags() {
  return {
    hasNeuralLink: hasCapability("neuralLink"),
    hasDesktop: hasCapability("phoenix"),
    isMobile: getPlatform() === "mobile",
    isStandalone: isStandalone(),
    canGetActiveApp: hasCapability("getActiveApp"),
    hasLocalStorage: hasCapability("localStorage"),
  };
}
