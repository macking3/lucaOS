/**
 * Conversation Storage Service
 * Stores all conversations in Chroma DB for permanent memory and RAG
 */

import { chromaService } from "./chromaService";
import { memoryService } from "./memoryService";
import type { Message } from "../types";
import { Sender } from "../types";

interface ConversationMetadata {
  sessionId?: string;
  persona?: string;
  toolsUsed?: string[];
  deviceType?: string;
  timestamp: number;
}

interface CacheEntry {
  results: Array<{
    text: string;
    sender: string;
    timestamp: number;
    metadata: ConversationMetadata;
    relevance: number;
  }>;
  timestamp: number;
}

class ConversationService {
  private sessionId: string;
  private isEnabled: boolean = true;
  private availabilityChecked: boolean = false;

  // Cache configuration
  private queryCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute TTL
  private readonly MAX_CACHE_SIZE = 100; // Max cached queries

  // Performance metrics
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor() {
    // Generate session ID for this app instance
    this.sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Check Chroma availability asynchronously (don't block)
    this.checkAvailability().catch((err) => {
      console.warn("[CONVERSATION] Availability check failed:", err);
    });

    // Periodic cache cleanup (every 5 minutes)
    setInterval(() => this.cleanupCache(), 5 * 60000);
  }

  /**
   * Check if Chroma service is available
   */
  async checkAvailability(): Promise<boolean> {
    // Wait a bit for bridge to start (if server just started)
    if (!this.availabilityChecked) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.availabilityChecked = true;
    }

    const available = await chromaService.checkAvailability();
    this.isEnabled = available;
    if (!available) {
      console.warn(
        "[CONVERSATION] Chroma not available, conversations will only be stored in localStorage"
      );
    } else {
      console.log("[CONVERSATION] Chroma storage enabled");
    }
    return available;
  }

  /**
   * Store a conversation message
   */
  async storeMessage(
    message: Message,
    metadata?: Partial<ConversationMetadata>
  ): Promise<void> {
    // Re-check availability if not checked yet (for first message)
    if (!this.availabilityChecked) {
      await this.checkAvailability();
    }

    // Try to store even if we think it's disabled (might have recovered)
    // Only skip if we've confirmed it's unavailable
    if (!this.isEnabled && this.availabilityChecked) {
      // Already checked and confirmed unavailable, skip silently
      console.debug(
        "[CONVERSATION] Storage disabled, skipping message storage."
      );
      return;
    }

    console.log(
      `[CONVERSATION] Attempting to store message: "${message.text.substring(
        0,
        30
      )}..."`
    );

    try {
      // Generate embedding for the message text
      const embedding = await memoryService.generateEmbedding(message.text);

      // Prepare metadata
      const fullMetadata: ConversationMetadata = {
        sessionId: this.sessionId,
        persona: metadata?.persona || "default",
        toolsUsed: metadata?.toolsUsed || [],
        deviceType: metadata?.deviceType || "desktop",
        timestamp: message.timestamp || Date.now(),
        ...metadata,
      };

      // Store in Chroma
      // Convert Sender enum to string (Sender.USER = 'ADMIN', Sender.LUCA = 'LUCA')
      // Handle case where Sender might not be imported correctly
      let senderString = "unknown";
      if (typeof Sender !== "undefined") {
        senderString =
          message.sender === Sender.USER
            ? "user"
            : message.sender === Sender.LUCA
            ? "luca"
            : message.sender === Sender.SYSTEM
            ? "system"
            : "unknown";
      } else {
        // Fallback: check string value directly
        const senderValue = message.sender as string;
        senderString =
          senderValue === "ADMIN" || senderValue === "USER"
            ? "user"
            : senderValue === "LUCA"
            ? "luca"
            : senderValue === "SYSTEM"
            ? "system"
            : "unknown";
      }

      await chromaService.addConversation(
        {
          text: message.text,
          sender: senderString,
          timestamp: message.timestamp || Date.now(),
          metadata: fullMetadata,
        },
        embedding
      );

      const preview = message.text.substring(0, 50);
      console.log(
        `[CONVERSATION] ✓ Stored message in Chroma DB: "${preview}${
          message.text.length > 50 ? "..." : ""
        }"`
      );

      // Invalidate cache when new message is stored (results may change)
      this.invalidateCache();
    } catch (e: any) {
      console.error("[CONVERSATION] Failed to store message:", e.message);
      // Don't throw - we don't want to break the app if storage fails
    }
  }

  /**
   * Store multiple messages (batch)
   */
  async storeMessages(
    messages: Message[],
    metadata?: Partial<ConversationMetadata>
  ): Promise<void> {
    if (!this.isEnabled) return;

    // Store messages sequentially (Chroma can handle batches, but we'll do one at a time for now)
    for (const message of messages) {
      await this.storeMessage(message, metadata);
      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Search conversations by query (for RAG)
   * Now with caching for improved performance
   */
  async searchConversations(
    query: string,
    limit: number = 5
  ): Promise<
    Array<{
      text: string;
      sender: string;
      timestamp: number;
      metadata: ConversationMetadata;
      relevance: number; // Lower distance = more relevant
    }>
  > {
    if (!this.isEnabled) {
      return [];
    }

    // Generate cache key
    const cacheKey = `${query.toLowerCase().trim()}:${limit}`;

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      // Cache hit!
      this.cacheStats.hits++;
      const hitRate = (
        (this.cacheStats.hits /
          (this.cacheStats.hits + this.cacheStats.misses)) *
        100
      ).toFixed(1);
      console.log(
        `[CONVERSATION] ✅ Cache HIT for query: "${query.substring(
          0,
          40
        )}..." (${hitRate}% hit rate)`
      );
      return cached.results;
    }

    // Cache miss - perform actual search
    this.cacheStats.misses++;
    const startTime = now;

    try {
      // Generate embedding for query
      const queryEmbedding = await memoryService.generateEmbedding(query);

      // Search Chroma
      const results = await chromaService.queryConversations(
        queryEmbedding,
        query,
        limit
      );

      // Format results
      const formattedResults = results.map((result) => ({
        text: result.text,
        sender: result.metadata?.sender || "unknown",
        timestamp: result.metadata?.timestamp || 0,
        metadata: result.metadata as ConversationMetadata,
        relevance: result.distance ? 1 - result.distance : 1, // Convert distance to relevance score
      }));

      // Cache the results
      this.setCacheEntry(cacheKey, formattedResults);

      // Log performance
      const searchTime = Date.now() - startTime;
      const hitRate = (
        (this.cacheStats.hits /
          (this.cacheStats.hits + this.cacheStats.misses)) *
        100
      ).toFixed(1);
      console.log(
        `[CONVERSATION] 🔍 Cache MISS for query: "${query.substring(
          0,
          40
        )}..." | Search time: ${searchTime}ms | Hit rate: ${hitRate}%`
      );

      return formattedResults;
    } catch (e: any) {
      console.error(
        "[CONVERSATION] Failed to search conversations:",
        e.message
      );
      return [];
    }
  }

  /**
   * Get recent conversations (for context)
   */
  async getRecentConversations(limit: number = 10): Promise<Message[]> {
    // FALLBACK: Read from LocalStorage if Chroma is disabled or fails
    const getFromLocalStorage = (): Message[] => {
      try {
        const stored = localStorage.getItem("LUCA_CHAT_HISTORY_V1");
        if (stored) {
          const parsed = JSON.parse(stored) as Message[];
          // Sort by timestamp desc and take last 'limit'
          return parsed
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        }
      } catch (e) {
        console.warn("[CONVERSATION] Failed to read from localStorage:", e);
      }
      return [];
    };

    if (!this.isEnabled) {
      console.warn(
        "[CONVERSATION] Chroma disabled, falling back to localStorage."
      );
      return getFromLocalStorage();
    }

    try {
      const result = await chromaService.getAllConversations(limit, 0);

      return result.results.map((item) => ({
        id: item.id,
        text: item.text,
        sender: (item.metadata?.sender === "user"
          ? Sender.USER
          : Sender.LUCA) as Sender,
        timestamp: item.metadata?.timestamp || Date.now(),
      }));
    } catch (e: any) {
      console.error(
        "[CONVERSATION] Failed to get recent conversations from Chroma:",
        e.message
      );
      console.log("[CONVERSATION] Falling back to localStorage due to error.");
      return getFromLocalStorage();
    }
  }

  /**
   * Get conversation context for RAG (relevant past conversations)
   */
  async getConversationContext(
    currentQuery: string,
    limit: number = 5
  ): Promise<string> {
    const relevantConversations = await this.searchConversations(
      currentQuery,
      limit
    );

    if (relevantConversations.length === 0) {
      return "";
    }

    // Format as context string
    const contextParts = relevantConversations.map((conv, index) => {
      const senderLabel = conv.sender === "user" ? "User" : "LUCA";
      const date = new Date(conv.timestamp).toLocaleDateString();
      return `[${date}] ${senderLabel}: ${conv.text}`;
    });

    return `\n\n--- RELEVANT PAST CONVERSATIONS ---\n${contextParts.join(
      "\n\n"
    )}\n--- END PAST CONVERSATIONS ---\n`;
  }

  /**
   * Set session ID (useful for tracking across app restarts)
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Cache management methods
   */
  private setCacheEntry(
    key: string,
    results: Array<{
      text: string;
      sender: string;
      timestamp: number;
      metadata: ConversationMetadata;
      relevance: number;
    }>
  ): void {
    // Evict old entries if cache is full
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry();
    }

    this.queryCache.set(key, {
      results,
      timestamp: Date.now(),
    });
  }

  private evictOldestCacheEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    // Find oldest entry
    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    // Remove oldest entry
    if (oldestKey) {
      this.queryCache.delete(oldestKey);
      this.cacheStats.evictions++;
      console.debug(
        `[CONVERSATION] 🗑️ Cache eviction: removed "${oldestKey.substring(
          0,
          40
        )}..."`
      );
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        this.queryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `[CONVERSATION] 🧹 Cache cleanup: removed ${cleaned} expired entries`
      );
    }
  }

  private invalidateCache(): void {
    const cacheSize = this.queryCache.size;
    this.queryCache.clear();
    if (cacheSize > 0) {
      console.log(
        `[CONVERSATION] 🔄 Cache invalidated: cleared ${cacheSize} entries (new message stored)`
      );
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    size: number;
    maxSize: number;
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: total > 0 ? (this.cacheStats.hits / total) * 100 : 0,
      evictions: this.cacheStats.evictions,
      size: this.queryCache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }

  /**
   * Clear cache manually (useful for testing or manual invalidation)
   */
  clearCache(): void {
    this.queryCache.clear();
    console.log("[CONVERSATION] 🗑️ Cache manually cleared");
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
export default conversationService;
