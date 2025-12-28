import { useState, useEffect } from "react";

/**
 * Hook to detect if the device is mobile
 * Returns true for mobile devices (phones/tablets)
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check viewport width (mobile breakpoint - only phones, not tablets)
      const isMobileWidth = window.innerWidth < 768; // md breakpoint (tablets 768+ get desktop layout)

      // Check user agent for mobile devices
      const userAgent =
        navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA =
        /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase()
        );

      // Check for touch capability
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Consider mobile if: small screen (< 768px) OR mobile UA (excluding iPad) AND small screen
      setIsMobile(
        isMobileWidth ||
          (isMobileUA && isMobileWidth) ||
          (isTouchDevice && isMobileWidth)
      );
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);

    // Listen for orientation changes
    window.addEventListener("orientationchange", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  return isMobile;
}

/**
 * Hook to detect device capabilities
 * Returns object with device capability flags
 */
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasWebGL: false,
    hasTouch: false,
    prefersReducedMotion: false,
  });

  useEffect(() => {
    const checkCapabilities = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent.toLowerCase();

      const isMobileWidth = width < 768;
      const isTabletWidth = width >= 768 && width < 1024;
      const isDesktopWidth = width >= 1024;

      const isMobileUA =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );
      const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);

      // WebGL support check
      const canvas = document.createElement("canvas");
      const hasWebGL = !!(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );

      // Touch support
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Reduced motion preference
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      setCapabilities({
        isMobile: (isMobileWidth || isMobileUA) && !isTabletUA,
        isTablet: isTabletWidth || isTabletUA,
        isDesktop: isDesktopWidth && !isMobileUA && !isTabletUA,
        hasWebGL,
        hasTouch,
        prefersReducedMotion,
      });
    };

    checkCapabilities();
    window.addEventListener("resize", checkCapabilities);
    return () => window.removeEventListener("resize", checkCapabilities);
  }, []);

  return capabilities;
}
