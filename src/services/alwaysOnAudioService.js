/**
 * Always-On Audio Service
 * Main orchestrator for continuous background audio monitoring
 * Coordinates audio capture, analysis, event detection, and notifications
 */

import { audioCaptureService } from './audioCaptureService.js';
import { audioAnalyzerService } from './audioAnalyzerService.js';
import { audioEventDetector } from './audioEventDetector.js';
import { eventBus } from './eventBus.js';
import { notificationService } from './notificationService.js';

class AlwaysOnAudioService {
    constructor() {
        this.config = {
            enabled: false, // DISABLED BY DEFAULT
            captureInterval: 30000, // Increased from 5s to 30s to conserve Gemini quota
            analysisInterval: 60000, // Increased from 10s to 60s
            sampleRate: 16000,
            channels: 1,
            format: 'wav',
            maxCpuUsage: 5,
            sensitivity: 0.7,
            eventTypes: [], // DISABLED
            notifications: {
                voice: false,
                visual: false,
                chat: false
            }
        };

        this.captureIntervalId = null;
        this.analysisIntervalId = null;
        this.isRunning = false;
        this.startTime = 0;
        this.currentChunk = null;
        this.chunkQueue = [];
        
        this.stats = {
            captures: 0,
            analyses: 0,
            eventsDetected: 0,
            notificationsSent: 0,
            errors: 0,
            uptime: 0
        };

        console.log('[ALWAYS_ON_AUDIO] Service initialized');
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for EventBus
     */
    setupEventListeners() {
        // Listen for audio events
        eventBus.on('audio-event', (event) => {
            this.stats.eventsDetected++;
            
            // Send notification
            notificationService.notify({
                type: 'audio-event',
                priority: event.priority,
                title: this.getEventTitle(event),
                message: event.description,
                data: event
            }).then(() => {
                this.stats.notificationsSent++;
            }).catch(error => {
                console.error('[ALWAYS_ON_AUDIO] Notification failed:', error);
                this.stats.errors++;
            });
        });

        console.log('[ALWAYS_ON_AUDIO] Event listeners configured');
    }

    /**
     * Get friendly event title for notifications
     */
    getEventTitle(event) {
        const titles = {
            'doorbell': '🚪 Doorbell',
            'smoke_alarm': '🔥 Smoke Alarm',
            'security_alert': '🚨 Security Alert',
            'phone_ring': '📞 Phone Ringing',
            'unusual_noise': '⚠️ Unusual Noise',
            'glass_breaking': '🔨 Glass Breaking'
        };
        return titles[event.type] || '🔊 Audio Event';
    }

    /**
     * Start the always-on audio monitoring
     */
    start(config) {
        if (this.isRunning) {
            console.warn('[ALWAYS_ON_AUDIO] Service already running');
            return;
        }

        // Update config if provided
        if (config) {
            this.config = { ...this.config, ...config };
        }

        this.config.enabled = true;
        this.isRunning = true;
        this.startTime = Date.now();

        console.log(`[ALWAYS_ON_AUDIO] Starting with capture interval: ${this.config.captureInterval}ms`);
        console.log(`[ALWAYS_ON_AUDIO] Analysis interval: ${this.config.analysisInterval}ms`);
        console.log(`[ALWAYS_ON_AUDIO] Platform: ${audioCaptureService.getPlatform()}`);

        // Check availability first
        audioCaptureService.checkAvailability().then(avail => {
            if (!avail.available) {
                console.error(`[ALWAYS_ON_AUDIO] Audio capture not available: ${avail.error}`);
                this.stop();
                return;
            }
            console.log(`[ALWAYS_ON_AUDIO] Audio capture method: ${avail.method}`);
        });

        // Start continuous capture
        this.startCaptureLoop();

        // Start analysis loop
        this.startAnalysisLoop();

        console.log('[ALWAYS_ON_AUDIO] ✅ Service started');
    }

    /**
     * Start continuous audio capture loop
     */
    startCaptureLoop() {
        // Immediate first capture
        this.captureAudio();

        // Set up periodic captures
        this.captureIntervalId = setInterval(() => {
            this.captureAudio();
        }, this.config.captureInterval);
    }

    /**
     * Capture audio chunk
     */
    async captureAudio() {
        try {
            const result = await audioCaptureService.captureChunk({
                duration: this.config.captureInterval,
                sampleRate: this.config.sampleRate,
                channels: this.config.channels,
                format: this.config.format
            });

            if (result.success) {
                this.stats.captures++;
                
                // Add to queue for analysis
                this.chunkQueue.push({
                    filePath: result.filePath,
                    timestamp: Date.now(),
                    size: result.size
                });

                // Keep queue size manageable (max 5 chunks)
                if (this.chunkQueue.length > 5) {
                    const oldChunk = this.chunkQueue.shift();
                    // Clean up old file
                    this.cleanupChunk(oldChunk.filePath);
                }

                this.currentChunk = result;
            } else {
                console.error('[ALWAYS_ON_AUDIO] Capture failed:', result.error);
                this.stats.errors++;
            }
        } catch (error) {
            console.error('[ALWAYS_ON_AUDIO] Capture error:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Start audio analysis loop
     */
    startAnalysisLoop() {
        // Analyze after first interval
        setTimeout(() => {
            this.analyzeAudio();
        }, this.config.analysisInterval);

        // Set up periodic analysis
        this.analysisIntervalId = setInterval(() => {
            this.analyzeAudio();
        }, this.config.analysisInterval);
    }

    /**
     * Analyze audio chunks from queue
     */
    async analyzeAudio() {
        if (this.chunkQueue.length === 0) {
            return; // No chunks to analyze
        }

        try {
            // Get most recent chunk for analysis
            const chunk = this.chunkQueue[this.chunkQueue.length - 1];

            console.log(`[ALWAYS_ON_AUDIO] Analyzing audio chunk: ${chunk.filePath}`);

            // Analyze with Gemini
            const analysisResult = await audioAnalyzerService.analyzeAudio(chunk.filePath);

            if (analysisResult.success) {
                this.stats.analyses++;

                // Detect events from analysis
                const eventResult = audioEventDetector.detectEvents(analysisResult);

                if (eventResult.success && eventResult.events.length > 0) {
                    // Filter by enabled event types
                    const filteredEvents = eventResult.events.filter(event =>
                        this.config.eventTypes.includes(event.type)
                    );

                    // Filter by confidence/sensitivity
                    const confidentEvents = filteredEvents.filter(event =>
                        event.confidence >= this.config.sensitivity
                    );

                    // Deduplicate and sort
                    const deduplicated = audioEventDetector.deduplicateEvents(confidentEvents);
                    const sorted = audioEventDetector.sortEvents(deduplicated);

                    // Emit events
                    for (const event of sorted) {
                        eventBus.emit('audio-event', {
                            ...event,
                            source: 'always-on-audio',
                            audioFile: chunk.filePath,
                            analysisTimestamp: Date.now()
                        });
                    }
                }
            } else {
                console.error('[ALWAYS_ON_AUDIO] Analysis failed:', analysisResult.error);
                this.stats.errors++;
            }

            // Clean up analyzed chunk
            this.cleanupChunk(chunk.filePath);
            this.chunkQueue = this.chunkQueue.filter(c => c.filePath !== chunk.filePath);

        } catch (error) {
            console.error('[ALWAYS_ON_AUDIO] Analysis error:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Clean up audio chunk file
     */
    cleanupChunk(filePath) {
        try {
            const fs = require('fs');
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    /**
     * Stop the always-on audio monitoring
     */
    stop() {
        if (!this.isRunning) {
            console.warn('[ALWAYS_ON_AUDIO] Service not running');
            return;
        }

        this.config.enabled = false;
        this.isRunning = false;

        // Clear intervals
        if (this.captureIntervalId) {
            clearInterval(this.captureIntervalId);
            this.captureIntervalId = null;
        }

        if (this.analysisIntervalId) {
            clearInterval(this.analysisIntervalId);
            this.analysisIntervalId = null;
        }

        // Stop capture
        audioCaptureService.stopCapture().catch(error => {
            console.error('[ALWAYS_ON_AUDIO] Stop capture error:', error);
        });

        // Clean up queued chunks
        for (const chunk of this.chunkQueue) {
            this.cleanupChunk(chunk.filePath);
        }
        this.chunkQueue = [];

        // Calculate uptime
        this.stats.uptime = Date.now() - this.startTime;

        console.log('[ALWAYS_ON_AUDIO] Service stopped');
        console.log(`[ALWAYS_ON_AUDIO] Stats:`, this.getStats());
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            isRunning: this.isRunning,
            platform: audioCaptureService.getPlatform(),
            config: this.config,
            stats: this.getStats()
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: this.isRunning ? Date.now() - this.startTime : this.stats.uptime,
            queueSize: this.chunkQueue.length
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const wasRunning = this.isRunning;
        
        if (wasRunning) {
            this.stop();
        }

        this.config = { ...this.config, ...newConfig };

        if (wasRunning) {
            this.start();
        }

        console.log('[ALWAYS_ON_AUDIO] Configuration updated');
    }
}

// Export singleton instance
export const alwaysOnAudioService = new AlwaysOnAudioService();

