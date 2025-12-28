/**
 * 🎯 Luca Advanced Trading Types
 * Based on NoFx schema with Luca enhancements
 */

// ============================================================================
// Enums
// ============================================================================

export enum TradingMode {
  DEMO = "DEMO",
  REAL = "REAL",
}

export enum TradeAction {
  OPEN_LONG = "open_long",
  OPEN_SHORT = "open_short",
  CLOSE_LONG = "close_long",
  CLOSE_SHORT = "close_short",
  HOLD = "hold",
  WAIT = "wait",
}

export enum DebatePersonality {
  BULL = "bull",
  BEAR = "bear",
  ANALYST = "analyst",
  RISK_MANAGER = "risk_manager",
  CONTRARIAN = "contrarian",
}

export enum CoinSourceType {
  STATIC = "static",
  AI500 = "ai500",
  OI_TOP = "oi_top",
  VOLUME_TOP = "volume_top",
  MIXED = "mixed",
}

export enum AutomationMode {
  MANUAL = "MANUAL",
  SEMI_AUTO = "SEMI_AUTO",
  FULL_AUTO = "FULL_AUTO",
}

export enum ScheduleType {
  ON_DEMAND = "ON_DEMAND",
  INTERVAL = "INTERVAL",
  CRON = "CRON",
}

// ============================================================================
// Exchange & Account
// ============================================================================

export interface ExchangeCredentials {
  exchange: string;
  apiKey: string;
  secretKey: string;
  passphrase?: string; // For OKX
  testnet?: boolean;
}

export interface AccountInfo {
  totalEquity: number;
  availableBalance: number;
  unrealizedPnL: number;
  totalPnL: number;
  totalPnLPct: number;
  marginUsed: number;
  marginUsedPct: number;
  positionCount: number;
}

export interface PositionInfo {
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  markPrice: number;
  quantity: number;
  leverage: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  peakPnLPct: number;
  liquidationPrice: number;
  marginUsed: number;
  updateTime: number;
}

export interface OrderInfo {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP_LOSS" | "TAKE_PROFIT";
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: "OPEN" | "FILLED" | "CANCELLED" | "EXPIRED";
  filledQuantity?: number;
  avgPrice?: number;
  timestamp: number;
}

// ============================================================================
// Market Data
// ============================================================================

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  priceChange1h: number;
  priceChange4h: number;
  priceChange24h: number;
  currentEMA20: number;
  currentEMA50: number;
  currentMACD: {
    macd: number;
    signal: number;
    histogram: number;
  };
  currentRSI7: number;
  currentRSI14: number;
  currentATR14: number;
  openInterest?: {
    latest: number;
    average: number;
  };
  fundingRate?: number;
  volume24h?: number;
}

export interface TimeframeData {
  timeframe: string;
  klines: Kline[];
  midPrices: number[];
  ema20Values: number[];
  ema50Values: number[];
  macdValues: number[];
  rsi7Values: number[];
  rsi14Values: number[];
  volume: number[];
  atr14: number;
}

// ============================================================================
// Strategy
// ============================================================================

export interface IndicatorConfig {
  rsi: {
    enabled: boolean;
    period: number;
    overbought: number;
    oversold: number;
  };
  macd: {
    enabled: boolean;
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
  ema: {
    enabled: boolean;
    periods: number[];
  };
  atr: {
    enabled: boolean;
    period: number;
  };
  enableQuantData?: boolean;
  quantDataAPIURL?: string;
}

export interface RiskControlConfig {
  maxPositions: number;
  positionSizePercent: number;
  btcEthLeverage: number;
  altcoinLeverage: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxDrawdownPercent: number;
  dailyLossLimitPercent?: number;
  trailingStopEnabled?: boolean;
  trailingStopPercent?: number;
}

export interface CoinSourceConfig {
  sourceType: CoinSourceType;
  staticCoins?: string[];
  coinPoolAPIURL?: string;
  oiTopAPIURL?: string;
  useCoinPool?: boolean;
  useOITop?: boolean;
  limit?: number;
}

export interface AutomationConfig {
  mode: AutomationMode;
  minConsensusConfidence: number;
  aiLearningEnabled: boolean;
  requireApprovalAboveSize?: number;
}

export interface ScheduleConfig {
  type: ScheduleType;
  intervalMinutes?: number;
  cronExpression?: string;
  timezone?: string;
}

export interface TradingStrategy {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  coinSource: CoinSourceConfig;
  indicators: IndicatorConfig;
  riskControl: RiskControlConfig;
  automation: AutomationConfig;
  schedule: ScheduleConfig;
  promptVariant: "balanced" | "aggressive" | "conservative";
  customPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// AI Decision
// ============================================================================

export interface TradeDecision {
  symbol: string;
  action: TradeAction;
  confidence: number;
  leverage?: number;
  positionPct?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
}

export interface FullDecision {
  systemPrompt: string;
  userPrompt: string;
  cotTrace: string; // Chain of Thought
  decisions: TradeDecision[];
  rawResponse: string;
  timestamp: number;
  aiRequestDurationMs: number;
}

// ============================================================================
// Debate
// ============================================================================

export interface DebateParticipant {
  id: string;
  aiModelId: string;
  aiModelName: string;
  provider: string;
  personality: DebatePersonality;
  color: string;
  speakOrder: number;
}

export interface DebateMessage {
  id: string;
  sessionId: string;
  participantId: string;
  participantName?: string; // Enhanced for UI
  participantPersonality?: DebatePersonality; // Enhanced for UI
  round: number;
  reasoning: string;
  decisions: TradeDecision[];
  timestamp: number;
}

export interface DebateVote {
  id: string;
  sessionId: string;
  aiModelId: string;
  aiModelName: string;
  decisions: TradeDecision[];
  confidence: number;
  reasoning: string;
}

export interface DebateConsensus {
  symbol: string;
  action: TradeAction;
  confidence: number;
  leverage: number;
  positionPct: number;
  stopLoss: number;
  takeProfit: number;
  voteCount: number;
  totalVotes: number;
  hasConsensus: boolean;
  spread?: number;
}

export interface DebateSession {
  id: string;
  userId?: string;
  name: string;
  strategyId: string;
  symbol: string;
  maxRounds: number;
  currentRound: number;
  intervalMinutes: number;
  promptVariant: string;
  autoExecute: boolean;
  traderId?: string;
  status: "pending" | "in_progress" | "voting" | "completed" | "cancelled";
  participants: DebateParticipant[];
  messages: DebateMessage[];
  votes: DebateVote[];
  consensus?: DebateConsensus[];
  enableOIRanking?: boolean;
  oiRankingLimit?: number;
  oiDuration?: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Backtest
// ============================================================================

export interface BacktestConfig {
  runId: string;
  strategyId: string;
  symbol: string;
  startTime: number;
  endTime: number;
  initialBalance: number;
  leverage: number;
  positionSizePercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  timeframes: string[];
  customPrompt?: string;
}

export interface BacktestTrade {
  id: string;
  runId: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: number;
  exitTime: number;
  realizedPnL: number;
  pnlPercent: number;
  exitReason: "take_profit" | "stop_loss" | "signal" | "end_of_test";
  aiDecision?: TradeDecision;
}

export interface BacktestMetrics {
  totalReturn: number;
  totalReturnPct: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldTime: number;
}

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  status: "pending" | "running" | "paused" | "completed" | "failed";
  progress: number;
  metrics?: BacktestMetrics;
  equityCurve: { time: number; equity: number }[];
  trades: BacktestTrade[];
  decisions: FullDecision[];
  label?: string;
  createdAt: number;
  completedAt?: number;
}

// ============================================================================
// Competition
// ============================================================================

export interface CompetitionAgent {
  id: string;
  name: string;
  strategyId: string;
  aiModelId: string;
  startingBalance: number;
  currentEquity: number;
  totalPnL: number;
  totalPnLPct: number;
  tradeCount: number;
  winRate: number;
  rank: number;
  isActive: boolean;
}

export interface Competition {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: "pending" | "running" | "completed";
  agents: CompetitionAgent[];
  leaderboard: {
    agentId: string;
    rank: number;
    equity: number;
    pnlPct: number;
  }[];
  createdAt: number;
}

// ============================================================================
// Trading Context (for AI)
// ============================================================================

export interface TradingContext {
  currentTime: string;
  runtimeMinutes: number;
  callCount: number;
  account: AccountInfo;
  positions: PositionInfo[];
  candidateCoins: { symbol: string; sources: string[] }[];
  promptVariant?: string;
  tradingStats?: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdownPct: number;
  };
  recentOrders?: {
    symbol: string;
    side: string;
    entryPrice: number;
    exitPrice: number;
    realizedPnL: number;
    pnlPct: number;
    entryTime: string;
    exitTime: string;
    holdDuration: string;
  }[];
  marketData: Record<string, MarketData>;
  oiRankingData?: {
    rank: number;
    symbol: string;
    oiDeltaPercent: number;
    priceDeltaPercent: number;
  }[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface TradingAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

export interface CreateDebateRequest {
  name: string;
  strategyId: string;
  symbol?: string;
  maxRounds?: number;
  intervalMinutes?: number;
  promptVariant?: string;
  autoExecute?: boolean;
  traderId?: string;
  participants: {
    aiModelId: string;
    personality: DebatePersonality;
  }[];
  enableOIRanking?: boolean;
  oiRankingLimit?: number;
  oiDuration?: string;
}

export interface TraderInfo {
  trader_id: string;
  trader_name: string;
  ai_model: string;
  is_running: boolean;
  strategies: string[];
  strategy_id?: string; // Added for UI
  exchange_id?: string; // Added for UI
  total_pnl: number;
  win_rate: number;
  trade_count: number;
  config?: {
    maxLeverage: number;
    riskPerTrade: number;
    maxPositions?: number;
  };
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  apiKey?: string;
  customApiUrl?: string;
}

export interface Exchange {
  id: string;
  name: string;
  exchange_type: string;
  account_name?: string;
  enabled: boolean;
  api_key?: string;
  secret_key?: string;
  passphrase?: string;
  testnet?: boolean;
  asterUser?: string;
  hyperliquidWalletAddr?: string;
  lighterApiKeyIndex?: number;
}

export type Strategy = TradingStrategy; // Alias for UI compatibility

export interface ExecuteTradeRequest {
  exchange: string;
  symbol: string;
  action: TradeAction;
  quantity?: number;
  positionPercent?: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
}

// ============================================================================
// Persona UI Config (Luca Enhancement)
// ============================================================================

export const PERSONA_UI_CONFIG = {
  RUTHLESS: {
    primary: "#dc2626",
    accent: "#f87171",
    glow: "rgba(220, 38, 38, 0.4)",
    debateColor: "#ef4444",
  },
  COLD: {
    primary: "#0ea5e9",
    accent: "#38bdf8",
    glow: "rgba(14, 165, 233, 0.4)",
    debateColor: "#06b6d4",
  },
  BALANCED: {
    primary: "#a855f7",
    accent: "#c084fc",
    glow: "rgba(168, 85, 247, 0.4)",
    debateColor: "#8b5cf6",
  },
  UNFILTERED: {
    primary: "#f97316",
    accent: "#fb923c",
    glow: "rgba(249, 115, 22, 0.4)",
    debateColor: "#ea580c",
  },
} as const;

export const PERSONALITY_COLORS: Record<DebatePersonality, string> = {
  [DebatePersonality.BULL]: "#22c55e",
  [DebatePersonality.BEAR]: "#ef4444",
  [DebatePersonality.ANALYST]: "#3b82f6",
  [DebatePersonality.RISK_MANAGER]: "#f59e0b",
  [DebatePersonality.CONTRARIAN]: "#8b5cf6",
};

export const PERSONALITY_EMOJIS: Record<DebatePersonality, string> = {
  [DebatePersonality.BULL]: "🐂",
  [DebatePersonality.BEAR]: "🐻",
  [DebatePersonality.ANALYST]: "📊",
  [DebatePersonality.RISK_MANAGER]: "🛡️",
  [DebatePersonality.CONTRARIAN]: "🔄",
};
