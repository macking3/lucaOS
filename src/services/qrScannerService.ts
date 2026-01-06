/**
 * QR Scanner Utility
 *
 * Wraps @capacitor-community/barcode-scanner for mobile QR code scanning.
 * Falls back gracefully on web/desktop.
 */

import { neuralLink } from "./neuralLinkService";

// Types for the barcode scanner
interface ScanResult {
  hasContent: boolean;
  content?: string;
}

interface BarcodeScanner {
  checkPermission: (options: {
    force: boolean;
  }) => Promise<{ granted: boolean }>;
  startScan: () => Promise<ScanResult>;
  stopScan: () => Promise<void>;
  hideBackground: () => Promise<void>;
  showBackground: () => Promise<void>;
}

// Dynamically import to avoid bundling issues on web
let BarcodeScanner: BarcodeScanner | null = null;

const loadScanner = async (): Promise<BarcodeScanner | null> => {
  if (BarcodeScanner) return BarcodeScanner;

  try {
    const module = await import("@capacitor-community/barcode-scanner");
    BarcodeScanner = module.BarcodeScanner as unknown as BarcodeScanner;
    return BarcodeScanner;
  } catch (e) {
    console.warn("[QRScanner] Barcode scanner not available:", e);
    return null;
  }
};

/**
 * Check if we're on a mobile platform that supports scanning
 */
export const isScannerAvailable = (): boolean => {
  // Check for Capacitor native platform
  return (
    typeof window !== "undefined" &&
    (window as any).Capacitor?.isNativePlatform?.() === true
  );
};

/**
 * Request camera permission for scanning
 */
export const requestPermission = async (): Promise<boolean> => {
  const scanner = await loadScanner();
  if (!scanner) return false;

  try {
    const status = await scanner.checkPermission({ force: true });
    return status.granted;
  } catch (e) {
    console.error("[QRScanner] Permission request failed:", e);
    return false;
  }
};

/**
 * Start QR code scanning
 * Returns the scanned content or null if cancelled/failed
 */
export const startScan = async (): Promise<string | null> => {
  const scanner = await loadScanner();
  if (!scanner) {
    console.warn("[QRScanner] Scanner not available");
    return null;
  }

  try {
    // Request permission
    const granted = await requestPermission();
    if (!granted) {
      alert("Camera permission is required to scan QR codes");
      return null;
    }

    // Make background transparent to show camera
    await scanner.hideBackground();
    document.body.classList.add("qr-scanner-active");

    // Start scanning
    const result = await scanner.startScan();

    // Restore UI
    await scanner.showBackground();
    document.body.classList.remove("qr-scanner-active");

    if (result.hasContent && result.content) {
      return result.content;
    }
    return null;
  } catch (e) {
    console.error("[QRScanner] Scan failed:", e);
    // Ensure we restore UI on error
    try {
      const scanner = await loadScanner();
      await scanner?.showBackground();
      document.body.classList.remove("qr-scanner-active");
    } catch {
      // Ignore cleanup errors - already in error state
    }
    return null;
  }
};

/**
 * Stop scanning and restore UI
 */
export const stopScan = async (): Promise<void> => {
  const scanner = await loadScanner();
  if (!scanner) return;

  try {
    await scanner.stopScan();
    await scanner.showBackground();
    document.body.classList.remove("qr-scanner-active");
  } catch (e) {
    console.error("[QRScanner] Stop scan failed:", e);
  }
};

/**
 * Scan QR and automatically connect to Neural Link
 * This is the main entry point for the "Scan QR" button
 */
export const scanAndConnect = async (): Promise<boolean> => {
  if (!isScannerAvailable()) {
    alert("QR scanning is only available on mobile devices");
    return false;
  }

  const content = await startScan();
  if (!content) {
    return false;
  }

  console.log("[QRScanner] Scanned content:", content);

  // Parse the pairing URL
  // Use static parser from service if available, otherwise local fallback
  const parsed = (neuralLink.constructor as any).parsePairingUrl
    ? (neuralLink.constructor as any).parsePairingUrl(content)
    : parsePairingUrl(content);

  if (!parsed || !parsed.token) {
    alert("Invalid QR code. Please scan the QR code from Luca Desktop.");
    return false;
  }

  // Connect to the room
  try {
    await neuralLink.joinWithToken(parsed.token, parsed.local);
    return true;
  } catch (e) {
    console.error("[QRScanner] Failed to connect after scan:", e);
    alert("Failed to connect to Desktop. Please try again.");
    return false;
  }
};

/**
 * Parse a pairing URL from QR code
 */
const parsePairingUrl = (
  url: string
): { relay: string; token: string; local?: string } | null => {
  try {
    // Handle both luca:// and https:// formats
    const urlObj = new URL(url.replace("luca://", "https://placeholder/"));
    const relay = urlObj.searchParams.get("relay");
    const token = urlObj.searchParams.get("token");
    const local = urlObj.searchParams.get("local");

    if (relay && token) {
      return {
        relay: decodeURIComponent(relay),
        token,
        local: local ? decodeURIComponent(local) : undefined,
      };
    }
  } catch (e) {
    console.error("[QRScanner] Failed to parse pairing URL:", e);
  }
  return null;
};

// Export for use in components
export const qrScanner = {
  isAvailable: isScannerAvailable,
  requestPermission,
  startScan,
  stopScan,
  scanAndConnect,
};
