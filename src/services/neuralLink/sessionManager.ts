import { CryptoService } from "./crypto";
import { sessionDB } from "../storage/sessionDB";
import type { Session, NeuralLinkMessage } from "./types";

/**
 * SessionManager - Manages Neural Link sessions with persistence
 *
 * Features:
 * - Session creation and validation
 * - Session recovery from IndexedDB
 * - Offline command queue
 * - Conflict resolution
 * - Automatic session cleanup
 */
export class SessionManager {
  private activeSessions: Map<string, Session> = new Map();
  private masterPassword: string = "neural-link-master-key"; // In production, use secure key storage

  constructor() {
    // Initialize database on creation
    this.init();
  }

  /**
   * Initialize the session manager
   */
  private async init(): Promise<void> {
    await sessionDB.init();

    // Load existing sessions from storage
    await this.loadStoredSessions();

    // Schedule cleanup
    this.scheduleCleanup();
  }

  /**
   * Create a new session
   */
  async createSession(
    deviceId: string,
    sharedSecret: Uint8Array,
    publicKey: string,
    capabilities: string[] = []
  ): Promise<Session> {
    const session: Session = {
      sessionId: this.generateSessionId(),
      deviceId,
      sharedSecret: CryptoService.storeSecret(
        sharedSecret,
        this.masterPassword
      ),
      publicKey,
      lastSeen: Date.now(),
      capabilities,
      preferences: {},
    };

    // Store in memory and disk
    this.activeSessions.set(session.sessionId, session);
    await sessionDB.saveSession(session);

    console.log(`[SessionManager] Session created: ${session.sessionId}`);
    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Check memory first
    let session = this.activeSessions.get(sessionId);

    // Fall back to storage
    if (!session) {
      session = await sessionDB.getSession(sessionId);
      if (session) {
        this.activeSessions.set(sessionId, session);
      }
    }

    return session || null;
  }

  /**
   * Get session by device ID
   */
  async getSessionByDevice(deviceId: string): Promise<Session | null> {
    // Check memory first
    for (const session of this.activeSessions.values()) {
      if (session.deviceId === deviceId) {
        return session;
      }
    }

    // Fall back to storage
    const session = await sessionDB.getSessionByDevice(deviceId);
    if (session) {
      this.activeSessions.set(session.sessionId, session);
    }

    return session || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Update session (touch lastSeen)
   */
  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.lastSeen = Date.now();
    await sessionDB.saveSession(session);
  }

  /**
   * Update session preferences
   */
  async updatePreferences(
    sessionId: string,
    preferences: Record<string, any>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.preferences = { ...session.preferences, ...preferences };
    await sessionDB.saveSession(session);
  }

  /**
   * Validate a session (check if it's still valid)
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    // Check age (invalid if older than 30 days)
    const age = Date.now() - session.lastSeen;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (age > maxAge) {
      await this.deleteSession(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId);
    await sessionDB.deleteSession(sessionId);

    // Also clear any queued messages for this session's device
    const session = await sessionDB.getSession(sessionId);
    if (session) {
      await sessionDB.clearQueueForDevice(session.deviceId);
    }

    console.log(`[SessionManager] Session deleted: ${sessionId}`);
  }

  /**
   * Recover a session (load from storage and decrypt secret)
   */
  async recoverSession(sessionId: string): Promise<{
    session: Session;
    sharedSecret: Uint8Array;
  } | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    try {
      const sharedSecret = CryptoService.retrieveSecret(
        session.sharedSecret,
        this.masterPassword
      );

      this.activeSessions.set(sessionId, session);

      console.log(`[SessionManager] Session recovered: ${sessionId}`);
      return { session, sharedSecret };
    } catch (error) {
      console.error(`[SessionManager] Failed to recover session: ${error}`);
      return null;
    }
  }

  /**
   * Recover all sessions from storage
   */
  private async loadStoredSessions(): Promise<void> {
    const sessions = await sessionDB.getAllSessions();

    for (const session of sessions) {
      // Validate before loading
      const age = Date.now() - session.lastSeen;
      if (age < 30 * 24 * 60 * 60 * 1000) {
        // 30 days
        this.activeSessions.set(session.sessionId, session);
      }
    }

    console.log(
      `[SessionManager] Loaded ${this.activeSessions.size} sessions from storage`
    );
  }

  // ==================== Offline Queue Management ====================

  /**
   * Queue a message for offline delivery
   */
  async queueMessage(
    deviceId: string,
    message: NeuralLinkMessage
  ): Promise<void> {
    await sessionDB.queueMessage(message, deviceId);
    console.log(
      `[SessionManager] Message queued for ${deviceId}:`,
      message.type
    );
  }

  /**
   * Get queued messages for a device
   */
  async getQueuedMessages(deviceId: string): Promise<NeuralLinkMessage[]> {
    const items = await sessionDB.getQueuedMessages(deviceId);
    return items.map((item) => item.message);
  }

  /**
   * Process queued messages (attempt to send)
   */
  async processQueue(
    deviceId: string,
    sendFn: (message: NeuralLinkMessage) => Promise<void>
  ): Promise<{ sent: number; failed: number }> {
    const items = await sessionDB.getQueuedMessages(deviceId);

    let sent = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await sendFn(item.message);
        await sessionDB.dequeueMessage(item.id);
        sent++;
      } catch (error) {
        console.error(`[SessionManager] Failed to send queued message:`, error);

        // Increment retry count
        await sessionDB.incrementRetries(item.id);

        // Remove if too many retries (max 3)
        if (item.retries >= 3) {
          await sessionDB.dequeueMessage(item.id);
          console.warn(
            `[SessionManager] Message removed after ${item.retries} retries`
          );
        }

        failed++;
      }
    }

    console.log(
      `[SessionManager] Queue processed: ${sent} sent, ${failed} failed`
    );
    return { sent, failed };
  }

  /**
   * Clear queue for a device
   */
  async clearQueue(deviceId: string): Promise<void> {
    await sessionDB.clearQueueForDevice(deviceId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    byDevice: Record<string, number>;
    oldestTimestamp: number;
    newestTimestamp: number;
  }> {
    return sessionDB.getQueueStats();
  }

  // ==================== Conflict Resolution ====================

  /**
   * Resolve conflicts when multiple sessions exist for same device
   */
  async resolveConflicts(deviceId: string): Promise<Session | null> {
    const sessions = (await sessionDB.getAllSessions()).filter(
      (s) => s.deviceId === deviceId
    );

    if (sessions.length === 0) return null;
    if (sessions.length === 1) return sessions[0];

    // Multiple sessions - keep the most recent one
    sessions.sort((a, b) => b.lastSeen - a.lastSeen);
    const keepSession = sessions[0];

    // Delete old sessions
    for (let i = 1; i < sessions.length; i++) {
      await this.deleteSession(sessions[i].sessionId);
    }

    console.log(
      `[SessionManager] Resolved ${
        sessions.length - 1
      } conflicting sessions for ${deviceId}`
    );
    return keepSession;
  }

  // ==================== Cleanup ====================

  /**
   * Schedule automatic cleanup
   */
  private scheduleCleanup(): void {
    // Clean up daily
    setInterval(async () => {
      await this.cleanup();
    }, 24 * 60 * 60 * 1000);

    // Initial cleanup
    setTimeout(() => this.cleanup(), 5000);
  }

  /**
   * Clean up old sessions and messages
   */
  private async cleanup(): Promise<void> {
    const deletedSessions = await sessionDB.cleanupOldSessions();
    const deletedMessages = await sessionDB.cleanupOldMessages();

    console.log(
      `[SessionManager] Cleanup: ${deletedSessions} sessions, ${deletedMessages} messages removed`
    );

    // Also clean up from memory
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const age = Date.now() - session.lastSeen;
      if (age > 30 * 24 * 60 * 60 * 1000) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // ==================== Utilities ====================

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    activeSessions: number;
    totalDevices: number;
  } {
    const deviceIds = new Set(
      Array.from(this.activeSessions.values()).map((s) => s.deviceId)
    );

    return {
      activeSessions: this.activeSessions.size,
      totalDevices: deviceIds.size,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
