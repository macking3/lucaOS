// Neural Link Type Definitions

export interface EncryptedMessage {
  iv: string; // Initialization vector (base64)
  encrypted: string; // AES-256 encrypted payload (base64)
  signature: string; // HMAC signature (base64)
  timestamp: number; // Unix timestamp
  nonce: string; // One-time use number
}

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface SharedSecret {
  key: Uint8Array;
  createdAt: number;
  expiresAt: number;
}

export interface DeviceMetadata {
  battery?: number;
  network?: "wifi" | "5g" | "4g" | "3g" | "offline";
  location?: Geolocation;
  platform: "ios" | "android" | "web" | "desktop";
  capabilities: string[];
}

export interface Device {
  id: string;
  name: string;
  type: "mobile" | "tablet" | "desktop";
  platform: "ios" | "android" | "web" | "macos" | "windows" | "linux";
  capabilities: string[];
  status: "online" | "offline" | "away";
  lastSeen: Date;
  trustLevel: number; // 0-100
  metadata: DeviceMetadata;
  publicKey?: string;
}

export interface DeviceRegistry {
  [deviceId: string]: Device;
}

export interface Session {
  sessionId: string;
  deviceId: string;
  sharedSecret: string; // Encrypted and stored
  publicKey: string;
  lastSeen: number;
  capabilities: string[];
  preferences: Record<string, any>;
}

export interface NeuralLinkMessage {
  type: "command" | "response" | "event" | "sync" | "heartbeat";
  payload: any;
  target?: string; // Device ID
  source?: string; // Device ID
  timestamp: number;
  commandId?: string; // For tracking request/response
}

export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  HANDSHAKING = "handshaking",
  AUTHENTICATING = "authenticating",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  DEGRADED = "degraded",
  ERROR = "error",
}

export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

export interface NeuralLinkError {
  code: string;
  severity: ErrorSeverity;
  message: string;
  technicalDetails?: string;
  timestamp: Date;
  affectedDevices?: string[];
  suggestedAction?: string;
  retryable: boolean;
}

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface NeuralLinkConfig {
  encryption: {
    algorithm: "AES-256-GCM";
    keyRotationInterval: number; // milliseconds
  };
  connection: {
    heartbeatInterval: number;
    timeout: number;
    reconnection: ReconnectionConfig;
  };
  security: {
    maxMessageAge: number; // Maximum age for replay protection
    trustThreshold: number; // Minimum trust level
  };
}

export type NeuralLinkEventType =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error"
  | "device:added"
  | "device:removed"
  | "device:updated"
  | "message:received"
  | "message:sent"
  | "session:created"
  | "session:restored";

export interface NeuralLinkEvent {
  type: NeuralLinkEventType;
  data?: any;
  timestamp: number;
}
