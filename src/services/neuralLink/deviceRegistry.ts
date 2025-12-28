import type { Device, DeviceRegistry, DeviceMetadata } from "./types";

/**
 * DeviceRegistryService - Manages multiple connected devices
 *
 * Features:
 * - Device fingerprinting for unique identification
 * - Multi-device tracking
 * - Capability detection and management
 * - Trust score calculation
 * - Device metadata tracking
 * - Heartbeat monitoring
 */
export class DeviceRegistryService {
  private devices: DeviceRegistry = {};
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventHandlers: Map<string, Set<(device: Device) => void>> = new Map();

  private readonly HEARTBEAT_TIMEOUT = 60000; // 60 seconds
  private readonly TRUST_DECAY_INTERVAL = 3600000; // 1 hour

  constructor() {
    // Start trust decay checker
    setInterval(() => this.decayTrust(), this.TRUST_DECAY_INTERVAL);
  }

  /**
   * Generate a unique device fingerprint
   */
  static generateDeviceId(userAgent?: string, platform?: string): string {
    const components = [
      userAgent || navigator.userAgent,
      platform || navigator.platform,
      screen.width + "x" + screen.height,
      navigator.language,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || "unknown",
    ];

    // Create a simple hash
    const fingerprint = components.join("|");
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Combine with timestamp for uniqueness
    return `device_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  }

  /**
   * Detect device capabilities from user agent
   */
  static detectCapabilities(userAgent: string, platform: string): string[] {
    const capabilities: string[] = [];

    // Basic capabilities all devices have
    capabilities.push("messaging", "notifications");

    // Mobile-specific
    if (/mobile|android|iphone|ipad/i.test(userAgent)) {
      capabilities.push("vibration", "geolocation", "orientation");

      // Camera (assume modern mobile devices have cameras)
      capabilities.push("camera");
    }

    // Desktop-specific
    if (/windows|mac|linux/i.test(platform.toLowerCase())) {
      capabilities.push("clipboard", "filesystem", "screen-capture");
    }

    // Browser capabilities
    if (typeof navigator !== "undefined") {
      if ("geolocation" in navigator) capabilities.push("geolocation");
      if ("mediaDevices" in navigator) capabilities.push("media");
      if ("bluetooth" in navigator) capabilities.push("bluetooth");
      if ("usb" in navigator) capabilities.push("usb");
    }

    return [...new Set(capabilities)]; // Remove duplicates
  }

  /**
   * Detect device platform from user agent
   */
  static detectPlatform(userAgent: string): Device["platform"] {
    const ua = userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    if (/mac/.test(ua)) return "macos";
    if (/win/.test(ua)) return "windows";
    if (/linux/.test(ua)) return "linux";

    return "web";
  }

  /**
   * Detect device type
   */
  static detectType(userAgent: string): Device["type"] {
    const ua = userAgent.toLowerCase();

    if (/tablet|ipad/.test(ua)) return "tablet";
    if (/mobile|android|iphone/.test(ua)) return "mobile";

    return "desktop";
  }

  /**
   * Register a new device or update existing
   */
  registerDevice(deviceData: Partial<Device> & { id: string }): Device {
    const existing = this.devices[deviceData.id];

    const device: Device = {
      id: deviceData.id,
      name: deviceData.name || this.generateDeviceName(deviceData),
      type: deviceData.type || "mobile",
      platform: deviceData.platform || "web",
      capabilities: deviceData.capabilities || [],
      status: "online",
      lastSeen: new Date(),
      trustLevel: existing?.trustLevel || 50, // Start at 50% trust
      metadata: deviceData.metadata || ({} as DeviceMetadata),
      publicKey: deviceData.publicKey,
    };

    this.devices[device.id] = device;
    this.resetHeartbeatTimer(device.id);
    this.emit("device:added", device);

    return device;
  }

  /**
   * Update device metadata
   */
  updateDevice(deviceId: string, updates: Partial<Device>): Device | null {
    const device = this.devices[deviceId];
    if (!device) return null;

    Object.assign(device, updates);
    device.lastSeen = new Date();

    this.resetHeartbeatTimer(deviceId);
    this.emit("device:updated", device);

    return device;
  }

  /**
   * Remove a device from the registry
   */
  removeDevice(deviceId: string): boolean {
    const device = this.devices[deviceId];
    if (!device) return false;

    this.clearHeartbeatTimer(deviceId);
    delete this.devices[deviceId];

    this.emit("device:removed", device);
    return true;
  }

  /**
   * Get a device by ID
   */
  getDevice(deviceId: string): Device | null {
    return this.devices[deviceId] || null;
  }

  /**
   * Get all devices
   */
  getAllDevices(): Device[] {
    return Object.values(this.devices);
  }

  /**
   * Get devices by status
   */
  getDevicesByStatus(status: Device["status"]): Device[] {
    return Object.values(this.devices).filter((d) => d.status === status);
  }

  /**
   * Get devices by capability
   */
  getDevicesByCapability(capability: string): Device[] {
    return Object.values(this.devices).filter((d) =>
      d.capabilities.includes(capability)
    );
  }

  /**
   * Mark device as seen (heartbeat)
   */
  heartbeat(deviceId: string, metadata?: Partial<DeviceMetadata>): void {
    const device = this.devices[deviceId];
    if (!device) return;

    device.lastSeen = new Date();
    device.status = "online";

    if (metadata) {
      device.metadata = { ...device.metadata, ...metadata };
    }

    this.resetHeartbeatTimer(deviceId);
    this.increaseTrust(deviceId, 1); // Small trust boost for staying connected
  }

  /**
   * Calculate trust score for a device
   * Factors: connection time, successful operations, failed operations
   */
  calculateTrustScore(device: Device): number {
    let score = device.trustLevel;

    // Time-based trust (up to +20)
    const connectionDuration = Date.now() - device.lastSeen.getTime();
    const hoursSinceLastSeen = connectionDuration / (1000 * 60 * 60);

    if (hoursSinceLastSeen < 1) {
      score += 10; // Active connection
    } else if (hoursSinceLastSeen < 24) {
      score += 5; // Recent connection
    }

    // Cap between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Increase trust for a device
   */
  increaseTrust(deviceId: string, amount: number): void {
    const device = this.devices[deviceId];
    if (!device) return;

    device.trustLevel = Math.min(100, device.trustLevel + amount);
    this.emit("device:updated", device);
  }

  /**
   * Decrease trust for a device
   */
  decreaseTrust(deviceId: string, amount: number): void {
    const device = this.devices[deviceId];
    if (!device) return;

    device.trustLevel = Math.max(0, device.trustLevel - amount);
    this.emit("device:updated", device);
  }

  /**
   * Select best device for a task based on capabilities and trust
   */
  selectBestDevice(requiredCapability: string): Device | null {
    const candidates = this.getDevicesByCapability(requiredCapability).filter(
      (d) => d.status === "online"
    );

    if (candidates.length === 0) return null;

    // Score each candidate
    const scored = candidates.map((device) => ({
      device,
      score: this.scoreDevice(device, requiredCapability),
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0].device;
  }

  /**
   * Subscribe to device events
   */
  on(event: string, handler: (device: Device) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from device events
   */
  off(event: string, handler: (device: Device) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Clear all devices (for cleanup/reset)
   */
  clear(): void {
    Object.keys(this.devices).forEach((id) => {
      this.clearHeartbeatTimer(id);
    });
    this.devices = {};
  }

  // ==================== Private Methods ====================

  private generateDeviceName(device: Partial<Device>): string {
    const platform = device.platform || "Unknown";
    const type = device.type || "Device";
    return `${platform} ${type}`;
  }

  private resetHeartbeatTimer(deviceId: string): void {
    this.clearHeartbeatTimer(deviceId);

    const timer = setTimeout(() => {
      this.handleHeartbeatTimeout(deviceId);
    }, this.HEARTBEAT_TIMEOUT);

    this.heartbeatTimers.set(deviceId, timer);
  }

  private clearHeartbeatTimer(deviceId: string): void {
    const timer = this.heartbeatTimers.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      this.heartbeatTimers.delete(deviceId);
    }
  }

  private handleHeartbeatTimeout(deviceId: string): void {
    const device = this.devices[deviceId];
    if (!device) return;

    console.log(`[DeviceRegistry] Device ${deviceId} heartbeat timeout`);
    device.status = "offline";
    this.decreaseTrust(deviceId, 10); // Penalty for going offline
    this.emit("device:updated", device);
  }

  private scoreDevice(device: Device, capability: string): number {
    let score = 0;

    // Trust level (0-100)
    score += this.calculateTrustScore(device);

    // Battery level (if available, 0-30 points)
    if (device.metadata.battery) {
      score += (device.metadata.battery / 100) * 30;
    }

    // Network quality (0-20 points)
    if (device.metadata.network) {
      const networkScores = {
        wifi: 20,
        "5g": 15,
        "4g": 10,
        "3g": 5,
        offline: 0,
      };
      score += networkScores[device.metadata.network] || 0;
    }

    // Recency (0-10 points)
    const minutesSinceLastSeen =
      (Date.now() - device.lastSeen.getTime()) / (1000 * 60);
    if (minutesSinceLastSeen < 1) score += 10;
    else if (minutesSinceLastSeen < 5) score += 5;

    return score;
  }

  private decayTrust(): void {
    // Gradually decrease trust for inactive devices
    Object.values(this.devices).forEach((device) => {
      const hoursSinceLastSeen =
        (Date.now() - device.lastSeen.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSeen > 24) {
        this.decreaseTrust(device.id, 5); // -5 trust per day of inactivity
      }
    });
  }

  private emit(event: string, device: Device): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(device);
      } catch (error) {
        console.error(
          `[DeviceRegistry] Event handler error for ${event}:`,
          error
        );
      }
    });
  }
}

// Export singleton instance
export const deviceRegistry = new DeviceRegistryService();
