/**
 * Device Performance Detection Utility
 * Determines if device can handle 3D WebGL rendering
 */

export interface DeviceCapabilities {
  hasWebGL: boolean;
  isMobile: boolean;
  isLowPerformance: boolean;
  gpuTier: "high" | "medium" | "low";
}

/**
 * Detect device performance capabilities
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Check WebGL support
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  const hasWebGL = !!gl;

  // Get GPU info if available
  let gpuTier: "high" | "medium" | "low" = "medium";

  if (hasWebGL && gl) {
    const webgl = gl as WebGLRenderingContext;
    const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

      // Check for known low-performance GPUs
      const lowEndGPUs = [
        "mali-400",
        "mali-450",
        "mali-t720",
        "mali-t760",
        "adreno 304",
        "adreno 305",
        "adreno 306",
        "adreno 308",
        "powervr sgx",
        "vivante gc",
      ];

      const highEndGPUs = [
        "apple",
        "nvidia",
        "radeon",
        "geforce",
        "adreno 6",
        "adreno 7",
        "mali-g",
      ];

      const rendererLower = renderer.toLowerCase();

      if (lowEndGPUs.some((gpu) => rendererLower.includes(gpu))) {
        gpuTier = "low";
      } else if (highEndGPUs.some((gpu) => rendererLower.includes(gpu))) {
        gpuTier = "high";
      }
    }
  }

  // Check device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) {
    gpuTier = "low";
  }

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;
  if (cores < 4) {
    gpuTier = gpuTier === "high" ? "medium" : "low";
  }

  // Determine if low performance
  const isLowPerformance =
    !hasWebGL || gpuTier === "low" || (isMobile && gpuTier === "medium");

  return {
    hasWebGL,
    isMobile,
    isLowPerformance,
    gpuTier,
  };
}

/**
 * Simple hook for device capabilities
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  // Memoize to avoid re-detection
  const capabilities = React.useMemo(() => {
    return detectDeviceCapabilities();
  }, []);

  return capabilities;
}

// For React import
import React from "react";
