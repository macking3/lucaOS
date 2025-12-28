import { SecureSocket } from "./secureSocket";
import { CryptoService } from "./crypto";
import { deviceRegistry, DeviceRegistryService } from "./deviceRegistry";
import { sessionManager, SessionManager } from "./sessionManager";
import { errorHandler, ErrorHandler } from "./errorHandler";
import type {
  Device,
  Session,
  NeuralLinkMessage,
  NeuralLinkEvent,
  ConnectionState,
} from "./types";

/**
 * NeuralLinkManager - Main orchestrator for Neural Link system
 *
 * High-level API that coordinates:
 * - Secure socket connection (encrypted messaging)
 * - Device registry (multi-device management)
 * - Session management (persistence & recovery)
 * - Error handling (classification & recovery)
 *
 * This is the primary interface for Neural Link functionality.
 */
export class NeuralLinkManager {
  private socket: SecureSocket | null = null;
  private isInitialized = false;
  private myDeviceId: string | null = null;
  private eventHandlers: Map<string, Set<(event: NeuralLinkEvent) => void>> =
    new Map();

  constructor(
    private deviceRegistry: DeviceRegistryService,
    private sessionManager: SessionManager,
    private errorHandler: ErrorHandler
  ) {
    this.setupErrorHandlers();
  }

  /**
   * Initialize the Neural Link system
   */
  async initialize(
    url: string,
    options: {
      path?: string;
      deviceId?: string;
      deviceName?: string;
    } = {}
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn("[NeuralLinkManager] Already initialized");
      return;
    }

    try {
      // Generate or use provided device ID
      this.myDeviceId =
        options.deviceId || DeviceRegistryService.generateDeviceId();

      // Create secure socket
      this.socket = new SecureSocket(url, {
        path: options.path,
        query: {
          deviceId: this.myDeviceId,
          clientType: "desktop",
        },
      });

      // Setup socket event handlers
      this.setupSocketHandlers();

      this.isInitialized = true;
      console.log("[NeuralLinkManager] Initialized");
    } catch (error) {
      const nlError = this.errorHandler.createError(
        "NL_901",
        error instanceof Error ? error.message : "Unknown error"
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Connect to the Neural Link server
   */
  async connect(): Promise<void> {
    if (!this.socket) {
      throw new Error(
        "NeuralLinkManager not initialized. Call initialize() first."
      );
    }

    try {
      await this.socket.connect();

      // Try to recover previous session
      await this.attemptSessionRecovery();

      this.emit("connected", {});
    } catch (error) {
      const nlError = this.errorHandler.createError(
        "NL_104",
        error instanceof Error ? error.message : "Connection failed"
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.emit("disconnected", {});
  }

  /**
   * Pair a new device (generate QR code data)
   */
  async generatePairingData(): Promise<{
    token: string;
    qrData: string;
    deviceId: string;
  }> {
    if (!this.myDeviceId) {
      throw new Error("Device ID not set. Initialize first.");
    }

    // Generate pairing token
    const token = this.generateToken();

    // Create QR data (URL that mobile will scan)
    const qrData = JSON.stringify({
      type: "neural-link-pairing",
      token,
      deviceId: this.myDeviceId,
      timestamp: Date.now(),
    });

    return {
      token,
      qrData,
      deviceId: this.myDeviceId,
    };
  }

  /**
   * Register a device that has paired
   */
  async registerDevice(deviceData: {
    id: string;
    name: string;
    type?: Device["type"];
    platform?: Device["platform"];
    capabilities?: string[];
    publicKey: string;
  }): Promise<Device> {
    try {
      // Detect capabilities if not provided
      const capabilities =
        deviceData.capabilities ||
        DeviceRegistryService.detectCapabilities(
          navigator.userAgent,
          navigator.platform
        );

      // Register in device registry
      const device = this.deviceRegistry.registerDevice({
        id: deviceData.id,
        name: deviceData.name,
        type: deviceData.type || "mobile",
        platform:
          deviceData.platform ||
          DeviceRegistryService.detectPlatform(navigator.userAgent),
        capabilities,
        publicKey: deviceData.publicKey,
      });

      this.emit("device:added", { device });
      return device;
    } catch (error) {
      const nlError = this.errorHandler.createError(
        "NL_901",
        error instanceof Error ? error.message : "Device registration failed"
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Send a command to a device
   */
  async sendCommand(
    deviceId: string,
    command: string,
    args?: any
  ): Promise<void> {
    if (!this.socket?.isConnected()) {
      const nlError = this.errorHandler.createError("NL_103");
      await this.errorHandler.handleError(nlError);
      throw new Error("Not connected");
    }

    // Check if device has required capability
    const device = this.deviceRegistry.getDevice(deviceId);
    if (!device) {
      const nlError = this.errorHandler.createError(
        "NL_404",
        `Device ${deviceId} not found`
      );
      await this.errorHandler.handleError(nlError);
      throw new Error(`Device ${deviceId} not found`);
    }

    const message: NeuralLinkMessage = {
      type: "command",
      payload: { command, args },
      target: deviceId,
      source: this.myDeviceId || undefined,
      timestamp: Date.now(),
      commandId: this.generateCommandId(),
    };

    try {
      await this.socket.send(message);
    } catch (error) {
      // Queue for later if failed
      await this.sessionManager.queueMessage(deviceId, message);

      const nlError = this.errorHandler.createError(
        "NL_405",
        error instanceof Error ? error.message : "Command send failed",
        [deviceId]
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Send a raw system event (unencrypted)
   */
  sendSystemEvent(event: string, data: any): void {
    this.socket?.emitSystemEvent(event, data);
  }

  /**
   * Delegate tool execution to best available device
   */
  async delegateTool(tool: string, args?: any): Promise<void> {
    const device = this.deviceRegistry.selectBestDevice(tool);

    if (!device) {
      const nlError = this.errorHandler.createError(
        "NL_401",
        `No device found with capability: ${tool}`
      );
      await this.errorHandler.handleError(nlError);
      throw new Error(`No device available for ${tool}`);
    }

    await this.sendCommand(device.id, tool, args);
  }

  /**
   * Get all connected devices
   */
  getDevices(): Device[] {
    return this.deviceRegistry.getAllDevices();
  }

  /**
   * Get online devices only
   */
  getOnlineDevices(): Device[] {
    return this.deviceRegistry.getDevicesByStatus("online");
  }

  /**
   * Remove a device
   */
  async removeDevice(deviceId: string): Promise<void> {
    const removed = this.deviceRegistry.removeDevice(deviceId);

    if (removed) {
      // Also delete session
      const session = await this.sessionManager.getSessionByDevice(deviceId);
      if (session) {
        await this.sessionManager.deleteSession(session.sessionId);
      }

      this.emit("device:removed", { deviceId });
    }
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState | null {
    return this.socket?.getState() || null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.isConnected() || false;
  }

  /**
   * Get error diagnostics
   */
  getDiagnostics() {
    return {
      errors: this.errorHandler.exportDiagnostics(),
      devices: this.getDevices(),
      sessions: this.sessionManager.getActiveSessions(),
      queue: this.sessionManager.getQueueStats(),
      connection: {
        state: this.getConnectionState(),
        isConnected: this.isConnected(),
      },
    };
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: (event: NeuralLinkEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: (event: NeuralLinkEvent) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  // ==================== Private Methods ====================

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connected", () => {
      this.emit("connected", {});
    });

    this.socket.on("disconnected", () => {
      this.emit("disconnected", {});
    });

    this.socket.on("reconnecting", (event) => {
      this.emit("reconnecting", event.data);
    });

    this.socket.on("message:received", async (event) => {
      await this.handleIncomingMessage(event.data.message);
    });

    this.socket.on("error", async (event) => {
      const nlError = this.errorHandler.createError(
        "NL_105",
        event.data.error?.message || "Socket error"
      );
      await this.errorHandler.handleError(nlError);
    });
  }

  private setupErrorHandlers(): void {
    // Handle critical errors
    this.errorHandler.on("security:breach", async () => {
      // Disconnect immediately on security breach
      this.disconnect();
    });

    this.errorHandler.on("reconnect:failed", () => {
      this.emit("reconnect:failed", {});
    });

    this.errorHandler.on("session:invalid", async (error) => {
      // Try to recover session
      if (this.myDeviceId) {
        const session = await this.sessionManager.getSessionByDevice(
          this.myDeviceId
        );
        if (session) {
          await this.sessionManager.recoverSession(session.sessionId);
        }
      }
    });
  }

  /**
   * Sync state data across all linked devices
   * @param key The state key (e.g., "memory", "settings")
   * @param data The state data to sync
   */
  async syncState(key: string, data: any): Promise<void> {
    if (!this.socket?.isConnected()) {
      return; // Silently fail if not connected
    }

    const message: NeuralLinkMessage = {
      type: "sync",
      payload: { key, data },
      timestamp: Date.now(),
    };

    try {
      await this.socket.send(message);
    } catch (error) {
      console.warn(
        `[NeuralLinkManager] Failed to sync state for ${key}:`,
        error
      );
    }
  }

  private async handleIncomingMessage(
    message: NeuralLinkMessage
  ): Promise<void> {
    switch (message.type) {
      case "command":
        this.emit("command:received", { message });
        break;

      case "response":
        this.emit("response:received", { message });
        break;

      case "event":
        this.emit("event:received", { message });
        break;

      case "sync":
        // Emit specific sync events per key for easier listening
        if (message.payload?.key) {
          this.emit(`sync:${message.payload.key}`, {
            data: message.payload.data,
            source: message.source,
          });
        }
        this.emit("sync:received", { message });
        break;

      case "heartbeat":
        // Update device heartbeat
        if (message.source) {
          this.deviceRegistry.heartbeat(message.source, message.payload);
        }
        break;
    }
  }

  private async attemptSessionRecovery(): Promise<void> {
    if (!this.myDeviceId) return;

    try {
      const session = await this.sessionManager.getSessionByDevice(
        this.myDeviceId
      );

      if (session) {
        const recovered = await this.sessionManager.recoverSession(
          session.sessionId
        );

        if (recovered) {
          console.log(
            "[NeuralLinkManager] Session recovered:",
            session.sessionId
          );
          this.emit("session:restored", { session });

          // Process queued messages
          const stats = await this.sessionManager.processQueue(
            this.myDeviceId,
            async (message) => {
              if (this.socket) {
                await this.socket.send(message);
              }
            }
          );

          console.log(
            `[NeuralLinkManager] Processed queue: ${stats.sent} sent, ${stats.failed} failed`
          );
        }
      }
    } catch (error) {
      console.warn("[NeuralLinkManager] Session recovery failed:", error);
      // Non-critical, continue without session
    }
  }

  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    const neuralEvent: NeuralLinkEvent = {
      type: event as any,
      data,
      timestamp: Date.now(),
    };

    handlers.forEach((handler) => {
      try {
        handler(neuralEvent);
      } catch (error) {
        console.error(
          `[NeuralLinkManager] Event handler error for ${event}:`,
          error
        );
      }
    });
  }
}

// Export singleton instance
export const neuralLinkManager = new NeuralLinkManager(
  deviceRegistry,
  sessionManager,
  errorHandler
);
