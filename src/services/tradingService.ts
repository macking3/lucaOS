import { memoryService } from "./memoryService";

// Import neuralLinkManager for mobile sync
let neuralLinkManager: any = null;
try {
  import("./neuralLink/manager").then((module) => {
    neuralLinkManager = module.neuralLinkManager;
  });
} catch (e) {
  console.warn("[TRADING] Neural Link Manager not available for sync");
}

/**
 * 🔌 Trading Service
 *
 * Frontend service to communicate with the Cortex Trading API.
 * Handles Exchanges, Strategies, and Market Analysis.
 */

// Base API URL - assumes proxy or same-origin in production
const API_BASE = "/api/trading";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

export interface RiskSettings {
  enabled: boolean;
  dailyLossLimit: number; // Percentage (e.g. -5 for -5%)
  maxDrawdown: number; // Percentage
}

export const tradingService = {
  // ============================================================================
  // Exchange Management
  // ============================================================================

  async getConnectedExchanges() {
    try {
      const response = await fetch(`${API_BASE}/exchange/connected`);
      const data = await response.json();
      return data.exchanges || [];
    } catch (error) {
      console.error("Failed to fetch exchanges:", error);
      return [];
    }
  },

  async connectExchange(config: {
    exchange: string;
    apiKey: string;
    secretKey: string;
    passphrase?: string;
    testnet?: boolean;
  }) {
    const response = await fetch(`${API_BASE}/exchange/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async disconnectExchange(exchangeId: string) {
    const response = await fetch(`${API_BASE}/exchange/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exchange: exchangeId }),
    });
    return response.json();
  },

  async getBalance(exchangeId: string) {
    try {
      const response = await fetch(
        `${API_BASE}/exchange/${exchangeId}/balance`
      );
      const data = await response.json();
      if (data.success && data.balance) {
        return {
          total: parseFloat(
            data.balance.totalWalletBalance || data.balance.totalEquity || "0"
          ),
          free: parseFloat(data.balance.availableBalance || "0"),
        };
      }
      return { total: 0, free: 0 };
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      return { total: 0, free: 0 };
    }
  },

  // ============================================================================
  // Strategy Management
  // ============================================================================

  async getStrategies() {
    try {
      const response = await fetch(`${API_BASE}/strategy`);
      const data = await response.json();
      return data.strategies || [];
    } catch (error) {
      console.error("Failed to fetch strategies:", error);
      return [];
    }
  },

  async saveStrategy(strategy: any) {
    const method =
      strategy.id && !strategy.id.startsWith("new_") ? "PUT" : "POST";
    const url =
      method === "PUT"
        ? `${API_BASE}/strategy/${strategy.id}`
        : `${API_BASE}/strategy`;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(strategy),
    });
    return response.json();
  },

  async deleteStrategy(id: string) {
    const response = await fetch(`${API_BASE}/strategy/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },

  // ============================================================================
  // Market Analysis
  // ============================================================================

  async analyzeSymbol(exchange: string, symbol: string, timeframe = "1h") {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exchange, symbol, timeframe }),
    });
    return response.json();
  },

  async getMarketPrice(exchange: string, symbol: string) {
    const response = await fetch(
      `${API_BASE}/exchange/${exchange}/price/${encodeURIComponent(symbol)}`
    );
    return response.json();
  },

  // ============================================================================
  // Trading Operations
  // ============================================================================

  async getPositions(exchange: string) {
    const response = await fetch(`${API_BASE}/exchange/${exchange}/positions`);
    const data = await response.json();
    return data.positions || [];
  },

  async syncPositionsToMobile(exchange: string) {
    const positions = await this.getPositions(exchange);
    if (neuralLinkManager) {
      neuralLinkManager.syncState("portfolio_update", {
        exchange,
        positions,
        timestamp: Date.now(),
      });
      return { success: true, count: positions.length };
    }
    return { success: false, error: "Neural Link unavailable" };
  },

  async executeOrder(exchange: string, order: any) {
    // 1. Risk Check
    const riskCheck = await this.checkRiskCompliance(exchange);
    if (!riskCheck.allowed) {
      if (neuralLinkManager) {
        neuralLinkManager.syncState("alert", {
          message: `Trade Blocked: ${riskCheck.reason}`,
        });
      }
      return { success: false, error: `Risk Block: ${riskCheck.reason}` };
    }

    const response = await fetch(`${API_BASE}/exchange/${exchange}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const result = await response.json();

    if (result.success || result.orderId) {
      // Log to Memory
      const memoryValue = `EXECUTED ${order.side} ${order.quantity} ${order.symbol} (${order.type})`;
      memoryService
        .saveMemory(`pnl_trade_${Date.now()}`, memoryValue, "AGENT_STATE", true)
        .catch((e) => console.warn("Failed to log trade memory", e));

      // Sync to Mobile
      if (neuralLinkManager) {
        neuralLinkManager.syncState("trading_alert", {
          type: "execution",
          data: {
            symbol: order.symbol,
            side: order.side,
            amount: order.quantity,
            price: "MARKET", // Simplified for now
          },
        });
      }
    }
    return result;
  },

  // ============================================================================
  // Debate & AI
  // ============================================================================

  async getDebates() {
    try {
      const response = await fetch(`${API_BASE}/debate`);
      const data = await response.json();
      return data.debates || [];
    } catch (error) {
      console.error("Failed to fetch debates:", error);
      return [];
    }
  },

  async getDebateDetails(id: string) {
    const response = await fetch(`${API_BASE}/debate/${id}`);
    const data = await response.json();
    return data.session;
  },

  async startDebate(config: any) {
    const response = await fetch(`${API_BASE}/debate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const result = await response.json();

    if (result.success || result.debateId) {
      memoryService
        .saveMemory(
          `debate_${Date.now()}`,
          `STARTED DEBATE: ${config.symbol} (${config.strategyId || "Manual"})`,
          "SESSION_STATE"
        )
        .catch((e) => console.warn("Failed to log debate memory", e));

      // Sync to Mobile
      if (neuralLinkManager) {
        neuralLinkManager.syncState("trading_alert", {
          type: "debate_started",
          data: {
            symbol: config.symbol,
            strategy: config.strategyId || "Manual",
            debateId: result.debateId,
          },
        });
      }
    }
    return result;
  },

  subscribeToDebate(id: string, onEvent: (event: any) => void) {
    const eventSource = new EventSource(`${API_BASE}/debate/${id}/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (e) {
        console.error("Failed to parse SSE event", e);
      }
    };

    eventSource.onerror = (e) => {
      console.error("SSE connection error", e);
      eventSource.close();
    };

    return () => eventSource.close();
  },

  // ============================================================================
  // Backtest
  // ============================================================================

  async runBacktest(config: any) {
    const response = await fetch(`${API_BASE}/../backtest/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async getBacktestStatus(id: string) {
    const response = await fetch(`${API_BASE}/../backtest/${id}/status`);
    return response.json();
  },

  async getBacktestResults(id: string) {
    const response = await fetch(`${API_BASE}/../backtest/${id}/results`);
    return response.json();
  },

  async stopBacktest(id: string) {
    const response = await fetch(`${API_BASE}/../backtest/${id}/stop`, {
      method: "POST",
    });
    return response.json();
  },

  // ============================================================================
  // Competition (Simulated Backend)
  // ============================================================================

  async getLeaderboard() {
    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return dynamic mock data
    return [
      {
        trader_id: "1",
        trader_name: "ALPHA_PREDATOR",
        avatar: "🐺",
        total_pnl_pct: 128.5 + (Math.random() * 2 - 1),
        win_rate: 72,
        trade_count: 156,
        rank: 1,
        streak: 8,
        trend: "up",
        exchange: "Binance",
        ai_model: "GPT-4 Turbo",
      },
      {
        trader_id: "2",
        trader_name: "SNIPER_BOT_V3",
        avatar: "🎯",
        total_pnl_pct: 95.2 + (Math.random() * 2 - 1),
        win_rate: 68,
        trade_count: 89,
        rank: 2,
        streak: 5,
        trend: "up",
        exchange: "Bybit",
        ai_model: "Claude 3.5",
      },
      {
        trader_id: "3",
        trader_name: "WHALE_HUNTER",
        avatar: "🐋",
        total_pnl_pct: 82.1 + (Math.random() * 2 - 1),
        win_rate: 61,
        trade_count: 234,
        rank: 3,
        streak: 3,
        trend: "down",
        exchange: "OKX",
        ai_model: "DeepSeek V3",
      },
      {
        trader_id: "4",
        trader_name: "NEURAL_TRADER",
        avatar: "🧠",
        total_pnl_pct: 67.8 + (Math.random() * 2 - 1),
        win_rate: 58,
        trade_count: 112,
        rank: 4,
        streak: 0,
        trend: "flat",
        exchange: "Binance",
        ai_model: "Llama 3",
      },
    ]
      .sort((a, b) => b.total_pnl_pct - a.total_pnl_pct)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  },

  async getCompetitionStats() {
    return {
      totalTraders: 128,
      totalVolume: "$4.2M",
      avgROI: 34.5 + Math.random() * 0.5,
      topPerformer: "ALPHA_PREDATOR",
    };
  },

  // ============================================================================
  // Emergency / Risk
  // ============================================================================

  saveRiskSettings(settings: RiskSettings) {
    localStorage.setItem("LUCA_RISK_SETTINGS", JSON.stringify(settings));
  },

  getRiskSettings(): RiskSettings {
    try {
      const stored = localStorage.getItem("LUCA_RISK_SETTINGS");
      return stored
        ? JSON.parse(stored)
        : { enabled: false, dailyLossLimit: -5, maxDrawdown: -10 };
    } catch {
      return { enabled: false, dailyLossLimit: -5, maxDrawdown: -10 };
    }
  },

  async checkRiskCompliance(
    exchange: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const settings = this.getRiskSettings();
    if (!settings.enabled) return { allowed: true };
    // Simplified mock check
    return { allowed: true };
  },

  async closePosition(exchange: string, symbol: string) {
    const positions = await this.getPositions(exchange);
    const pos = positions.find((p: any) => p.symbol === symbol);

    if (!pos) return { success: false, error: "Position not found" };

    return this.executeOrder(exchange, {
      symbol: pos.symbol,
      side: pos.side === "LONG" ? "SELL" : "BUY",
      type: "MARKET",
      quantity: Math.abs(pos.size),
    });
  },

  async executeDebate(id: string) {
    const response = await fetch(`${API_BASE}/debate/${id}/execute`, {
      method: "POST",
    });
    return response.json();
  },

  async closeAllPositions(exchange: string) {
    const positions = await this.getPositions(exchange);
    const results = [];
    for (const pos of positions) {
      const result = await this.executeOrder(exchange, {
        symbol: pos.symbol,
        side: pos.side === "LONG" ? "SELL" : "BUY",
        type: "MARKET",
        quantity: Math.abs(pos.size),
      });
      results.push(result);
    }
    return results;
  },
};
