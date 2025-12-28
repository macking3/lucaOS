import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Session, NeuralLinkMessage } from "../neuralLink/types";

/**
 * IndexedDB Schema for Neural Link
 */
interface NeuralLinkDB extends DBSchema {
  sessions: {
    key: string; // sessionId
    value: Session;
    indexes: {
      "by-device": string; // deviceId
      "by-lastSeen": number;
    };
  };
  messageQueue: {
    key: number; // auto-increment
    value: {
      id: number;
      message: NeuralLinkMessage;
      deviceId: string;
      timestamp: number;
      retries: number;
    };
    indexes: {
      "by-device": string;
      "by-timestamp": number;
    };
  };
}

/**
 * SessionDB - IndexedDB wrapper for Neural Link session storage
 *
 * Features:
 * - Session persistence across browser restarts
 * - Offline message queue
 * - Efficient querying with indexes
 * - Automatic cleanup of old data
 */
export class SessionDB {
  private db: IDBPDatabase<NeuralLinkDB> | null = null;
  private readonly DB_NAME = "neural-link-db";
  private readonly DB_VERSION = 1;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<NeuralLinkDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Sessions store
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", {
            keyPath: "sessionId",
          });
          sessionStore.createIndex("by-device", "deviceId");
          sessionStore.createIndex("by-lastSeen", "lastSeen");
        }

        // Message queue store
        if (!db.objectStoreNames.contains("messageQueue")) {
          const queueStore = db.createObjectStore("messageQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
          queueStore.createIndex("by-device", "deviceId");
          queueStore.createIndex("by-timestamp", "timestamp");
        }
      },
    });

    console.log("[SessionDB] Database initialized");
  }

  // ==================== Session Operations ====================

  /**
   * Save a session
   */
  async saveSession(session: Session): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put("sessions", session);
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | undefined> {
    if (!this.db) await this.init();
    return this.db!.get("sessions", sessionId);
  }

  /**
   * Get session by device ID
   */
  async getSessionByDevice(deviceId: string): Promise<Session | undefined> {
    if (!this.db) await this.init();
    const sessions = await this.db!.getAllFromIndex(
      "sessions",
      "by-device",
      deviceId
    );
    return sessions[0]; // Return first match
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<Session[]> {
    if (!this.db) await this.init();
    return this.db!.getAll("sessions");
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete("sessions", sessionId);
  }

  /**
   * Delete all sessions
   */
  async clearSessions(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear("sessions");
  }

  /**
   * Clean up old sessions (older than 30 days)
   */
  async cleanupOldSessions(
    maxAge: number = 30 * 24 * 60 * 60 * 1000
  ): Promise<number> {
    if (!this.db) await this.init();

    const cutoff = Date.now() - maxAge;
    const sessions = await this.db!.getAll("sessions");

    let deleted = 0;
    for (const session of sessions) {
      if (session.lastSeen < cutoff) {
        await this.deleteSession(session.sessionId);
        deleted++;
      }
    }

    console.log(`[SessionDB] Cleaned up ${deleted} old sessions`);
    return deleted;
  }

  // ==================== Message Queue Operations ====================

  /**
   * Add a message to the queue
   */
  async queueMessage(
    message: NeuralLinkMessage,
    deviceId: string
  ): Promise<number> {
    if (!this.db) await this.init();

    const id = await this.db!.add("messageQueue", {
      id: 0, // Will be auto-incremented
      message,
      deviceId,
      timestamp: Date.now(),
      retries: 0,
    });

    return id as number;
  }

  /**
   * Get all queued messages for a device
   */
  async getQueuedMessages(deviceId: string): Promise<
    Array<{
      id: number;
      message: NeuralLinkMessage;
      deviceId: string;
      timestamp: number;
      retries: number;
    }>
  > {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex("messageQueue", "by-device", deviceId);
  }

  /**
   * Get all queued messages
   */
  async getAllQueuedMessages(): Promise<
    Array<{
      id: number;
      message: NeuralLinkMessage;
      deviceId: string;
      timestamp: number;
      retries: number;
    }>
  > {
    if (!this.db) await this.init();
    return this.db!.getAll("messageQueue");
  }

  /**
   * Remove a message from the queue
   */
  async dequeueMessage(id: number): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete("messageQueue", id);
  }

  /**
   * Increment retry count for a message
   */
  async incrementRetries(id: number): Promise<void> {
    if (!this.db) await this.init();

    const item = await this.db!.get("messageQueue", id);
    if (item) {
      item.retries++;
      await this.db!.put("messageQueue", item);
    }
  }

  /**
   * Clear all queued messages
   */
  async clearQueue(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear("messageQueue");
  }

  /**
   * Clear queue for specific device
   */
  async clearQueueForDevice(deviceId: string): Promise<void> {
    if (!this.db) await this.init();

    const messages = await this.getQueuedMessages(deviceId);
    for (const msg of messages) {
      await this.dequeueMessage(msg.id);
    }
  }

  /**
   * Clean up old messages (older than 7 days)
   */
  async cleanupOldMessages(
    maxAge: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<number> {
    if (!this.db) await this.init();

    const cutoff = Date.now() - maxAge;
    const messages = await this.getAllQueuedMessages();

    let deleted = 0;
    for (const msg of messages) {
      if (msg.timestamp < cutoff) {
        await this.dequeueMessage(msg.id);
        deleted++;
      }
    }

    console.log(`[SessionDB] Cleaned up ${deleted} old messages`);
    return deleted;
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
    if (!this.db) await this.init();

    const messages = await this.getAllQueuedMessages();

    const byDevice: Record<string, number> = {};
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const msg of messages) {
      byDevice[msg.deviceId] = (byDevice[msg.deviceId] || 0) + 1;
      oldestTimestamp = Math.min(oldestTimestamp, msg.timestamp);
      newestTimestamp = Math.max(newestTimestamp, msg.timestamp);
    }

    return {
      total: messages.length,
      byDevice,
      oldestTimestamp: messages.length > 0 ? oldestTimestamp : 0,
      newestTimestamp: messages.length > 0 ? newestTimestamp : 0,
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const sessionDB = new SessionDB();
