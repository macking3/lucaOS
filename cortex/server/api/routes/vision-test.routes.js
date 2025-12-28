// Test endpoint with mock screenshot
import express from 'express';
const testRouter = express.Router();

testRouter.post('/test-vision', async (req, res) => {
    const { instruction } = req.body;
    
    try {
        // Create a simple 1x1 white pixel PNG as base64
        const mockScreenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        console.log('[TEST_VISION] Using mock screenshot');
        console.log('[TEST_VISION] Instruction:', instruction);
        
        // Import visionManager dynamically
        const { visionManager } = await import('../../../../src/services/visionManager.js');
        
        // Test vision analysis with mock screenshot
        const result = await visionManager.analyze(mockScreenshot, instruction, 'insight');
        
        res.json({
            success: true,
            result: result.prediction,
            model: result.model,
            intent: result.intent,
            note: 'Using mock 1x1 white pixel screenshot for testing'
        });
    } catch (error) {
        console.error('[TEST_VISION] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

export default testRouter;
