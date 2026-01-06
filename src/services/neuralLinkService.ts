/**
 * Neural Link Service
 *
 * Manages Socket.IO connections to the relay server for Desktop ↔ Mobile communication.
 * Uses the Socket.IO protocol which is what the relay server expects.
 */

import { io, Socket } from "socket.io-client";
import { settingsService } from "./settingsService";
import { cortexUrl } from "../config/api";

// Types
export interface NeuralLinkMessage {
  id: string;
  type: string;
  source: string;
  target: string;
  timestamp: number;
  payload?: unknown;
  sync?: {
    type: string;
    data: unknown;
  };
}

export interface NeuralLinkDevice {
  deviceId: string;
  type: string;
  name: string;
  lastSeen: number;
}

export interface NeuralLinkState {
  connected: boolean;
  deviceId: string | null;
  pairingToken: string | null;
  connectedDevices: NeuralLinkDevice[];
  error: string | null;
}

type StateListener = (state: NeuralLinkState) => void;
type MessageListener = (message: NeuralLinkMessage) => void;

// Default relay server
const DEFAULT_RELAY_URL = "https://relay-server-eight.vercel.app";

class NeuralLinkService {
  private socket: Socket | null = null;
  private state: NeuralLinkState = {
    connected: false,
    deviceId: null,
    pairingToken: null,
    connectedDevices: [],
    error: null,
  };
  private stateListeners: Set<StateListener> = new Set();
  private messageListeners: Set<MessageListener> = new Set();

  // Persistent device ID key
  private readonly DEVICE_ID_KEY = "luca_neural_link_device_id";

  /**
   * Get or generate a persistent device ID
   * Stored in localStorage to survive reconnections
   */
  getOrCreateDeviceId(): string {
    // Check localStorage first
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem(this.DEVICE_ID_KEY);
      if (stored) {
        return stored;
      }
    }

    // Generate new ID
    const newId = this.generateDeviceId();

    // Persist it
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(this.DEVICE_ID_KEY, newId);
    }

    return newId;
  }

  /**
   * Generate a unique device ID (internal helper)
   */
  private generateDeviceId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "luca-";
    for (let i = 0; i < 12; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Get the relay server URL from settings or default
   */
  private getRelayUrl(): string {
    const settings = settingsService.getSettings();
    const customUrl = settings.neuralLink?.relayServerUrl;
    if (customUrl && customUrl.trim()) {
      return customUrl.trim();
    }
    return DEFAULT_RELAY_URL;
  }

  /**
   * Generate a pairing token from the relay server
   */
  async generatePairingToken(): Promise<string> {
    const relayUrl = this.getRelayUrl();
    try {
      const response = await fetch(`${relayUrl}/api/pairing/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate token: ${response.statusText}`);
      }

      const data = await response.json();
      this.updateState({ pairingToken: data.token });
      return data.token;
    } catch (e) {
      console.error("[NeuralLink] Failed to generate pairing token:", e);
      throw e;
    }
  }

  /**
   * Get local network IP from Cortex
   */
  private async getLocalIp(): Promise<string | null> {
    try {
      // Need to ask Cortex for its IP since we are just a JS client
      // Assuming Cortex is reachable at localhost:8000 from the desktop app
      // If we are strictly in React dev mode, this might hit the proxy
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      const response = await fetch(cortexUrl("/api/remote-access/info"), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        return data.ip || null;
      }
    } catch (e) {
      console.warn("[NeuralLink] Failed to get local IP from Cortex:", e);
    }
    return null;
  }

  /**
   * Connect to the relay server (Desktop mode - creates room)
   */
  async createRoom(): Promise<string> {
    // Use PERSISTENT device ID to prevent session orphaning
    const deviceId = this.getOrCreateDeviceId();
    const token = await this.generatePairingToken();

    await this.connect(deviceId, "desktop", token);
    return token; // Return token for QR code
  }

  /**
   * Join with a pairing token (Mobile mode)
   * Supports Hybrid Mode: Tries Local LAN first, then Relay
   */
  async joinWithToken(token: string, localUrl?: string): Promise<void> {
    // Use PERSISTENT device ID
    const deviceId = this.getOrCreateDeviceId();
    await this.connect(deviceId, "mobile", token, localUrl);
  }

  /**
   * Connect to the relay server using Socket.IO
   * Hybrid Mode: If localUrl is provided, tries to connect there first.
   */
  private async connect(
    deviceId: string,
    deviceType: "desktop" | "mobile",
    token: string,
    localUrl?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Async IIFE to handle the hybrid check logic within the promise
      (async () => {
        this.disconnect(); // Clean up any existing connection

        const relayUrl = this.getRelayUrl();
        let targetUrl = relayUrl;
        let usingLocal = false;

        // --- HYBRID CONNECTION LOGIC ---
        if (localUrl && deviceType === "mobile") {
          console.log(
            `[NeuralLink] Hybrid Mode: Attempting Local LAN connection to ${localUrl}...`
          );
          try {
            // Quick check if local is reachable (timeout 2s)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            // We try to fetch the socket.io path just to see if it responds
            // Note: socket.io servers usually respond to /socket.io/ request
            const res = await fetch(
              `${localUrl}/mobile/socket.io/?EIO=4&transport=polling`,
              {
                signal: controller.signal,
              }
            );
            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(
                `Local server responded with status: ${res.status}`
              );
            }

            // If we got here, Local is alive AND healthy!
            console.log(
              "[NeuralLink] Local LAN detected! Switching to Local Mode. 🚀"
            );
            targetUrl = localUrl;
            usingLocal = true;
          } catch {
            console.log(
              "[NeuralLink] Local LAN unreachable, falling back to Relay. ☁️"
            );
          }
        }

        console.log(
          `[NeuralLink] Connecting to ${targetUrl} as ${deviceType} (${
            usingLocal ? "LAN" : "RELAY"
          })`
        );

        this.socket = io(targetUrl, {
          path: usingLocal ? "/mobile/socket.io" : "/socket.io", // Local uses specific path, Relay uses root
          transports: ["polling", "websocket"],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          query: usingLocal
            ? { deviceId, clientType: deviceType, token }
            : undefined, // Local expects auth in query
        });

        this.socket.on("connect", () => {
          console.log(
            "[NeuralLink] Socket.IO connected, registering device..."
          );

          // Register with the relay server
          this.socket?.emit("register", {
            deviceId,
            type: deviceType,
            name: `Luca ${deviceType === "desktop" ? "Desktop" : "Mobile"}`,
            token,
          });
        });

        this.socket.on("registered", (data) => {
          console.log("[NeuralLink] Device registered:", data);

          this.updateState({
            connected: true,
            deviceId,
            pairingToken: token,
            error: null,
          });

          // Setup guest handlers for Desktop
          if (deviceType === "desktop") {
            this.setupGuestHandlers();
          }

          resolve();
        });

        this.socket.on("message", (message: NeuralLinkMessage) => {
          console.log("[NeuralLink] Received message:", message.type);

          // Handle registry sync
          if (message.type === "sync" && message.sync?.type === "registry") {
            this.updateState({
              connectedDevices: message.sync.data as NeuralLinkDevice[],
            });
          }

          // Forward to message listeners
          this.messageListeners.forEach((listener) => listener(message));
        });

        this.socket.on("error", (error: { message: string }) => {
          console.error("[NeuralLink] Server error:", error.message);
          this.updateState({ error: error.message });
          reject(new Error(error.message));
        });

        this.socket.on("disconnect", (reason) => {
          console.log("[NeuralLink] Disconnected:", reason);
          this.updateState({
            connected: false,
            connectedDevices: [],
          });
        });

        this.socket.on("connect_error", (error) => {
          console.error("[NeuralLink] Connection error:", error);
          this.updateState({
            connected: false,
            error: `Connection failed: ${error.message}`,
          });
          reject(error);
        });
      })().catch(reject);
    });
  }

  /**
   * Send a message to a specific device or all devices
   */
  send(
    targetDeviceId: string | "all",
    type: string,
    payload: unknown
  ): boolean {
    if (!this.socket || !this.state.connected || !this.state.deviceId) {
      console.warn("[NeuralLink] Cannot send: not connected");
      return false;
    }

    const message: NeuralLinkMessage = {
      id: this.generateDeviceId(),
      type,
      source: this.state.deviceId,
      target: targetDeviceId,
      timestamp: Date.now(),
      payload,
    };

    this.socket.emit("message", message);
    return true;
  }

  /**
   * Disconnect from the relay
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateState({
      connected: false,
      deviceId: null,
      pairingToken: null,
      connectedDevices: [],
      error: null,
    });
  }

  /**
   * Get the pairing URL for QR code (includes relay URL + token + local URL)
   */
  async getPairingUrl(): Promise<string | null> {
    if (!this.state.pairingToken) return null;

    const relayUrl = this.getRelayUrl();
    const localIp = await this.getLocalIp();

    let url = `luca://pair?relay=${encodeURIComponent(relayUrl)}&token=${
      this.state.pairingToken
    }`;

    // Append Local URL if found (Port 3003 is the WS_PORT)
    if (localIp) {
      // Construct the full local URL
      // If IP is 192.168.1.10, local URL is http://192.168.1.10:3003
      const localUrl = `http://${localIp}:3003`;
      url += `&local=${encodeURIComponent(localUrl)}`;
    }

    return url;
  }

  /**
   * Parse a pairing URL (from QR scan)
   */
  static parsePairingUrl(
    url: string
  ): { relay: string; token: string; local?: string } | null {
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
      console.error("[NeuralLink] Failed to parse pairing URL:", e);
    }
    return null;
  }

  /**
   * Get current state
   */
  getState(): NeuralLinkState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Subscribe to messages
   */
  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private updateState(partial: Partial<NeuralLinkState>): void {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach((listener) => listener(this.state));
  }

  // ========== GUEST SESSION METHODS (Desktop only) ==========

  private guestSessions: Map<
    string,
    { peerConnection: RTCPeerConnection | null; sessionId: string }
  > = new Map();
  private guestMessageHandler:
    | ((sessionId: string, message: string) => void)
    | null = null;

  /**
   * Generate a guest session for web access (Desktop only)
   * Returns the guest URL that can be shared via QR code
   */
  async generateGuestSession(): Promise<{
    sessionId: string;
    guestUrl: string;
  } | null> {
    if (!this.socket || !this.state.connected || !this.state.deviceId) {
      console.warn("[NeuralLink] Cannot generate guest session: not connected");
      return null;
    }

    const relayUrl = this.getRelayUrl();
    try {
      const response = await fetch(`${relayUrl}/api/guest/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desktopDeviceId: this.state.deviceId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to generate guest session: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("[NeuralLink] Guest session created:", data);

      // Store session locally
      this.guestSessions.set(data.sessionId, {
        peerConnection: null,
        sessionId: data.sessionId,
      });

      return { sessionId: data.sessionId, guestUrl: data.guestUrl };
    } catch (e) {
      console.error("[NeuralLink] Failed to generate guest session:", e);
      return null;
    }
  }

  /**
   * Set handler for guest messages
   */
  onGuestMessage(handler: (sessionId: string, message: string) => void): void {
    this.guestMessageHandler = handler;
  }

  /**
   * Send message/audio to a guest
   */
  sendToGuest(
    sessionId: string,
    message: string,
    audioBase64?: string
  ): boolean {
    if (!this.socket || !this.state.connected) {
      return false;
    }

    this.socket.emit("desktop-to-guest", {
      sessionId,
      message,
      audio: audioBase64,
    });
    return true;
  }

  /**
   * Initialize WebRTC for a guest session
   */
  private async initGuestWebRTC(
    sessionId: string
  ): Promise<RTCPeerConnection | null> {
    try {
      const config: RTCConfiguration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      const pc = new RTCPeerConnection(config);

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit("webrtc-ice-candidate", {
            sessionId,
            candidate: event.candidate,
            fromDesktop: true,
          });
        }
      };

      // Handle incoming audio from guest
      pc.ontrack = (event) => {
        console.log("[NeuralLink] Received audio from guest");
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
      };

      // Store the peer connection
      const session = this.guestSessions.get(sessionId);
      if (session) {
        session.peerConnection = pc;
      }

      return pc;
    } catch (e) {
      console.error("[NeuralLink] Failed to init WebRTC:", e);
      return null;
    }
  }

  /**
   * Start the guest session (WebRTC offer) - called after auth
   */
  private async startGuestSession(sessionId: string): Promise<void> {
    console.log(
      `[NeuralLink] Starting guest session ${sessionId} (Authorized)`
    );
    // Initialize WebRTC and send offer
    const pc = await this.initGuestWebRTC(sessionId);
    if (pc) {
      try {
        // Get local audio (if we want bidirectional audio)
        // For now, we'll just receive audio from guest
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        this.socket?.emit("webrtc-offer", {
          sessionId: sessionId,
          offer: pc.localDescription,
        });
      } catch (e) {
        console.error("[NeuralLink] WebRTC offer failed:", e);
      }
    }
  }

  /**
   * Send a JSON-encoded auth control message to guest
   */
  private sendToGuestAuth(
    sessionId: string,
    type: "auth-challenge" | "auth-success" | "auth-failed"
  ): void {
    const payload = JSON.stringify({ type });
    this.sendToGuest(sessionId, payload);
  }

  /**
   * Setup guest event handlers on the socket
   */
  private setupGuestHandlers(): void {
    if (!this.socket) return;

    // Guest connected
    this.socket.on("guest-connected", async (data: { sessionId: string }) => {
      console.log("[NeuralLink] Guest connected:", data.sessionId);

      // 1. Check if PIN is required
      try {
        const res = await fetch(cortexUrl("/api/remote-access/info"));
        const info = await res.json();
        if (info.pinRequired) {
          console.log(
            `[NeuralLink] PIN required for session ${data.sessionId}, sending challenge`
          );
          this.sendToGuestAuth(data.sessionId, "auth-challenge");
          return;
        }
      } catch (e) {
        console.error("[NeuralLink] Failed to check PIN status:", e);
      }

      // If no PIN required (or check failed), proceed
      await this.startGuestSession(data.sessionId);
    });

    // WebRTC answer from guest
    this.socket.on(
      "webrtc-answer",
      async (data: {
        sessionId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        const session = this.guestSessions.get(data.sessionId);
        if (session?.peerConnection) {
          await session.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      }
    );

    // ICE candidate from guest
    this.socket.on(
      "webrtc-ice-candidate",
      async (data: { sessionId: string; candidate: RTCIceCandidateInit }) => {
        const session = this.guestSessions.get(data.sessionId);
        if (session?.peerConnection && data.candidate) {
          await session.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      }
    );

    // Message from guest (Chat or Auth Response)
    this.socket.on(
      "guest-message",
      async (data: { sessionId: string; message: string }) => {
        // DEBUG:
        // console.log("[NeuralLink] Raw guest message:", data);

        // 2. Check for Auth Response (JSON)
        // Relay passes message as-is. We try to parse it as JSON to see if it's a protocol message.
        if (
          typeof data.message === "string" &&
          data.message.startsWith("{") &&
          data.message.includes("auth-response")
        ) {
          try {
            const payload = JSON.parse(data.message);
            if (payload.type === "auth-response" && payload.pin) {
              console.log(
                `[NeuralLink] verifying PIN for session ${data.sessionId}`
              );

              // Verify PIN with Cortex
              const res = await fetch(
                cortexUrl("/api/remote-access/verify-pin"),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    pin: payload.pin,
                    sessionId: data.sessionId,
                  }),
                }
              );

              if (res.ok) {
                const verifyData = await res.json();
                if (verifyData.valid) {
                  console.log(
                    `[NeuralLink] PIN correct for ${data.sessionId}. starting session.`
                  );
                  this.sendToGuestAuth(data.sessionId, "auth-success");
                  await this.startGuestSession(data.sessionId);
                  return; // Don't process as chat message
                }
              }

              console.warn(
                `[NeuralLink] PIN invalid for session ${data.sessionId}`
              );
              this.sendToGuestAuth(data.sessionId, "auth-failed");
              return; // Don't process as chat message
            }
          } catch (e) {
            // Not a valid JSON or not an auth message, treat as chat
          }
        }

        // 3. Normal Chat Message
        console.log("[NeuralLink] Guest chat message:", data);
        if (this.guestMessageHandler) {
          this.guestMessageHandler(data.sessionId, data.message);
        }
      }
    );

    // Guest disconnected
    this.socket.on("guest-disconnected", (data: { sessionId: string }) => {
      console.log("[NeuralLink] Guest disconnected:", data.sessionId);
      const session = this.guestSessions.get(data.sessionId);
      if (session?.peerConnection) {
        session.peerConnection.close();
      }
      this.guestSessions.delete(data.sessionId);
    });
  }

  /**
   * Initialize guest message handler with Luca AI processing
   * Call this in App.tsx or wherever Luca is initialized
   *
   * @param processMessage - Function that takes user message, returns AI response
   * @param generateAudio - Optional function to generate TTS audio (returns base64)
   */
  initGuestHandler(
    processMessage: (message: string) => Promise<string>,
    generateAudio?: (text: string) => Promise<string | null>
  ): void {
    this.onGuestMessage(async (sessionId, message) => {
      console.log(
        `[NeuralLink] Processing guest message from ${sessionId}: "${message}"`
      );

      try {
        // Process message through Luca AI
        const response = await processMessage(message);

        // Generate audio if handler provided
        let audioBase64: string | undefined;
        if (generateAudio) {
          try {
            const audio = await generateAudio(response);
            audioBase64 = audio || undefined;
          } catch (e) {
            console.warn("[NeuralLink] Audio generation failed:", e);
          }
        }

        // Send response back to guest
        this.sendToGuest(sessionId, response, audioBase64);
        console.log(`[NeuralLink] Sent response to guest ${sessionId}`);
      } catch (e) {
        console.error("[NeuralLink] Failed to process guest message:", e);
        this.sendToGuest(
          sessionId,
          "Sorry, I encountered an error processing your request."
        );
      }
    });

    console.log("[NeuralLink] Guest message handler initialized");
  }
}

// Export singleton
export const neuralLink = new NeuralLinkService();
