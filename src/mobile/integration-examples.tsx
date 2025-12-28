/**
 * Standalone Mobile Integration Examples
 *
 * Shows how to integrate standalone mobile features with existing app
 * NOTE: This is a reference file. Copy relevant sections to your actual app files.
 */

import React, { useEffect } from "react";
// Note: Uncomment if using React Navigation
// import { useNavigationState } from '@react-navigation/native';
import { MobilePhoenix } from "./MobilePhoenix";
import { lucaService } from "../services/lucaService";
import { memoryService } from "../services/memoryService";
import { hasCapability, getFeatureFlags } from "../utils/capabilities";

/**
 * Example 1: Wrap App with MobilePhoenix
 * Add this to your main App.tsx
 */
export function AppExample() {
  return (
    <MobilePhoenix>
      {/* Replace with your actual app content */}
      <div>Your App Content Here</div>
    </MobilePhoenix>
  );
}

/**
 * Example 2: Pass Navigation State to LucaService
 * Add this to your navigation container or main screen
 * Requires @react-navigation/native
 */
export function NavigationWrapperExample() {
  // Uncomment when using React Navigation:
  /*
  const currentRoute = useNavigationState((state: any) => {
    if (!state) return null;
    return state.routes[state.index].name;
  });
  
  useEffect(() => {
    // Update LucaService with current screen
    lucaService.setNavigationState({ 
      currentScreen: currentRoute 
    });
  }, [currentRoute]);
  */

  return null; // This is just a hook wrapper
}

/**
 * Example 3: Add Global Error Handler
 * Add this to App.tsx useEffect
 */
export function setupGlobalErrorHandling() {
  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[MobilePhoenix] Unhandled rejection:", event.reason);

    // Save to AGENT_STATE
    memoryService.saveMemory(
      `unhandled_rejection_${Date.now()}`,
      JSON.stringify({
        reason: String(event.reason),
        timestamp: Date.now(),
      }),
      "AGENT_STATE"
    );
  });

  // Catch global errors
  window.addEventListener("error", (event) => {
    console.error("[MobilePhoenix] Global error:", event.error);
  });
}

/**
 * Example 4: Check Capabilities Before Using Features
 */
export function CapabilityCheckExample() {
  const flags = getFeatureFlags();

  return (
    <div>
      {flags.hasNeuralLink ? (
        <p>✅ Connected to desktop - enhanced features available</p>
      ) : (
        <p>📱 Standalone mode - core features available</p>
      )}
    </div>
  );
}

/**
 * Example 5: Listen for Neural Link Desktop Phoenix Response
 */
export function setupDesktopPhoenixHandler() {
  if (typeof (globalThis as any).neuralLinkManager !== "undefined") {
    const neuralLinkManager = (globalThis as any).neuralLinkManager;

    neuralLinkManager.on("command:received", async (event: any) => {
      if (event.data.message.payload.command === "phoenix:recovery") {
        const suggestions = event.data.message.payload.args;

        console.log(
          "[MobilePhoenix] Received fix suggestions from desktop:",
          suggestions
        );

        // Example: Show a notification to user (implement your own notification system)
        console.log({
          title: "Desktop Phoenix Analysis Complete",
          message: suggestions.suggestedFix || "Analysis received",
        });
      }
    });
  }
}
