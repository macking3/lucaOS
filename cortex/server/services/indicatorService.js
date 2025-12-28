import { EMA, MACD, RSI, ATR, SMA, BollingerBands, Stochastic } from 'technicalindicators';

// ============================================================================
// Stale Data Detection (NoFx Pattern)
// ============================================================================

/**
 * Detect stale data (consecutive price freeze)
 * NoFx skips symbols with 5+ consecutive identical prices
 */
function isStaleData(klines, symbol = '') {
  if (!klines || klines.length < 5) return false;
  
  // Handle both array [t,o,h,l,c,v] and object {close: ...} formats
  const lastPrice = Array.isArray(klines[klines.length - 1]) 
    ? klines[klines.length - 1][4] 
    : klines[klines.length - 1].close;
    
  let freezeCount = 0;
  
  for (let i = klines.length - 2; i >= Math.max(0, klines.length - 5); i--) {
    const price = Array.isArray(klines[i]) ? klines[i][4] : klines[i].close;
    
    if (price === lastPrice) {
      freezeCount++;
    } else {
      break;
    }
  }
  
  if (freezeCount >= 4) {
    console.warn(`[IndicatorService] ⚠️ Stale data detected for ${symbol}: ${freezeCount + 1} consecutive identical prices`);
    return true;
  }
  
  return false;
}

// ============================================================================
// Indicator Calculations
// ============================================================================

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(closes, period) {
  if (closes.length < period) return 0;
  
  const result = EMA.calculate({
    period,
    values: closes
  });
  
  return result.length > 0 ? result[result.length - 1] : 0;
}

/**
 * Calculate MACD (Enhanced: returns line, signal, and histogram)
 */
function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  
  const result = MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  
  if (result.length > 0) {
    const latest = result[result.length - 1];
    return {
      macd: latest.MACD || 0,
      signal: latest.signal || 0,
      histogram: latest.histogram || 0
    };
  }
  
  return { macd: 0, signal: 0, histogram: 0 };
}

/**
 * Calculate RSI (Relative Strength Index)
 * Uses Wilder's smoothing method (same as NoFx)
 */
function calculateRSI(closes, period = 14) {
  if (closes.length <= period) return 0;
  
  const result = RSI.calculate({
    period,
    values: closes
  });
  
  return result.length > 0 ? result[result.length - 1] : 0;
}

/**
 * Calculate ATR (Average True Range)
 * Uses Wilder's smoothing method (same as NoFx)
 */
function calculateATR(klines, period = 14) {
  if (klines.length <= period) return 0;
  
  // Handle both array/object formats
  const highs = klines.map(k => Array.isArray(k) ? k[2] : k.high);
  const lows = klines.map(k => Array.isArray(k) ? k[3] : k.low);
  const closes = klines.map(k => Array.isArray(k) ? k[4] : k.close);
  
  const result = ATR.calculate({
    period,
    high: highs,
    low: lows,
    close: closes
  });
  
  return result.length > 0 ? result[result.length - 1] : 0;
}

/**
 * Calculate Bollinger Bands
 */
function calculateBollingerBands(closes, period = 20, stdDev = 2) {
  if (closes.length < period) {
    return { upper: 0, middle: 0, lower: 0 };
  }
  
  const result = BollingerBands.calculate({
    period,
    values: closes,
    stdDev
  });
  
  if (result.length > 0) {
    const latest = result[result.length - 1];
    return {
      upper: latest.upper,
      middle: latest.middle,
      lower: latest.lower
    };
  }
  
  return { upper: 0, middle: 0, lower: 0 };
}

/**
 * Calculate Stochastic RSI
 */
function calculateStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
  if (closes.length < rsiPeriod + stochPeriod) {
    return { k: 0, d: 0 };
  }
  
  const rsiValues = RSI.calculate({
    period: rsiPeriod,
    values: closes
  });
  
  if (rsiValues.length < stochPeriod) {
    return { k: 0, d: 0 };
  }
  
  const stoch = Stochastic.calculate({
    high: rsiValues,
    low: rsiValues,
    close: rsiValues,
    period: stochPeriod,
    signalPeriod: dPeriod
  });
  
  if (stoch.length > 0) {
    const latest = stoch[stoch.length - 1];
    return { k: latest.k || 0, d: latest.d || 0 };
  }
  
  return { k: 0, d: 0 };
}

// ============================================================================
// Price Change Calculations
// ============================================================================

/**
 * Calculate price change percentage
 */
function calculatePriceChange(closes, barsBack) {
  if (closes.length < barsBack + 1) return 0;
  
  const currentPrice = closes[closes.length - 1];
  const oldPrice = closes[closes.length - 1 - barsBack];
  
  if (oldPrice === 0) return 0;
  return ((currentPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Parse timeframe to minutes (NoFx pattern)
 */
function parseTimeframeToMinutes(tf) {
  const map = {
    '1m': 1, '3m': 3, '5m': 5, '15m': 15, '30m': 30,
    '1h': 60, '2h': 120, '4h': 240, '6h': 360, '8h': 480, '12h': 720,
    '1d': 1440, '3d': 4320, '1w': 10080
  };
  return map[tf] || 0;
}

/**
 * Calculate price change by target minutes
 */
function calculatePriceChangeByTime(closes, timeframe, targetMinutes) {
  const tfMinutes = parseTimeframeToMinutes(timeframe);
  if (tfMinutes <= 0) return 0;
  
  const barsBack = Math.ceil(targetMinutes / tfMinutes);
  return calculatePriceChange(closes, barsBack);
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

/**
 * Analyze a symbol and return full market data
 */
function analyzeSymbol(klines, symbol = '', options = {}) {
  const {
    emaPeriods = [20, 50],
    rsiPeriod = 14,
    macdConfig = { fast: 12, slow: 26, signal: 9 },
    atrPeriod = 14,
    timeframe = '5m'
  } = options;
  
  if (!klines || klines.length === 0) {
    // Return safe default instead of throwing to prevent crashes
    console.warn(`[IndicatorService] No kline data for ${symbol}`);
    return null;
  }
  
  // Check for stale data (NoFx pattern)
  if (isStaleData(klines, symbol)) {
    console.warn(`[IndicatorService] Stale data detected for ${symbol}`);
    // We proceed but might want to flag it in the response
  }
  
  // Extract closes (handle array or object format)
  const closes = klines.map(k => Array.isArray(k) ? k[4] : k.close);
  const currentPrice = closes[closes.length - 1];
  
  // Calculate indicators
  const ema20 = calculateEMA(closes, emaPeriods[0] || 20);
  const ema50 = calculateEMA(closes, emaPeriods[1] || 50);
  const macd = calculateMACD(closes, macdConfig.fast, macdConfig.slow, macdConfig.signal);
  const rsi7 = calculateRSI(closes, 7);
  const rsi14 = calculateRSI(closes, rsiPeriod);
  const atr14 = calculateATR(klines, atrPeriod);
  const bollinger = calculateBollingerBands(closes);
  
  // Calculate price changes
  const priceChange1h = calculatePriceChangeByTime(closes, timeframe, 60);
  const priceChange4h = calculatePriceChangeByTime(closes, timeframe, 240);
  const priceChange24h = calculatePriceChangeByTime(closes, timeframe, 1440);
  
  // Calculate volume metrics
  const volumes = klines.map(k => Array.isArray(k) ? k[5] : k.volume);
  const currentVolume = volumes[volumes.length - 1];
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  
  return {
    symbol,
    currentPrice,
    priceChange1h,
    priceChange4h,
    priceChange24h,
    currentEMA20: ema20,
    currentEMA50: ema50,
    currentMACD: macd,
    currentRSI7: rsi7,
    currentRSI14: rsi14,
    currentATR14: atr14,
    bollingerBands: bollinger,
    volume: {
      current: currentVolume,
      average: avgVolume,
      ratio: avgVolume > 0 ? currentVolume / avgVolume : 0
    },
    timestamp: Date.now()
  };
}

/**
 * Calculate series data for AI context (NoFx pattern)
 * Returns multiple data points for each indicator to show trends
 */
function calculateSeriesData(klines, count = 10, timeframe = '5m') {
  const closes = klines.map(k => Array.isArray(k) ? k[4] : k.close);
  
  const data = {
    timeframe,
    klines: [],
    midPrices: [],
    ema20Values: [],
    ema50Values: [],
    macdValues: [],
    rsi7Values: [],
    rsi14Values: [],
    volume: [],
    atr14: 0
  };
  
  // Get latest N data points
  const start = Math.max(0, klines.length - count);
  
  for (let i = start; i < klines.length; i++) {
    const k = klines[i];
    const open = Array.isArray(k) ? k[1] : k.open;
    const high = Array.isArray(k) ? k[2] : k.high;
    const low = Array.isArray(k) ? k[3] : k.low;
    const close = Array.isArray(k) ? k[4] : k.close;
    const volume = Array.isArray(k) ? k[5] : k.volume;
    const time = Array.isArray(k) ? k[0] : k.openTime;

    // Store kline
    data.klines.push({ time, open, high, low, close, volume });
    
    data.midPrices.push(close);
    data.volume.push(volume);
    
    // Calculate rolling indicators
    const slice = closes.slice(0, i + 1);
    // Optimization: we could optimize this but for 10 points it's fine
    
    if (slice.length >= 20) data.ema20Values.push(calculateEMA(slice, 20));
    if (slice.length >= 50) data.ema50Values.push(calculateEMA(slice, 50));
    if (slice.length >= 26) {
      const macd = calculateMACD(slice);
      data.macdValues.push(macd.macd);
    }
    if (slice.length >= 7) data.rsi7Values.push(calculateRSI(slice, 7));
    if (slice.length >= 14) data.rsi14Values.push(calculateRSI(slice, 14));
  }
  
  // Calculate ATR for entire series
  data.atr14 = calculateATR(klines, 14);
  
  return data;
}

/**
 * Analyze multiple timeframes (NoFx pattern)
 */
async function analyzeMultiTimeframe(symbol, timeframes = ['5m', '1h', '4h']) {
  const analyses = {};
  
  // Dynamic import to avoid circular dependency
  const exchangeManager = (await import('./exchangeManager.js')).default;
  
  let primaryData = null;

  for (const tf of timeframes) {
    try {
      // Fetch 100 candles for sufficient indicator calculation
      const klines = await exchangeManager.getOHLCV('binance', symbol, tf, 100);
      const analysis = analyzeSymbol(klines, symbol, { timeframe: tf });
      const series = calculateSeriesData(klines, 10, tf);
      
      if (analysis) {
        analyses[tf] = {
          ...analysis,
          series
        };
        if (!primaryData) primaryData = analyses[tf]; // Default to first valid
      }
    } catch (error) {
      console.warn(`[IndicatorService] Failed multi-tf analysis for ${symbol} ${tf}:`, error.message);
      analyses[tf] = null;
    }
  }
  
  return analyses;
}

/**
 * Format market data for AI prompt (NoFx pattern)
 * Enhanced to handle Multi-Timeframe Analysis objects
 */
function formatForAI(marketData, symbol) {
  // Check if this is a multi-timeframe object (has keys like '5m', '1h')
  if (marketData && (marketData['5m'] || marketData['1h'] || marketData['4h'])) {
    let output = `MARKET ANALYSIS FOR ${symbol} (MULTI-TIMEFRAME):\n\n`;
    
    // Sort logic: 5m (Short-term), 1h (Mid-term), 4h (Long-term)
    const timeframes = ['5m', '1h', '4h'];
    
    for (const tf of timeframes) {
      if (!marketData[tf]) continue;
      const data = marketData[tf];
      
      output += `[${tf.toUpperCase()} TIMEFRAME]\n`;
      output += `Price: ${data.currentPrice}\n`; 
      output += `RSI(14): ${data.currentRSI14.toFixed(2)}\n`; 
      output += `MACD: Hist=${data.currentMACD.histogram.toFixed(4)} (Line=${data.currentMACD.macd.toFixed(4)})\n`; 
      output += `Trend(EMA20): ${data.currentEMA20.toFixed(2)}\n`; 
      output += `ATR: ${data.currentATR14.toFixed(4)}\n\n`; 
    }
    
    return output;
  }

  // Fallback for single timeframe (legacy support)
  if (!marketData) return "No market data available.";
  
  const lines = [];
  lines.push(`## ${symbol} Market Data`);
  lines.push('');
  lines.push(`**Current Price**: ${formatPrice(marketData.currentPrice)}`);
  lines.push(`**Price Changes**: 1h: ${formatPercent(marketData.priceChange1h)}, 4h: ${formatPercent(marketData.priceChange4h)}`);
  lines.push('');
  lines.push('### Technical Indicators');
  lines.push(`- EMA20: ${formatPrice(marketData.currentEMA20)}`);
  lines.push(`- EMA50: ${formatPrice(marketData.currentEMA50)}`);
  lines.push(`- MACD: ${marketData.currentMACD.macd.toFixed(4)} (Signal: ${marketData.currentMACD.signal.toFixed(4)}, Hist: ${marketData.currentMACD.histogram.toFixed(4)})`);
  lines.push(`- RSI(14): ${marketData.currentRSI14.toFixed(2)}`);
  lines.push(`- ATR(14): ${formatPrice(marketData.currentATR14)}`);
  
  if (marketData.volume) {
    lines.push('');
    lines.push('### Volume');
    lines.push(`- Ratio: ${marketData.volume.ratio.toFixed(2)}x`);
  }
  
  return lines.join('\n');
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatPrice(price) {
  if (price === undefined || price === null) return 'N/A';
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatPercent(value) {
  if (value === undefined || value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// ============================================================================
// List of Available Indicators
// ============================================================================

const AVAILABLE_INDICATORS = [
  { id: 'ema', name: 'Exponential Moving Average', params: ['period'] },
  { id: 'sma', name: 'Simple Moving Average', params: ['period'] },
  { id: 'macd', name: 'MACD', params: ['fastPeriod', 'slowPeriod', 'signalPeriod'] },
  { id: 'rsi', name: 'Relative Strength Index', params: ['period'] },
  { id: 'atr', name: 'Average True Range', params: ['period'] },
  { id: 'bollinger', name: 'Bollinger Bands', params: ['period', 'stdDev'] },
  { id: 'stochRsi', name: 'Stochastic RSI', params: ['rsiPeriod', 'stochPeriod', 'kPeriod', 'dPeriod'] }
];

// ============================================================================
// Exports
// ============================================================================

const indicatorService = {
  analyzeSymbol,
  analyzeMultiTimeframe,
  calculateSeriesData,
  formatForAI,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateATR,
  calculateBollingerBands,
  calculateStochRSI,
  AVAILABLE_INDICATORS
};

export {
  analyzeSymbol,
  analyzeMultiTimeframe,
  calculateSeriesData,
  formatForAI,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateATR,
  calculateBollingerBands,
  calculateStochRSI,
  AVAILABLE_INDICATORS
};

export default indicatorService;
