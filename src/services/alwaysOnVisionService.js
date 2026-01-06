/**
 * Always-On Vision Service
 * Main orchestrator for continuous background screen monitoring
 * Coordinates screen capture, analysis, events, and notifications
 */

import { screenCaptureService } from './screenCaptureService.js';
import { visionAnalyzerService } from './visionAnalyzerService.js';
import { eventBus } from './eventBus.ts';
import { notificationService } from './notificationService.js';

class AlwaysOnVisionService {
    constructor() {
        this.config = {
            enabled: false,
            captureInterval: 60000, // Increased from 30s to 60s to conserve Gemini quota
            onlyAnalyzeOnChange: true,
            maxCpuUsage: 5
        };

        this.captureIntervalId = null;
        this.isRunning = false;
        this.startTime = 0;
        this.stats = {
            captures: 0,
            analyses: 0,
            eventsDetected: 0,
            notificationsSent: 0,
            errors: 0,
            uptime: 0
        };

        console.log('[ALWAYS_ON_VISION] Service initialized');
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for EventBus
     */
    setupEventListeners() {
        // Listen for vision events
        eventBus.on('vision-event', (event) => {
            this.stats.eventsDetected++;
            
            // Send notification
            notificationService.notify(event).then(() => {
                this.stats.notificationsSent++;
            }).catch(error => {
                console.error('[ALWAYS_ON_VISION] Notification failed:', error);
                this.stats.errors++;
            });
        });

        console.log('[ALWAYS_ON_VISION] Event listeners configured');
    }

    /**
     * Start the always-on vision monitoring
     */
    start(config) {
        if (this.isRunning) {
            console.warn('[ALWAYS_ON_VISION] Service already running');
            return;
        }

        // Update config if provided
        if (config) {
            this.config = { ...this.config, ...config };
        }

        this.config.enabled = true;
        this.isRunning = true;
        this.startTime = Date.now();

        console.log(`[ALWAYS_ON_VISION] Starting with interval: ${this.config.captureInterval}ms`);
        console.log(`[ALWAYS_ON_VISION] Platform: ${screenCaptureService.getPlatform()}`);
        console.log(`[ALWAYS_ON_VISION] Analyze on change: ${this.config.onlyAnalyzeOnChange}`);

        // Immediate first capture
        this.captureAndAnalyze();

        // Set up periodic captures
        this.captureIntervalId = setInterval(() => {
            this.captureAndAnalyze();
        }, this.config.captureInterval);

        console.log('[ALWAYS_ON_VISION] ✅ Service started');
    }

    /**
     * Stop the always-on vision monitoring
     */
    stop() {
        if (!this.isRunning) {
            console.warn('[ALWAYS_ON_VISION] Service not running');
            return;
        }

        this.config.enabled = false;
        this.isRunning = false;

        if (this.captureIntervalId) {
            clearInterval(this.captureIntervalId);
            this.captureIntervalId = null;
        }

        // Update uptime
        this.stats.uptime = Date.now() - this.startTime;

        console.log('[ALWAYS_ON_VISION] ⏹️ Service stopped');
    }

    /**
     * Capture screenshot and analyze if needed
     */
    async captureAndAnalyze() {
        if (!this.config.enabled || !this.isRunning) {
            return;
        }

        try {
            // Capture screen
            const captureResult = await screenCaptureService.capture();
            this.stats.captures++;
            this.stats.lastCaptureTime = Date.now();

            if (!captureResult.success || !captureResult.imageBuffer) {
                console.warn('[ALWAYS_ON_VISION] Screen capture failed:', captureResult.error);
                this.stats.errors++;
                return;
            }

            // Check if screen changed (if enabled)
            if (this.config.onlyAnalyzeOnChange) {
                const hasChanged = await screenCaptureService.hasScreenChanged(captureResult.imageBuffer);
                
                if (!hasChanged) {
                    console.log('[ALWAYS_ON_VISION] Screen unchanged, skipping analysis');
                    return;
                }
            }

            // Analyze the screenshot
            console.log('[ALWAYS_ON_VISION] Analyzing screenshot...');
            const events = await visionAnalyzerService.analyzeScreen(captureResult.imageBuffer);
            this.stats.analyses++;
            this.stats.lastAnalysisTime = Date.now();

            // Emit events
            if (events.length > 0) {
                events.forEach(event => {
                    eventBus.emitEvent(event);
                });
                
                const summary = visionAnalyzerService.getEventSummary(events);
                console.log(`[ALWAYS_ON_VISION] ${summary}`);
            } else {
                console.log('[ALWAYS_ON_VISION] No events detected');
            }

            // Cleanup old screenshots periodically
            if (this.stats.captures % 10 === 0) {
                screenCaptureService.cleanupOldScreenshots();
            }

        } catch (error) {
            console.error('[ALWAYS_ON_VISION] Capture/analysis error:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: this.isRunning ? Date.now() - this.startTime : this.stats.uptime,
            config: { ...this.config }
        };
    }

    /**
     * Update service configuration
     */
    updateConfig(config) {
        const wasRunning = this.isRunning;
        
        if (wasRunning) {
            this.stop();
        }

        this.config = { ...this.config, ...config };

        if (wasRunning) {
            this.start();
        }

        console.log('[ALWAYS_ON_VISION] Configuration updated:', this.config);
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Check if service is running
     */
    isServiceRunning() {
        return this.isRunning;
    }

    /**
     * Manually trigger a capture and analysis (useful for testing)
     */
    async triggerCapture() {
        console.log('[ALWAYS_ON_VISION] Manual trigger requested');
        
        try {
            const captureResult = await screenCaptureService.capture();
            
            if (!captureResult.success || !captureResult.imageBuffer) {
                throw new Error(captureResult.error || 'Capture failed');
            }

            const events = await visionAnalyzerService.analyzeScreen(captureResult.imageBuffer);
            
            // Emit events
            events.forEach(event => {
                eventBus.emitEvent(event);
            });

            return events;
        } catch (error) {
            console.error('[ALWAYS_ON_VISION] Manual trigger failed:', error.message);
            throw error;
        }
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            captures: 0,
            analyses: 0,
            eventsDetected: 0,
            notificationsSent: 0,
            errors: 0,
            uptime: 0
        };
        console.log('[ALWAYS_ON_VISION] Statistics reset');
    }
}

// Export singleton instance
export const alwaysOnVisionService = new AlwaysOnVisionService();
export default alwaysOnVisionService;
