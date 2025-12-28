/**
 * Vision Analyzer Service
 * Analyzes screenshots using Gemini Vision API to detect events
 * Used by Always-On Vision System for proactive monitoring
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { screenCaptureService } from './screenCaptureService.js';
// import { settingsService } from './settingsService'; // Removed to avoid Node.js crash

class VisionAnalyzerService {
    constructor() {
        // Initialize logic is moved to analyzeScreen or specific init method 
        // to ensure we pick up the latest key from settings.
        this.genAI = null;
        
        this.analysisPrompt = `Analyze this screenshot carefully. Look for:

1. **ERRORS**: Red text, error dialogs, crash messages, exception popups, build failures, syntax errors
2. **WARNINGS**: Yellow warnings, caution messages, non-critical alerts
3. **SUCCESS**: Success messages, "completed" indicators, "build successful", task completion
4. **SECURITY ALERTS**: Login prompts, permission requests, firewall alerts, security warnings
5. **OPPORTUNITIES**: Empty/idle screens, stuck loading states, new notifications, update available

For each detected item:
- Identify the TYPE (error/warning/success/info/opportunity)
- Determine PRIORITY (CRITICAL for errors/security, HIGH for warnings, MEDIUM for success/info, LOW for opportunities)
- Provide a clear MESSAGE describing what was detected
- Note the APPLICATION or WINDOW where it appears

Format your response as JSON:
{
    "events": [
        {
            "type": "error|warning|success|info|opportunity",
            "priority": "CRITICAL|HIGH|MEDIUM|LOW",
            "message": "Description of what was detected",
            "application": "App name if visible",
            "actionSuggested": "Optional suggested action"
        }
    ],
    "confidence": 0.0-1.0
}

If nothing notable is detected, return: {"events": [], "confidence": 0.0}`;
        console.log('[VISION_ANALYZER] Initialized');
    }

    /**
     * Analyze a screenshot and detect events
     */
    async analyzeScreen(imageBuffer) {
        try {
            // Check environment variables
            const envKey = (typeof process !== 'undefined' && process.env && (process.env.API_KEY || process.env.GEMINI_API_KEY));
            const apiKey = envKey || '';

            if (!this.genAI && apiKey && apiKey.length > 10) {
                 this.genAI = new GoogleGenerativeAI(apiKey);
                 console.log('[VISION_ANALYZER] ✓ API key loaded from Env, initialized Gemini client');
            } else if (!this.genAI) {
                 // Check if we need to warn (throttle this?)
                 return [];
            }

            // Convert buffer to base64
            const base64Image = screenCaptureService.imageBufferToBase64(imageBuffer);

            // Analyze using Gemini Vision API directly
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            
            const imagePart = {
                inlineData: {
                    data: base64Image.split(',')[1] || base64Image, // Remove data:image/png;base64, prefix if present
                    mimeType: 'image/png'
                }
            };

            const result = await model.generateContent([this.analysisPrompt, imagePart]);
            const response = await result.response;
            const analysis = response.text();

            // Parse the analysis result
            const events = this.parseAnalysis(analysis, base64Image);

            if (events.length > 0) {
                console.log(`[VISION_ANALYZER] Detected ${events.length} event(s)`);
                events.forEach(event => {
                    console.log(`  - [${event.priority}] ${event.type}: ${event.message}`);
                });
            }

            return events;
        } catch (error) {
            console.error('[VISION_ANALYZER] Analysis failed:', error.message);
            return [];
        }
    }

    /**
     * Parse AI analysis response into VisionEvents
     */
    parseAnalysis(analysis, screenshotBase64) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = analysis.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                // No JSON found, try to infer events from text
                return this.parseTextAnalysis(analysis, screenshotBase64);
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            if (!parsed.events || !Array.isArray(parsed.events)) {
                return [];
            }

            // Convert to VisionEvent format
            return parsed.events.map((event) => ({
                type: this.normalizeEventType(event.type),
                priority: this.normalizePriority(event.priority),
                message: event.message || 'Event detected',
                context: {
                    application: event.application,
                    timestamp: Date.now(),
                    screenshot: screenshotBase64.substring(0, 1000) // Truncate for storage
                },
                actionSuggested: event.actionSuggested,
                metadata: {
                    confidence: parsed.confidence || 0.5
                }
            }));
        } catch (error) {
            console.warn('[VISION_ANALYZER] Failed to parse JSON, trying text parsing:', error.message);
            return this.parseTextAnalysis(analysis, screenshotBase64);
        }
    }

    /**
     * Fallback: Parse text-based analysis
     */
    parseTextAnalysis(text, screenshotBase64) {
        const events = [];
        const lowerText = text.toLowerCase();

        // Detect error keywords
        if (this.hasKeywords(lowerText, ['error', 'failed', 'exception', 'crash', 'bug', 'syntax error'])) {
            events.push({
                type: 'error',
                priority: 'CRITICAL',
                message: 'Error detected in screenshot',
                context: {
                    timestamp: Date.now(),
                    screenshot: screenshotBase64.substring(0, 1000)
                },
                metadata: {
                    rawAnalysis: text.substring(0, 500)
                }
            });
        }

        // Detect warning keywords
        if (this.hasKeywords(lowerText, ['warning', 'caution', 'alert', 'issue'])) {
            events.push({
                type: 'warning',
                priority: 'HIGH',
                message: 'Warning detected in screenshot',
                context: {
                    timestamp: Date.now(),
                    screenshot: screenshotBase64.substring(0, 1000)
                },
                metadata: {
                    rawAnalysis: text.substring(0, 500)
                }
            });
        }

        // Detect success keywords
        if (this.hasKeywords(lowerText, ['success', 'completed', 'done', 'finished', 'build successful'])) {
            events.push({
                type: 'success',
                priority: 'MEDIUM',
                message: 'Success message detected',
                context: {
                    timestamp: Date.now(),
                    screenshot: screenshotBase64.substring(0, 1000)
                },
                metadata: {
                    rawAnalysis: text.substring(0, 500)
                }
            });
        }

        return events;
    }

    /**
     * Check if text contains any of the keywords
     */
    hasKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    /**
     * Normalize event type
     */
    normalizeEventType(type) {
        const normalized = type.toLowerCase();
        if (['error', 'warning', 'success', 'info', 'opportunity'].includes(normalized)) {
            return normalized;
        }
        return 'info'; // Default
    }

    /**
     * Normalize priority
     */
    normalizePriority(priority) {
        const normalized = priority.toUpperCase();
        if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(normalized)) {
            return normalized;
        }
        return 'MEDIUM'; // Default
    }

    /**
     * Get a summary of detected events (for logging)
     */
    getEventSummary(events) {
        if (events.length === 0) {
            return 'No events detected';
        }

        const byType = events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});

        const summary = Object.entries(byType)
            .map(([type, count]) => `${count} ${type}(s)`)
            .join(', ');

        return `${events.length} event(s) detected: ${summary}`;
    }
}

// Export singleton instance
export const visionAnalyzerService = new VisionAnalyzerService();
export default visionAnalyzerService;
