/**
 * 🗣️ Trading Debate Service
 * 
 * Manages the AI Debate Engine for trading decisions.
 * Orchestrates multi-agent debates with distinct personalities.
 * 
 * Features:
 * - Multi-round debates
 * - 5 distinct AI personalities (Bull, Bear, Analyst, Risk, Contrarian)
 * - Real-time SSE updates
 * - Voting & Consensus mechanism
 * - Direct Google Gemini integration
 */

import { GoogleGenAI } from '@google/genai';
import { EventEmitter } from 'events';
import exchangeManager from './exchangeManager.js';
import indicatorService from './indicatorService.js';

// ============================================================================
// Constants & Configuration
// ============================================================================

const DEBATE_MODEL = 'gemini-2.5-flash-latest'; // Gemini 2.5 Flash

export const PERSONALITY_EMOJIS = {
  bull: '🐂',
  bear: '🐻',
  analyst: '📊',
  risk_manager: '🛡️',
  contrarian: '🔄'
};

const PROMPT_VARIANTS = {
  balanced: "Be objective and balanced. Weigh risks and rewards equally.",
  aggressive: "Be aggressive. Focus on maximum profit potential. Tolerate higher risk.",
  conservative: "Be conservative. Prioritize capital preservation. Avoid uncertain setups."
};

const PERSONALITIES = {
  BULL: {
    id: 'bull',
    name: 'Bullish Bob',
    role: 'Bull',
    bias: 'optimistic',
    desc: 'Focuses on upside potential, momentum, and growth signals.',
    prompt: 'You are a Permabull Trader. Focus on bullish signals, upward momentum, and buy opportunities. Minimize risks. Use high energy and optimism.'
  },
  BEAR: {
    id: 'bear',
    name: 'Bearish Bill',
    role: 'Bear',
    bias: 'pessimistic',
    desc: 'Focuses on downside risks, overvaluation, and sell signals.',
    prompt: 'You are a Permabear Trader. Focus on bearish signals, crashes, and short opportunities. Highlight risks and overextension. Be skeptical and gloomy.'
  },
  ANALYST: {
    id: 'analyst',
    name: 'Alice Analyst',
    role: 'Analyst',
    bias: 'neutral',
    desc: 'Focuses on technical levels, data patterns, and market structure.',
    prompt: 'You are a Technical Analyst. Focus on support/resistance, chart patterns, and indicators. Be objective, precise, and data-driven. Do not take sides without evidence.'
  },
  RISK_MANAGER: {
    id: 'risk',
    name: 'Roger Risk',
    role: 'Risk Manager',
    bias: 'caution',
    desc: 'Focuses on capital preservation, position sizing, and stop losses.',
    prompt: 'You are a Risk Manager. Focus on protecting capital. Identify worst-case scenarios. Recommend strict stop-losses and small position sizes. Veto dangerous trades.'
  },
  CONTRARIAN: {
    id: 'contrarian',
    name: 'Connor Contrarian',
    role: 'Contrarian',
    bias: 'reverse',
    desc: 'Looks for crowded trades and sentiment extremes to bet against.',
    prompt: 'You are a Contrarian Trader. Look for opportunities to go against the herd. If everyone is bullish, find reasons to sell. If everyone is fearful, look to buy.'
  }
};

// ============================================================================
// Debate Manager
// ============================================================================

class DebateManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.activeDebates = new Set();
    
    // Initialize AI with new SDK
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
      console.log('[DebateService] AI Initialized with API Key (Gemini 2.5)');
    } else {
      console.warn('[DebateService] ⚠️ No API Key found (GEMINI_API_KEY). AI features will fail.');
    }
  }

  /**
   * Start a new debate session
   */
  async startDebate(config) {
    const {
      strategyId,
      symbol,
      exchange = 'binance',
      maxRounds = 3,
      participants = ['bull', 'bear', 'analyst', 'risk']
    } = config;

    const id = `debate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create session object
    const session = {
      id,
      strategyId,
      symbol,
      exchange,
      maxRounds,
      currentRound: 0,
      status: 'initializing',
      participants: participants.map(p => PERSONALITIES[p.toUpperCase()] || PERSONALITIES.ANALYST),
      messages: [],
      votes: [],
      marketData: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.sessions.set(id, session);
    this.activeDebates.add(id);

    // Start background process
    this.runDebate(id).catch(err => {
      console.error(`[DebateService] Debate ${id} failed:`, err);
      session.status = 'failed';
      session.error = err.message;
      this.emit('update', id, session);
    });

    return session;
  }

  /**
   * Main debate loop
   */
  async runDebate(id) {
    const session = this.sessions.get(id);
    if (!session) return;

    try {
      // 1. Fetch Context (Market Data)
      this.updateStatus(id, 'fetching_data');
      const analysis = await this.fetchContext(session.exchange, session.symbol);
      session.marketData = analysis;
      session.marketContext = indicatorService.formatForAI(analysis, session.symbol);

      this.updateStatus(id, 'in_progress');

      // 2. Run Rounds
      for (let round = 1; round <= session.maxRounds; round++) {
        session.currentRound = round;
        this.emit('update', id, session);

        console.log(`[DebateService] ${id} - Round ${round} starting`);

        // Each participant speaks
        for (const participant of session.participants) {
          await this.generateTurn(id, participant, round);
          // Small delay to prevent rate limits and feel natural
          await new Promise(r => setTimeout(r, 1000)); 
        }
      }

      // 3. Voting Phase
      this.updateStatus(id, 'voting');
      await this.collectVotes(id);

      // 4. Consensus & Conclusion
      this.calculateConsensus(id);
      this.updateStatus(id, 'completed');

    } catch (error) {
      console.error(`[DebateService] Error in debate ${id}:`, error);
      session.status = 'failed';
      session.error = error.message;
      this.emit('update', id, session);
    } finally {
      this.activeDebates.delete(id);
    }
  }

  /**
   * Generate a single turn for a participant
   */
  async generateTurn(debateId, participant, round) {
    const session = this.sessions.get(debateId);
    if (!this.genAI || !session) return;

    try {
      // New SDK API: ai.models.generateContent()
      const prompt = this.constructPrompt(session, participant, round);
      
      const result = await this.genAI.models.generateContent({
        model: DEBATE_MODEL,
        contents: prompt
      });
      
      const content = result.text;

      session.messages.push({
        id: `msg_${Date.now()}_${participant.id}`,
        participantId: participant.id,
        participantName: participant.name,
        role: participant.role,
        content: content,
        timestamp: Date.now()
      });
      
      this.emit('message', session.id, session.messages[session.messages.length - 1]);

    } catch (error) {
      console.warn(`[DebateService] Turn failed for ${participant.name}: ${error.message}. Using MOCK response.`);
      
      // Mock AI Fallback
      let mockContent = "I am analyzing the data...";
      if (participant.id === 'bull') mockContent = "The trend is undeniably strong! Price action confirms a breakout. We must go long now!";
      if (participant.id === 'bear') mockContent = "This is a bull trap. Volume is declining while price rises. A crash is imminent.";
      if (participant.id === 'analyst') mockContent = "Technicals showing divergence. RSI is high but trend supports upside. Proceed with caution.";
      if (participant.id === 'risk') mockContent = "Volatility is too high. Suggest reducing position size. Stops must be tight.";
      
      session.messages.push({
        id: `msg_${Date.now()}_${participant.id}`,
        participantId: participant.id,
        participantName: participant.name,
        role: participant.role,
        content: `[MOCK] ${mockContent}`,
        timestamp: Date.now()
      });
      
      this.emit('message', session.id, session.messages[session.messages.length - 1]);
    }
    
    this.emit('update', session.id, session);
  }

  /**
   * Collect final votes from all participants
   */
  async collectVotes(debateId) {
    const session = this.sessions.get(debateId);
    if (!this.genAI) return;

    for (const participant of session.participants) {
      try {
        const prompt = this.constructVotePrompt(session, participant);
        
        // New SDK API
        const result = await this.genAI.models.generateContent({
          model: DEBATE_MODEL,
          contents: prompt
        });
        
        const text = result.text;
        
        let decision;
        try {
            // Parse XML or JSON
            const decisionMatch = text.match(/<decision>([\s\S]*?)<\/decision>/);
            if (decisionMatch) {
                const jsonStr = decisionMatch[1].trim();
                const decisions = JSON.parse(jsonStr);
                decision = Array.isArray(decisions) ? decisions[0] : decisions;
            } else {
                const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
                decision = JSON.parse(cleaned);
            }
        } catch (e) {
            decision = { action: 'wait', confidence: 0, reasoning: text.substring(0, 100) };
        }

        const vote = {
          participantId: participant.id,
          participantName: participant.name,
          ...decision,
          timestamp: Date.now()
        };

        session.votes.push(vote);
        this.emit('vote', debateId, vote);

      } catch (error) {
        console.warn(`[DebateService] Vote failed for ${participant.name}: ${error.message}. Using MOCK vote.`);
        
        const isBullish = ['bull', 'analyst'].includes(participant.id);
        const action = isBullish ? 'open_long' : 'open_short';
        
        const vote = {
          participantId: participant.id,
          participantName: participant.name,
          action: action,
          confidence: Math.floor(Math.random() * 30) + 60,
          leverage: 5,
          reasoning: "[MOCK] AI API unavailable. Generated fallback vote based on personality.",
          timestamp: Date.now()
        };
        
        session.votes.push(vote);
        this.emit('vote', debateId, vote);
      }
    }
    
    this.emit('update', debateId, session);
  }

  /**
   * Calculate final consensus from votes
   */
  /**
   * Calculate final consensus from votes
   */
  async calculateConsensus(debateId) {
    const session = this.sessions.get(debateId);
    if (!session.votes.length) return;

    let longScore = 0;
    let shortScore = 0;
    let totalConfidence = 0;

    session.votes.forEach(v => {
      const conf = v.confidence || 0;
      totalConfidence += conf;

      if (v.action === 'open_long' || v.action === 'buy') {
        longScore += conf;
      } else if (v.action === 'open_short' || v.action === 'sell') {
        shortScore += conf;
      }
    });

    // Simple consensus logic
    let verdict = 'wait';
    let finalConfidence = 0;
    const threshold = 60; // Configurable?

    if (longScore > shortScore && longScore > (totalConfidence * 0.5)) {
        verdict = 'open_long';
        finalConfidence = Math.round((longScore / totalConfidence) * 100);
    } else if (shortScore > longScore && shortScore > (totalConfidence * 0.5)) {
        verdict = 'open_short';
        finalConfidence = Math.round((shortScore / totalConfidence) * 100);
    }

    session.consensus = {
      verdict,
      confidence: finalConfidence,
      longScore,
      shortScore,
      totalVotes: session.votes.length
    };

    console.log(`[DebateService] Consensus for ${session.symbol}: ${verdict} (${finalConfidence}%)`);
    this.emit('consensus', debateId, session.consensus);

    // Auto-Execution Logic
    if (session.autoExecute && verdict !== 'wait' && finalConfidence >= 70) {
       this.executeTrade(session, verdict, finalConfidence);
    }
  }

  async executeTrade(session, verdict, confidence) {
      try {
          console.log(`[DebateService] 🤖 AUTO-EXECUTING ${verdict} on ${session.symbol}`);
          const quantity = 0.001; // Default fixed size for now (should come from strategy)
          const leverage = 5;

          if (verdict === 'open_long') {
              await exchangeManager.openLong(session.exchange, session.symbol, quantity, leverage);
          } else if (verdict === 'open_short') {
              await exchangeManager.openShort(session.exchange, session.symbol, quantity, leverage);
          }
          
          session.messages.push({
              id: `sys_${Date.now()}`,
              participantName: "System",
              role: "Executor",
              content: `✅ Auto-executed ${verdict} trade based on ${confidence}% consensus.`,
              timestamp: Date.now()
          });
          this.emit('update', session.id, session);

      } catch (e) {
          console.error(`[DebateService] Auto-execution failed: ${e.message}`);
          session.errors = session.errors || [];
          session.errors.push(`Auto-execution failed: ${e.message}`);
      }
  }

  /**
   * Manually execute the consensus result
   */
  async executeConsensus(debateId) {
    const session = this.sessions.get(debateId);
    if (!session) throw new Error('Debate not found');
    if (!session.consensus) throw new Error('No consensus reached yet');
    
    // logic similar to executeTrade but triggered manually
    return this.executeTrade(session, session.consensus.verdict, session.consensus.confidence);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================
  /**
   * Fetch market context (OHLCV + Indicators)
   */
  async fetchContext(exchangeId, symbol) {
    if (this.mockMode) {
        return {
             symbol,
             currentPrice: 95432.10,
             priceChange1h: 0.5,
             priceChange4h: 1.2,
             priceChange24h: 3.5,
             currentEMA20: 94800,
             currentEMA50: 94200,
             currentMACD: { macd: 150.5, signal: 100.2, histogram: 50.3 },
             currentRSI7: 72.5,
             currentRSI14: 65.4,
             currentATR14: 1250.0,
             bollingerBands: { upper: 96000, middle: 94800, lower: 93600 },
             volume: {
               current: 50000000,
               average: 45000000,
               ratio: 1.11
             },
             timestamp: Date.now(),
             // Extra fields for AI context
             trend: 'bullish',
             signals: ['Strong uptrend', 'RSI checking back', 'Volume accumulating'],
             summary: `Simulated market data for ${symbol}. Price at 95,432. Strong bullish trend detected.`
           };
    }
    
    // Use the new Multi-Timeframe Analysis
    try {
        console.log(`[DebateService] Fetching multi-TF context for ${symbol}...`);
        return await indicatorService.analyzeMultiTimeframe(symbol, ['5m', '1h', '4h']);
    } catch (error) {
        console.warn(`[DebateService] Failed to fetch multi-tf context: ${error.message}. Falling back to single.`);
        // Fallback
        const klines = await exchangeManager.getOHLCV(exchangeId, symbol, '1h');
        return indicatorService.analyzeSymbol(klines, symbol);
    }
  }

  constructPrompt(session, participant, round) {
    const context = session.marketContext;
    const history = session.messages.map(m => `${m.participantName} (${m.role}): ${m.content}`).join('\n\n');
    const variantInstruction = PROMPT_VARIANTS[session.promptVariant] || PROMPT_VARIANTS.balanced;

    return `
${participant.prompt}
Style Instruction: ${variantInstruction}

**Market Context for ${session.symbol}:**
${context}

**Debate History (Round ${round} of ${session.maxRounds}):**
${history || 'No established history yet. You are speaking first.'}

**Your Instruction:**
Analyze the market data and the debate history. Provide your perspective. 
If you agree with others, explain why. If you disagree, attack their arguments with logic and data. 
Be concise (under 100 words). Stay in character as ${participant.name}.
`;
  }

  constructVotePrompt(session, participant) {
    const history = session.messages.map(m => `${m.participantName} (${m.role}): ${m.content}`).join('\n\n');
    
    return `
${participant.prompt}

The debate is over. It's time to vote.

**Debate History:**
${history}

**Instruction:**
Based on the debate arguments and your personality, what is your final trading decision?
Return ONLY a JSON object with this format (no markdown):
{
  "action": "open_long" | "open_short" | "wait",
  "confidence": number (0-100),
  "leverage": number (1-10),
  "stopLoss": number (price),
  "takeProfit": number (price),
  "reasoning": "string (under 50 words)"
}
`;
  }

  updateStatus(id, status) {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
      this.emit('update', id, session);
    }
  }

  getDebate(id) {
    return this.sessions.get(id);
  }

  getAllDebates() {
    return Array.from(this.sessions.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
}

// Singleton
const debateManager = new DebateManager();

export default debateManager;
