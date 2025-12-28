import { ErrorSeverity } from "./types";
import type { NeuralLinkError } from "./types";

/**
 * Error Code Taxonomy
 */
export const ErrorCodes = {
  // Connection Errors (NL_1xx)
  NL_101: "Connection timeout",
  NL_102: "Network unreachable",
  NL_103: "Device disconnected",
  NL_104: "Handshake failed",
  NL_105: "WebSocket error",
  NL_106: "Max reconnection attempts reached",

  // Security Errors (NL_2xx)
  NL_201: "Invalid signature",
  NL_202: "Encryption failed",
  NL_203: "Decryption failed",
  NL_204: "Token expired",
  NL_205: "Unauthorized device",
  NL_206: "Key exchange failed",
  NL_207: "Message too old (replay attack)",

  // Protocol Errors (NL_3xx)
  NL_301: "Malformed message",
  NL_302: "Unsupported protocol version",
  NL_303: "Rate limit exceeded",
  NL_304: "Invalid message type",
  NL_305: "Missing required field",

  // Delegation Errors (NL_4xx)
  NL_401: "Capability not found",
  NL_402: "Execution timeout",
  NL_403: "Permission denied",
  NL_404: "Device not found",
  NL_405: "Command failed",

  // Session Errors (NL_5xx)
  NL_501: "Session not found",
  NL_502: "Session expired",
  NL_503: "Session creation failed",
  NL_504: "Session recovery failed",
  NL_505: "Storage error",

  // Generic Errors (NL_9xx)
  NL_900: "Unknown error",
  NL_901: "Internal error",
  NL_902: "Not implemented",
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * ErrorHandler - Centralized error handling for Neural Link
 *
 * Features:
 * - Error classification
 * - Recovery strategies
 * - User-friendly messages
 * - Logging and diagnostics
 * - Error analytics
 */
export class ErrorHandler {
  private errorLog: NeuralLinkError[] = [];
  private readonly MAX_LOG_SIZE = 100;
  private errorHandlers: Map<string, Set<(error: NeuralLinkError) => void>> =
    new Map();

  /**
   * Create a Neural Link error
   */
  createError(
    code: ErrorCode,
    technicalDetails?: string,
    affectedDevices?: string[]
  ): NeuralLinkError {
    const error: NeuralLinkError = {
      code,
      severity: this.getSeverity(code),
      message: this.getUserMessage(code),
      technicalDetails,
      timestamp: new Date(),
      affectedDevices,
      suggestedAction: this.getSuggestedAction(code),
      retryable: this.isRetryable(code),
    };

    this.logError(error);
    return error;
  }

  /**
   * Handle an error with appropriate recovery strategy
   */
  async handleError(error: NeuralLinkError): Promise<void> {
    console.error(
      `[ErrorHandler] ${error.code}: ${error.message}`,
      error.technicalDetails
    );

    // Emit to subscribers
    this.emit("error", error);

    // Execute recovery strategy
    await this.executeRecovery(error);

    // Show user notification if needed
    if (this.shouldNotifyUser(error)) {
      this.notifyUser(error);
    }
  }

  /**
   * Get error severity based on code
   */
  private getSeverity(code: ErrorCode): ErrorSeverity {
    // Connection errors - mostly warnings
    if (code.startsWith("NL_1")) {
      if (code === "NL_106") return ErrorSeverity.ERROR; // Max reconnect is serious
      return ErrorSeverity.WARNING;
    }

    // Security errors - always critical
    if (code.startsWith("NL_2")) {
      return ErrorSeverity.CRITICAL;
    }

    // Protocol errors - errors
    if (code.startsWith("NL_3")) {
      return ErrorSeverity.ERROR;
    }

    // Delegation errors - warnings/errors
    if (code.startsWith("NL_4")) {
      return code === "NL_403" ? ErrorSeverity.ERROR : ErrorSeverity.WARNING;
    }

    // Session errors - errors
    if (code.startsWith("NL_5")) {
      return ErrorSeverity.ERROR;
    }

    return ErrorSeverity.ERROR;
  }

  /**
   * Get user-friendly message
   */
  private getUserMessage(code: ErrorCode): string {
    const userMessages: Record<ErrorCode, string> = {
      // Connection
      NL_101: "Connection timed out. Please check your internet connection.",
      NL_102: "Unable to reach the server. Please check your network.",
      NL_103: "Device disconnected. Attempting to reconnect...",
      NL_104: "Failed to establish secure connection.",
      NL_105: "Network connection error occurred.",
      NL_106: "Unable to reconnect after multiple attempts.",

      // Security
      NL_201: "Message authentication failed. Connection may be compromised.",
      NL_202: "Failed to encrypt message.",
      NL_203: "Failed to decrypt message.",
      NL_204: "Your session has expired. Please reconnect.",
      NL_205: "This device is not authorized.",
      NL_206: "Failed to establish secure connection.",
      NL_207: "Received an outdated message.",

      // Protocol
      NL_301: "Received an invalid message.",
      NL_302: "Protocol version mismatch.",
      NL_303: "Too many requests. Please slow down.",
      NL_304: "Invalid message format.",
      NL_305: "Incomplete message received.",

      // Delegation
      NL_401: "This device doesn't support the requested feature.",
      NL_402: "Command timed out.",
      NL_403: "Permission denied.",
      NL_404: "Device not found.",
      NL_405: "Command failed to execute.",

      // Session
      NL_501: "Session not found. Please reconnect.",
      NL_502: "Your session has expired. Please reconnect.",
      NL_503: "Failed to create session.",
      NL_504: "Failed to restore previous session.",
      NL_505: "Storage error occurred.",

      // Generic
      NL_900: "An unknown error occurred.",
      NL_901: "An internal error occurred.",
      NL_902: "This feature is not yet available.",
    };

    return userMessages[code] || ErrorCodes[code];
  }

  /**
   * Get suggested user action
   */
  private getSuggestedAction(code: ErrorCode): string | undefined {
    const actions: Partial<Record<ErrorCode, string>> = {
      NL_101: "Check your internet connection and try again.",
      NL_102: "Verify your network settings and try reconnecting.",
      NL_103: "Device will automatically reconnect.",
      NL_106: "Manually reconnect the device.",
      NL_201: "Disconnect and reconnect the device.",
      NL_204: "Scan the QR code again to reconnect.",
      NL_205: "Contact support if you believe this is an error.",
      NL_303: "Wait a moment before trying again.",
      NL_401: "Choose a different device or feature.",
      NL_403: "Check device permissions and try again.",
      NL_502: "Reconnect by scanning the QR code.",
    };

    return actions[code];
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(code: ErrorCode): boolean {
    const retryable = [
      "NL_101",
      "NL_102",
      "NL_103",
      "NL_104",
      "NL_105", // Connection errors
      "NL_303", // Rate limit
      "NL_402",
      "NL_405", // Delegation timeouts
      "NL_505", // Storage errors
    ];

    return retryable.includes(code);
  }

  /**
   * Execute recovery strategy based on error type
   */
  private async executeRecovery(error: NeuralLinkError): Promise<void> {
    switch (error.code) {
      // Connection errors - handled by SecureSocket auto-reconnect
      case "NL_101":
      case "NL_102":
      case "NL_103":
      case "NL_104":
      case "NL_105":
        // Let SecureSocket handle reconnection
        break;

      case "NL_106":
        // Max reconnect - need manual intervention
        this.emit("reconnect:failed", error);
        break;

      // Security errors - disconnect and require re-pairing
      case "NL_201":
      case "NL_205":
      case "NL_206":
      case "NL_207":
        this.emit("security:breach", error);
        break;

      // Session errors - attempt recovery
      case "NL_501":
      case "NL_502":
        this.emit("session:invalid", error);
        break;

      // Protocol errors - log and continue
      case "NL_301":
      case "NL_304":
      case "NL_305":
        // Just log, usually transient
        break;

      // Rate limit - backoff
      case "NL_303":
        this.emit("rate:limited", error);
        break;

      // Delegation errors - notify caller
      case "NL_401":
      case "NL_402":
      case "NL_403":
      case "NL_404":
      case "NL_405":
        this.emit("delegation:failed", error);
        break;
    }
  }

  /**
   * Check if user should be notified
   */
  private shouldNotifyUser(error: NeuralLinkError): boolean {
    // Critical errors always notify
    if (error.severity === ErrorSeverity.CRITICAL) return true;

    // Errors that need user action
    const notifyForCodes: ErrorCode[] = [
      "NL_106", // Max reconnect
      "NL_204", // Token expired
      "NL_205", // Unauthorized
      "NL_303", // Rate limit
      "NL_403", // Permission denied
      "NL_502", // Session expired
    ];

    return notifyForCodes.includes(error.code as ErrorCode);
  }

  /**
   * Show user notification (to be implemented by UI layer)
   */
  private notifyUser(error: NeuralLinkError): void {
    this.emit("notify:user", error);
  }

  /**
   * Log error to history
   */
  private logError(error: NeuralLinkError): void {
    this.errorLog.unshift(error);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(count?: number): NeuralLinkError[] {
    return count ? this.errorLog.slice(0, count) : [...this.errorLog];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCode: Record<string, number>;
    recentErrors: number; // Last hour
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.INFO]: 0,
      [ErrorSeverity.WARNING]: 0,
      [ErrorSeverity.ERROR]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const byCode: Record<string, number> = {};
    let recentErrors = 0;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const error of this.errorLog) {
      bySeverity[error.severity]++;
      byCode[error.code] = (byCode[error.code] || 0) + 1;

      if (error.timestamp.getTime() > oneHourAgo) {
        recentErrors++;
      }
    }

    return {
      total: this.errorLog.length,
      bySeverity,
      byCode,
      recentErrors,
    };
  }

  /**
   * Export diagnostics for debugging
   */
  exportDiagnostics(): {
    timestamp: string;
    errorLog: NeuralLinkError[];
    stats: ReturnType<ErrorHandler["getErrorStats"]>;
    systemInfo: {
      userAgent: string;
      platform: string;
      language: string;
    };
  } {
    return {
      timestamp: new Date().toISOString(),
      errorLog: this.getErrorHistory(50), // Last 50 errors
      stats: this.getErrorStats(),
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorLog = [];
  }

  /**
   * Subscribe to error events
   */
  on(event: string, handler: (error: NeuralLinkError) => void): void {
    if (!this.errorHandlers.has(event)) {
      this.errorHandlers.set(event, new Set());
    }
    this.errorHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from error events
   */
  off(event: string, handler: (error: NeuralLinkError) => void): void {
    this.errorHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit error event
   */
  private emit(event: string, error: NeuralLinkError): void {
    const handlers = this.errorHandlers.get(event);
    if (!handlers) return;

    handlers.forEach((handler: (error: NeuralLinkError) => void) => {
      try {
        handler(error);
      } catch (e) {
        console.error(`[ErrorHandler] Handler error for ${event}:`, e);
      }
    });
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
