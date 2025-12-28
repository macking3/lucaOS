import { io, Socket } from "socket.io-client";
import { CryptoService } from "./crypto";
import { ConnectionState } from "./types";
import type {
  EncryptedMessage,
  NeuralLinkMessage,
  SharedSecret,
  KeyPair,
  ReconnectionConfig,
  NeuralLinkEvent,
} from "./types";

/**
 * SecureSocket - Encrypted WebSocket wrapper with auto-reconnection
 *
 * Features:
 * - End-to-end encryption for all messages
 * - Automatic reconnection with exponential backoff
 * - Message queue for offline mode
 * - Key exchange handshake
 * - Connection state machine
 * - Event emitter for status updates
 */
export class SecureSocket {
  private socket: Socket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private sharedSecret: SharedSecret | null = null;
  private myKeyPair: KeyPair | null = null;
  private messageQueue: NeuralLinkMessage[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<(event: NeuralLinkEvent) => void>> =
    new Map();

  private readonly config: ReconnectionConfig = {
    maxAttempts: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    jitter: true,
  };

  constructor(
    private url: string,
    private options: {
      path?: string;
      query?: Record<string, string>;
      heartbeatInterval?: number;
    } = {}
  ) {
    this.options.heartbeatInterval = options.heartbeatInterval || 30000; // 30s default
  }

  /**
   * Connect to the server and initiate key exchange
   */
  async connect(): Promise<void> {
    if (
      this.state === ConnectionState.CONNECTED ||
      this.state === ConnectionState.CONNECTING
    ) {
      console.warn("[SecureSocket] Already connected or connecting");
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      // Generate our key pair
      this.myKeyPair = CryptoService.generateKeyPair();

      // Create socket connection
      this.socket = io(this.url, {
        path: this.options.path,
        query: this.options.query,
        transports: ["websocket"],
        reconnection: false, // We handle reconnection ourselves
      });

      // Setup socket event handlers
      this.setupSocketHandlers();

      await this.waitForConnection();

      // Initiate key exchange
      await this.performKeyExchange();

      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;

      // Start heartbeat
      this.startHeartbeat();

      // Process queued messages
      await this.processMessageQueue();

      this.emit("connected", {});
    } catch (error) {
      console.error("[SecureSocket] Connection failed:", error);
      this.setState(ConnectionState.ERROR);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.sharedSecret = null;
    this.myKeyPair = null;
    this.emit("disconnected", {});
  }

  /**
   * Send an encrypted message
   */
  async send(message: NeuralLinkMessage): Promise<void> {
    if (this.state !== ConnectionState.CONNECTED || !this.sharedSecret) {
      // Queue message for later
      this.messageQueue.push(message);
      console.log("[SecureSocket] Message queued (offline):", message.type);
      return;
    }

    try {
      // Create secure message
      const encrypted = CryptoService.createSecureMessage(
        message,
        this.sharedSecret.key
      );

      // Send via socket with routing hint (target)
      this.socket?.emit("secure:message", {
        ...encrypted,
        target: message.target,
      });
      this.emit("message:sent", { message });
    } catch (error) {
      console.error("[SecureSocket] Failed to send message:", error);
      // Re-queue on failure
      this.messageQueue.push(message);
      throw error;
    }
  }

  /**
   * Emit a raw system event (unencrypted)
   */
  emitSystemEvent(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && !!this.sharedSecret;
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

    this.socket.on("connect", () => {
      console.log("[SecureSocket] Socket connected");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[SecureSocket] Socket disconnected:", reason);
      this.handleDisconnect();
    });

    this.socket.on("error", (error) => {
      console.error("[SecureSocket] Socket error:", error);
      this.emit("error", { error });
    });

    // Encrypted message handler
    this.socket.on("secure:message", (encrypted: EncryptedMessage) => {
      this.handleEncryptedMessage(encrypted);
    });

    // Key exchange response
    this.socket.on("key:exchange:response", (data: { publicKey: string }) => {
      this.handleKeyExchangeResponse(data);
    });

    // Handle unencrypted system commands from trusted server
    this.socket.on("command:received", (command: any) => {
      console.log(
        "[SecureSocket] Received system command from server:",
        command
      );
      this.emit("message:received", {
        message: {
          type: "command",
          payload: {
            command: command.tool,
            args: command.args,
          },
          source: "server",
          target: "me",
          timestamp: Date.now(),
          commandId: command.id,
        },
      });
    });
  }

  private async performKeyExchange(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.myKeyPair) {
        reject(new Error("Socket or keypair not initialized"));
        return;
      }

      this.setState(ConnectionState.HANDSHAKING);

      // Send our public key
      const publicKeyB64 = CryptoService.encodeKey(this.myKeyPair.publicKey);
      this.socket.emit("key:exchange:request", { publicKey: publicKeyB64 });

      // Wait for response with timeout
      const timeout = setTimeout(() => {
        reject(new Error("Key exchange timeout"));
      }, 10000);

      this.socket.once(
        "key:exchange:response",
        (data: { publicKey: string }) => {
          clearTimeout(timeout);
          this.handleKeyExchangeResponse(data);
          resolve();
        }
      );
    });
  }

  private handleKeyExchangeResponse(data: { publicKey: string }): void {
    if (!this.myKeyPair) {
      console.error("[SecureSocket] No keypair for key exchange");
      return;
    }

    try {
      const theirPublicKey = CryptoService.decodeKey(data.publicKey);

      // Derive shared secret
      this.sharedSecret = CryptoService.deriveSharedSecret(
        theirPublicKey,
        this.myKeyPair.secretKey
      );

      console.log("[SecureSocket] Shared secret established");
      this.setState(ConnectionState.AUTHENTICATING);
    } catch (error) {
      console.error("[SecureSocket] Key exchange failed:", error);
      this.setState(ConnectionState.ERROR);
    }
  }

  private handleEncryptedMessage(encrypted: EncryptedMessage): void {
    if (!this.sharedSecret) {
      console.warn(
        "[SecureSocket] Received message before key exchange complete"
      );
      return;
    }

    try {
      const message = CryptoService.decryptSecureMessage(
        encrypted,
        this.sharedSecret.key
      );

      this.emit("message:received", { message });
    } catch (error) {
      console.error("[SecureSocket] Failed to decrypt message:", error);
      this.emit("error", { error });
    }
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.setState(ConnectionState.RECONNECTING);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxAttempts) {
      console.error("[SecureSocket] Max reconnection attempts reached");
      this.setState(ConnectionState.ERROR);
      this.emit("error", {
        error: new Error("Max reconnection attempts reached"),
      });
      return;
    }

    // Calculate delay with exponential backoff
    let delay = Math.min(
      this.config.baseDelay *
        Math.pow(this.config.backoffMultiplier, this.reconnectAttempts),
      this.config.maxDelay
    );

    // Add jitter
    if (this.config.jitter) {
      delay += Math.random() * 1000;
    }

    console.log(
      `[SecureSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${
        this.reconnectAttempts + 1
      }/${this.config.maxAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((err) => {
        console.error("[SecureSocket] Reconnection failed:", err);
      });
    }, delay);

    this.emit("reconnecting", { attempt: this.reconnectAttempts, delay });
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: "heartbeat",
          payload: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    console.log(
      `[SecureSocket] Processing ${this.messageQueue.length} queued messages`
    );

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queue) {
      try {
        await this.send(message);
      } catch (error) {
        console.error("[SecureSocket] Failed to send queued message:", error);
        // Will be re-queued by send()
      }
    }
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not initialized"));
        return;
      }

      if (this.socket.connected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);

      this.socket.once("connect", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    console.log(`[SecureSocket] State: ${oldState} → ${newState}`);
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
          `[SecureSocket] Event handler error for ${event}:`,
          error
        );
      }
    });
  }
}
