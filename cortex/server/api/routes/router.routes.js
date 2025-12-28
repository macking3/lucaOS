import express from 'express';
import { classifyIntent } from '../../services/localRouterService.js';

const router = express.Router();

/**
 * @route POST /api/router/classify
 * @desc Classify user intent locally using FunctionGemma logic
 */
router.post('/classify', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: "Text is required for classification." });
    }

    console.log(`[ROUTER] Classifying: "${text}"`);
    const result = await classifyIntent(text);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("[ROUTER] Classification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
