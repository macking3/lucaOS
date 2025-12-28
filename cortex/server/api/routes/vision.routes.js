import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CORTEX_PORT } from '../../config/constants.js';

// Import VisionManager for direct usage (more efficient than HTTP calls)
// From: /cortex/server/api/routes/vision.routes.js
// To:   /src/services/visionManager.js
// Path: ../../../../src/services/visionManager.js
import { visionManager } from '../../../../src/services/visionManager.js';
// Import screenCaptureService for cross-platform screenshot support
import { screenCaptureService } from '../../../../src/services/screenCaptureService.js';
// Import systemControlService for direct action execution
import { systemControlService } from '../../services/systemControlService.js';

const execAsync = promisify(exec);
const router = express.Router();

/**
 * UI-TARS VISION ANALYSIS ENDPOINT
 * Receives screenshots and instructions, returns predicted actions/coordinates
 * This is the backend that uiTarsService.ts calls
 */

router.post('/analyze', async (req, res) => {
    const { screenshot, instruction, intent } = req.body;
    
    if (!screenshot || !instruction) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Missing screenshot or instruction',
            code: 'MISSING_PARAMETERS'
        });
    }

    console.log(`[UI-TARS] Analyzing screenshot for: "${instruction}"`);

    // Retry logic with exponential backoff
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Check if UI-TARS Python service is running
            const UITARS_URL = process.env.UITARS_URL || `http://localhost:${CORTEX_PORT}`;
            
            try {
                // Forward to actual UI-TARS service if available
                const response = await fetch(`${UITARS_URL}/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ screenshot, instruction }),
                    signal: AbortSignal.timeout(30000) // 30 second timeout
                });

                if (response.ok) {
                    const data = await response.json();
                    return res.json({
                        status: 'success',
                        prediction: data.prediction || data,
                        method: 'ui-tars',
                        attempt
                    });
                }
            } catch (fetchError) {
                console.warn(`[UI-TARS] Python service not available (attempt ${attempt}/${maxRetries}):`, fetchError.message);
                lastError = fetchError;
            }

            // FALLBACK: Use Gemini Vision API for analysis
            const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
            
            if (!GEMINI_API_KEY) {
                return res.status(503).json({
                    status: 'error',
                    message: 'UI-TARS service not running and no Gemini API key configured.',
                    code: 'NO_VISION_SERVICE_AVAILABLE',
                    fix: 'Please start the UI-TARS Python service (cortex/python/startup.sh) or configure GEMINI_API_KEY in your .env file.'
                });
            }

            console.log(`[UI-TARS] Using Gemini Vision fallback (attempt ${attempt}/${maxRetries})`);
            const fallbackPrediction = await analyzeWithGeminiVision(screenshot, instruction);
            
            return res.json({
                status: 'success',
                prediction: fallbackPrediction,
                method: 'gemini-vision-fallback',
                attempt
            });

        } catch (error) {
            lastError = error;
            console.error(`[UI-TARS] Analysis attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            // If not last attempt, wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`[UI-TARS] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // All retries failed
    console.error('[UI-TARS] All retry attempts failed');
    res.status(500).json({
        status: 'error',
        message: lastError?.message || 'Vision analysis failed after multiple attempts',
        code: 'VISION_ANALYSIS_FAILED',
        attempts: maxRetries,
        fix: 'Check server logs for specific tool errors or network connectivity to Vision APIs.'
    });
});

/**
 * Fallback vision analysis using Gemini Vision
 */
async function analyzeWithGeminiVision(screenshotBase64, instruction) {
    try {
        // Use Gemini's vision capabilities as fallback
        // This requires the Gemini API to be configured
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            return {
                action: 'ANALYSIS_UNAVAILABLE',
                message: 'UI-TARS service not running and no Gemini API key configured.',
                coordinates: null,
                fix: 'Please start the UI-TARS Python service (cortex/python/startup.sh) or set your GEMINI_API_KEY in the .env file to enable vision fallbacks.'
            };
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: `Analyze this screenshot and help with: ${instruction}\n\nProvide the action to take and coordinates if applicable. Format: {"action": "click/type/scroll", "coordinates": {"x": 0, "y": 0}, "text": "optional text to type"}` },
                            { 
                                inline_data: {
                                    mime_type: 'image/png',
                                    data: screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
                                }
                            }
                        ]
                    }]
                })
            }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
        
        // Try to parse JSON response
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Return text as-is if not JSON
        }

        return {
            action: 'DESCRIBE',
            description: text,
            coordinates: null
        };

    } catch (error) {
        console.error('[GEMINI_VISION] Fallback failed:', error);
        return {
            action: 'ERROR',
            message: error.message,
            coordinates: null
        };
    }
}

/**
 * Health check for UI-TARS service
 */
router.get('/status', async (req, res) => {
    const UITARS_URL = process.env.UITARS_URL || `http://localhost:${CORTEX_PORT}`;
    
    try {
        const response = await fetch(`${UITARS_URL}/health`, { 
            method: 'GET',
            signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        
        if (response.ok) {
            return res.json({ 
                active: true, 
                running: true, 
                service: 'UI-TARS Python',
                url: UITARS_URL
            });
        }
    } catch (error) {
        // UI-TARS not running, check if Gemini fallback is available
        const hasGemini = !!process.env.GEMINI_API_KEY;
        return res.json({ 
            active: hasGemini, 
            running: false, 
            service: hasGemini ? 'Gemini Vision (Fallback)' : 'None',
            message: 'UI-TARS Python service not running.',
            fix: hasGemini ? 'Using Gemini Vision fallback.' : 'Configure GEMINI_API_KEY for fallback or start UI-TARS Python service.'
        });
    }
});



// ===== MIDSCENE-INSPIRED AI TOOL ENDPOINTS =====

/**
 * aiQuery - Extract structured data from screen
 */
router.post('/ai-query', async (req, res) => {
    const { query, includeDom } = req.body;
    
    try {
        // Capture screenshot
        const screenshot = await captureScreenshot();
        
        // Build prompt for data extraction
        const prompt = `Extract the following data from the screenshot: ${query}

Return ONLY valid JSON matching the requested type.
Do not include any explanation, just the JSON data.

Examples:
- "string[], list of product names" → ["Product 1", "Product 2"]
- "object[], products with name and price" → [{"name": "...", "price": "..."}]
- "number, total count" → 42`;

        // Use VisionManager directly (more efficient than HTTP call)
        const result = await visionManager.analyze(screenshot, prompt, 'insight');
        
        // Try to parse JSON from response
        try {
            const jsonMatch = result.prediction.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return res.json({ success: true, data: parsed, model: result.model });
            }
        } catch (e) {
            // Return as-is if not JSON
        }

        res.json({ success: true, data: result.prediction, model: result.model });
    } catch (error) {
        console.error('[AI_QUERY] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * aiBoolean - Check if condition is true/false
 */
router.post('/ai-boolean', async (req, res) => {
    const { question } = req.body;
    
    try {
        const screenshot = await captureScreenshot();
        
        const prompt = `Answer with ONLY 'true' or 'false': ${question}

Do not include any explanation, just the boolean value.`;

        // Use VisionManager directly
        const visionResult = await visionManager.analyze(screenshot, prompt, 'insight');
        const result = visionResult.prediction.toLowerCase().includes('true');
        
        res.json({ success: true, result });
    } catch (error) {
        console.error('[AI_BOOLEAN] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * aiAssert - Verify condition (throws error if false)
 */
router.post('/ai-assert', async (req, res) => {
    const { assertion } = req.body;
    
    try {
        const screenshot = await captureScreenshot();
        
        const prompt = `Verify this assertion: ${assertion}

Answer with ONLY 'true' or 'false'.`;

        // Use VisionManager directly
        const visionResult = await visionManager.analyze(screenshot, prompt, 'insight');
        const passed = visionResult.prediction.toLowerCase().includes('true');
        
        if (!passed) {
            return res.status(400).json({ 
                success: false, 
                error: `Assertion failed: ${assertion}` 
            });
        }
        
        res.json({ success: true, passed: true });
    } catch (error) {
        console.error('[AI_ASSERT] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * aiLocate - Find element coordinates
 */
router.post('/ai-locate', async (req, res) => {
    const { description } = req.body;
    
    try {
        const screenshot = await captureScreenshot();
        
        const prompt = `Locate the element: "${description}"

Return ONLY JSON in this exact format: {"x": 0, "y": 0}
Do not include any explanation.`;

        // Use VisionManager directly (action intent for element localization)
        const visionResult = await visionManager.analyze(screenshot, prompt, 'action');
        
        // Parse coordinates from response
        const jsonMatch = visionResult.prediction.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const coords = JSON.parse(jsonMatch[0]);
            return res.json({ success: true, coordinates: coords, model: visionResult.model });
        }
        
        res.status(400).json({ success: false, error: 'Could not locate element' });
    } catch (error) {
        console.error('[AI_LOCATE] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * aiWaitFor - Wait for condition to be true
 */
router.post('/ai-wait-for', async (req, res) => {
    const { condition, timeout = 30000, interval = 1000 } = req.body;
    
    const startTime = Date.now();
    
    try {
        while (Date.now() - startTime < timeout) {
            const screenshot = await captureScreenshot();
            
            const prompt = `Check if this condition is met: ${condition}

Answer with ONLY 'true' or 'false'.`;

            // Use VisionManager directly
            const visionResult = await visionManager.analyze(screenshot, prompt, 'insight');
            const isMet = visionResult.prediction.toLowerCase().includes('true');
            
            if (isMet) {
                return res.json({ success: true, elapsed: Date.now() - startTime });
            }
            
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        res.status(408).json({ 
            success: false, 
            error: `Timeout: Condition not met after ${timeout}ms` 
        });
    } catch (error) {
        console.error('[AI_WAIT_FOR] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * aiAct - Auto multi-step execution WITH ACTUAL ACTION EXECUTION
 */
router.post('/ai-act', async (req, res) => {
    const { instruction, maxSteps = 20, context } = req.body;
    
    const steps = [];
    
    try {
        for (let i = 0; i < maxSteps; i++) {
            const screenshot = await captureScreenshot();
            
            const prompt = `You are executing step ${i + 1}/${maxSteps} of this task: ${instruction}

${context ? `Context: ${context}` : ''}

Previous steps: ${steps.map(s => `${s.action} ${s.target || ''}`).join(', ') || 'None'}

What is the next action to take? Return JSON:
{"action": "click/type/scroll/done", "target": "description of element", "text": "text to type (if applicable)"}

If task is complete, return: {"action": "done"}`;

            // Use VisionManager directly (planning intent for complex reasoning)
            const visionResult = await visionManager.analyze(screenshot, prompt, 'planning');
            
            // Parse action from response
            const jsonMatch = visionResult.prediction.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Could not parse action from AI response');
            }
            
            const action = JSON.parse(jsonMatch[0]);
            steps.push(action);
            
            if (action.action === 'done') {
                return res.json({ success: true, steps, completed: true });
            }
            
            // ===== EXECUTE THE ACTION =====
            console.log(`[AI_ACT] Step ${i + 1}: Executing ${action.action} - ${action.target || ''}`);
            
            try {
                if (action.action === 'click') {
                    // Locate element and click it
                    const locatePrompt = `Locate the element: "${action.target}"

Return ONLY JSON in this exact format: {"x": 0, "y": 0}`;
                    
                    const locateResult = await visionManager.analyze(screenshot, locatePrompt, 'action');
                    const coordsMatch = locateResult.prediction.match(/\{[\s\S]*\}/);
                    
                    if (coordsMatch) {
                        const coords = JSON.parse(coordsMatch[0]);
                        
                        // Execute click via service directly
                        const clickResult = await systemControlService.executeAction({
                            action: 'CLICK',
                            x: coords.x,
                            y: coords.y
                        });
                        if (!clickResult.success) {
                            console.warn(`[AI_ACT] Click failed:`, clickResult);
                        }
                        
                        action.executed = true;
                        action.coordinates = coords;
                    } else {
                        console.warn(`[AI_ACT] Could not locate element: ${action.target}`);
                        action.executed = false;
                        action.error = 'Element not found';
                    }
                    
                } else if (action.action === 'type') {
                    // Type text
                    // Type text via service directly
                    const typeResult = await systemControlService.executeAction({
                        action: 'TYPE',
                        text: action.text
                    });
                    action.executed = typeResult.success;
                    if (!typeResult.success) {
                        action.error = typeResult.error || 'Type action failed';
                    }
                    
                } else if (action.action === 'scroll') {
                    // Scroll action
                    // Scroll action via service directly
                    const scrollResult = await systemControlService.executeAction({
                        action: 'SCROLL',
                        direction: action.direction || 'down',
                        amount: action.amount || 100
                    });
                    action.executed = scrollResult.success;
                    if (!scrollResult.success) {
                        action.error = scrollResult.error || 'Scroll action failed';
                    }
                    
                } else {
                    console.warn(`[AI_ACT] Unknown action type: ${action.action}`);
                    action.executed = false;
                    action.error = `Unknown action type: ${action.action}`;
                }
                
            } catch (execError) {
                console.error(`[AI_ACT] Action execution error:`, execError);
                action.executed = false;
                action.error = execError.message;
            }
            
            // Small delay between steps
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        res.json({ success: true, steps, completed: false, reason: 'Max steps reached' });
    } catch (error) {
        console.error('[AI_ACT] Error:', error);
        res.status(500).json({ success: false, error: error.message, steps });
    }
});

// Helper function to capture screenshot (cross-platform)
async function captureScreenshot() {
    try {
        // Use existing screenCaptureService for cross-platform support
        console.log('[SCREENSHOT] Calling screenCaptureService.capture()...');
        const capture = await screenCaptureService.capture();
        console.log('[SCREENSHOT] Capture result:', {
            success: capture?.success,
            hasImageBuffer: !!capture?.imageBuffer,
            platform: capture?.platform,
            error: capture?.error
        });
        
        // Check if capture was successful
        if (!capture.success || !capture.imageBuffer) {
            throw new Error(capture.error || 'Screenshot capture returned no image');
        }
        
        return capture.imageBuffer.toString('base64');
    } catch (error) {
        console.error('[SCREENSHOT] Capture failed:', error);
        throw new Error(`Screenshot capture failed: ${error.message}`);
    }
}

export default router;
