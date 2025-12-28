/**
 * MobilePhoenix - React ErrorBoundary for Mobile Self-Healing
 *
 * Provides crash detection, auto-recovery, and Neural Link relay for mobile standalone mode
 *
 * Features:
 * - Catches React errors before app crashes
 * - Saves crash reports to AGENT_STATE (offline resilience)
 * - Auto-recovery with 3-attempt limit
 * - Neural Link relay to desktop Phoenix (when connected)
 * - Recovery UI with error details
 */

import React from "react";
import { memoryService } from "../services/memoryService";

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  recovering: boolean;
}

export class MobilePhoenix extends React.Component<
  { children: React.ReactNode },
  State
> {
  private static MAX_AUTO_RECOVERIES = 3;
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: this.getStoredErrorCount(),
      recovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[MobilePhoenix] Error caught:", error);

    // 1. Save crash to AGENT_STATE (offline resilience)
    this.saveCrashReport(error, errorInfo);

    // 2. Try Neural Link relay (if connected)
    this.tryNeuralLinkRelay(error, errorInfo);

    // 3. Auto-recovery (if under limit)
    this.attemptAutoRecovery();
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  private async saveCrashReport(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await memoryService.saveMemory(
        `mobile_crash_${Date.now()}`,
        JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          platform: "mobile",
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          errorCount: this.state.errorCount + 1,
        }),
        "AGENT_STATE"
      );

      console.log("[MobilePhoenix] ✅ Crash saved to AGENT_STATE");
    } catch (e) {
      console.error("[MobilePhoenix] ❌ Failed to save crash:", e);
    }
  }

  private async tryNeuralLinkRelay(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Dynamic import to avoid dependency if not available
      const neuralLinkManager = (globalThis as any).neuralLinkManager;

      if (neuralLinkManager?.isConnected()) {
        await neuralLinkManager.sendCommand("desktop", "phoenix:analyze", {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          platform: "mobile",
          timestamp: Date.now(),
        });

        console.log("[MobilePhoenix] ✅ Crash relayed to desktop Phoenix");
      } else {
        console.log(
          "[MobilePhoenix] ⚠️ Neural Link unavailable, using standalone recovery"
        );
      }
    } catch (e) {
      console.log("[MobilePhoenix] ⚠️ Neural Link relay failed:", e);
    }
  }

  private attemptAutoRecovery() {
    const newCount = this.state.errorCount + 1;

    if (newCount <= MobilePhoenix.MAX_AUTO_RECOVERIES) {
      console.log(
        `[MobilePhoenix] 🔥 Auto-recovery attempt ${newCount}/${MobilePhoenix.MAX_AUTO_RECOVERIES}`
      );

      // Store error count
      localStorage.setItem("mobile_phoenix_error_count", String(newCount));

      this.setState({ recovering: true, errorCount: newCount });

      // Auto-reload after 3 seconds
      this.recoveryTimer = setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      console.error("[MobilePhoenix] ❌ Max auto-recoveries reached");
      this.setState({ errorCount: newCount });
    }
  }

  private getStoredErrorCount(): number {
    const stored = localStorage.getItem("mobile_phoenix_error_count");
    return stored ? parseInt(stored, 10) : 0;
  }

  private resetErrorCount = () => {
    localStorage.removeItem("mobile_phoenix_error_count");
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
      recovering: false,
    });
  };

  render() {
    if (this.state.hasError) {
      const { errorCount, recovering, error } = this.state;
      const canRecover = errorCount < MobilePhoenix.MAX_AUTO_RECOVERIES;

      return (
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>🔥 Phoenix Recovery Mode</h1>
            <p style={styles.subtitle}>
              Luca encountered an error and is recovering...
            </p>
          </div>

          {canRecover && recovering ? (
            <div style={styles.recoverySection}>
              <div style={styles.spinner}>⟳</div>
              <p style={styles.recoveryText}>
                Auto-recovery in progress (attempt {errorCount}/
                {MobilePhoenix.MAX_AUTO_RECOVERIES})
              </p>
              <p style={styles.hint}>Reloading in 3 seconds...</p>
            </div>
          ) : (
            <div style={styles.manualSection}>
              <p style={styles.warningText}>
                ⚠️ Max auto-recoveries reached. Please restart manually.
              </p>
              <button onClick={this.resetErrorCount} style={styles.button}>
                Reset & Restart
              </button>
            </div>
          )}

          <details style={styles.details}>
            <summary style={styles.summary}>
              Error Details (for debugging)
            </summary>
            <div style={styles.errorContent}>
              <pre style={styles.errorMessage}>{error?.message}</pre>
              <pre style={styles.errorStack}>{error?.stack}</pre>
            </div>
          </details>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              Crash reports saved to AGENT_STATE for analysis
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 20,
    textAlign: "center",
    backgroundColor: "#0a0a0a",
    color: "#fff",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    margin: 0,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    margin: 0,
  },
  recoverySection: {
    marginBottom: 30,
  },
  spinner: {
    fontSize: 64,
    animation: "spin 1s linear infinite",
    marginBottom: 20,
  },
  recoveryText: {
    fontSize: 18,
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: "#666",
  },
  manualSection: {
    marginBottom: 30,
  },
  warningText: {
    fontSize: 18,
    marginBottom: 20,
    color: "#ff6b6b",
  },
  button: {
    padding: "15px 30px",
    fontSize: 18,
    backgroundColor: "#ff4444",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 4px 6px rgba(255, 68, 68, 0.3)",
    transition: "all 0.3s ease",
  },
  details: {
    marginTop: 30,
    textAlign: "left",
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 8,
    maxWidth: 600,
    width: "100%",
    border: "1px solid #333",
  },
  summary: {
    fontSize: 14,
    color: "#999",
    cursor: "pointer",
    marginBottom: 10,
  },
  errorContent: {
    marginTop: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: "#ff6b6b",
    backgroundColor: "#1a0000",
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
    overflow: "auto",
  },
  errorStack: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#0a0a0a",
    padding: 10,
    borderRadius: 4,
    overflow: "auto",
    maxHeight: 200,
  },
  footer: {
    marginTop: 40,
  },
  footerText: {
    fontSize: 12,
    color: "#666",
  },
};

// Add CSS animation for spinner
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
