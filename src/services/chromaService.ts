import { CORTEX_URL } from "../config/api";
import { settingsService } from "./settingsService";

const CHROMA_BRIDGE_URL = CORTEX_URL; // Updated to Cortex Port

interface ChromaResult {
  id: string /** Content of the memory/doc */;
  text: string;
  metadata: Record<string, any>;
  distance?: number;
}

interface ConversationMessage {
  text: string;
  sender: "user" | "luca" | string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MemoryItem {
  id?: string;
  key: string;
  value: string;
  category?: string;
  metadata?: Record<string, any>;
}

class ChromaService {
  private bridgeUrl: string;
  private isAvailable: boolean = false;

  constructor(url: string = CHROMA_BRIDGE_URL) {
    this.bridgeUrl = url;
    this.checkAvailability();
  }

  /**
   * Check if Cortex bridge is available via /health
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.bridgeUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      this.isAvailable = response.ok;
      if (this.isAvailable) {
        console.log("[CORTEX] Memory Bridge is available");
      }
      return this.isAvailable;
    } catch (e: any) {
      this.isAvailable = false;
      // Only warn if it's not a timeout
      if (!e.name || e.name !== "TimeoutError") {
        // console.warn('[CORTEX] Bridge not available:', e.message);
        // Suppress warning to avoid console spam, as user knows
      }
      return false;
    }
  }

  /**
   * Add conversation (Just generic memory ingest for now)
   */
  async addConversation(
    message: ConversationMessage,
    embedding?: number[]
  ): Promise<{ success: boolean; id?: string }> {
    // Map conversation to Memory Ingest
    if (!this.isAvailable) return { success: false };

    // Format: "User: Hello" or "Luca: Hi"
    const text = `${message.sender}: ${message.text}`;
    return this.ingestText(text, {
      ...message.metadata,
      timestamp: message.timestamp,
      type: "conversation",
    });
  }

  /**
   * Store key-value memory
   */
  async addMemory(
    memory: MemoryItem,
    embedding?: number[]
  ): Promise<{ success: boolean; id?: string }> {
    if (!this.isAvailable) return { success: false };

    const text = `Memory [${memory.category || "FACT"}] ${memory.key}: ${
      memory.value
    }`;
    return this.ingestText(text, {
      ...memory.metadata,
      key: memory.key,
      category: memory.category,
    });
  }

  /**
   * Core Ingest Method -> Cortex /memory/ingest
   */
  private async ingestText(text: string, metadata: any) {
    try {
      const response = await fetch(`${this.bridgeUrl}/memory/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          metadata: metadata,
        }),
      });

      if (!response.ok) throw new Error(response.statusText);
      return await response.json();
    } catch (e: any) {
      console.error("[CORTEX] Memory Ingest Failed:", e.message);
      return { success: false };
    }
  }

  /**
   * Query memories -> Cortex /memory/query
   */
  async queryMemories(
    queryEmbedding?: number[], // specific embedding not supported in simple proxy
    queryText?: string,
    nResults: number = 5
  ): Promise<ChromaResult[]> {
    if (!this.isAvailable || !queryText) return [];

    try {
      const response = await fetch(`${this.bridgeUrl}/memory/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          mode: "hybrid", // Use Hybrid search (Keywords + Vector)
        }),
      });

      if (!response.ok) throw new Error(response.statusText);

      const data = await response.json();
      // Map Cortex result string back to pseudo-objects if needed,
      // but LightRAG returns a string block.
      // For compatibility, we wrap the result in a single item if it's a string.
      if (typeof data.result === "string") {
        return [
          {
            id: "summary",
            text: data.result,
            metadata: {},
          },
        ];
      }
      return []; // Fallback
    } catch (e: any) {
      console.error("[CORTEX] Memory Query Failed:", e.message);
      return [];
    }
  }

  // Legacy support methods (Stubbed for compatibility)
  async queryConversations(
    queryEmbedding?: number[],
    queryText?: string,
    nResults: number = 5
  ): Promise<ChromaResult[]> {
    return [];
  }

  async getAllConversations(
    limit: number = 10,
    offset: number = 0
  ): Promise<{ results: ChromaResult[]; total: number }> {
    return { results: [], total: 0 };
  }

  getAvailable(): boolean {
    return this.isAvailable;
  }
}

export const chromaService = new ChromaService();
export default chromaService;
