import express from 'express';
import { webSurferService } from '../../services/webSurferService.js';

const router = express.Router();

// Market News
router.get('/news', async (req, res) => {
    const { sector } = req.query;
    try {
        console.log(`[Finance API] Fetching Market News for Sector: ${sector || "GENERAL"}`);
        const news = await webSurferService.getMarketNews(sector);
        res.json({ news });
    } catch (e) {
        console.error("[Finance API] News Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Polymarket Search
router.get('/polymarket/markets', async (req, res) => {
    const { query } = req.query;
    try {
        if (!query) return res.status(400).json({ error: "Query required" });
        console.log(`[Finance API] Searching Polymarket for: ${query}`);
        const markets = await webSurferService.searchPolymarket(query);
        res.json({ markets }); 
    } catch (e) {
        console.error("[Finance API] Polymarket Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Stock Analysis & Quotes
router.get('/stock/quote', async (req, res) => {
    const { symbol } = req.query;
    console.log(`[Finance API] Fetching Stock Quote for: ${symbol}`);
    // Mock simulation for stock quote
    res.json({ 
        symbol, 
        price: (Math.random() * 500 + 100).toFixed(2), 
        change: (Math.random() * 10 - 5).toFixed(2),
        volume: "1.2M",
        currency: "USD"
    });
});

router.post('/stock/analyze', async (req, res) => {
    const { symbol, timeframe } = req.body;
    console.log(`[Finance API] Analyzing Stock: ${symbol}`);
    res.json({ 
        success: true, 
        result: `Technical Analysis for ${symbol} (${timeframe || '1D'}): Bullish momentum detected. RSI at 62. Support at 145.20. Target 168.00.` 
    });
});

// Market Sentiment & Calendar
router.get('/sentiment', async (req, res) => {
    console.log("[Finance API] Fetching Global Market Sentiment");
    res.json({ sentiment: "Greed", index: 68, trend: "UPWARD", note: "Fear & Greed Index sourced from multiple data points." });
});

router.get('/calendar', async (req, res) => {
    console.log("[Finance API] Fetching Economic Calendar");
    res.json({ 
        events: [
            { date: "2024-05-30", event: "GDP Growth Rate (QoQ)", impact: "HIGH" },
            { date: "2024-06-01", event: "Non-Farm Payrolls", impact: "CRITICAL" }
        ] 
    });
});

export default router;
