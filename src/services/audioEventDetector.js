/**
 * Audio Event Detector
 * Pattern matching and classification for audio events
 * Processes analysis results and identifies actionable events
 */

class AudioEventDetector {
    constructor() {
        this.eventPatterns = {
            doorbell: {
                keywords: ['doorbell', 'door bell', 'ding dong', 'chime'],
                priority: 'MEDIUM',
                category: 'household',
                minConfidence: 0.7
            },
            smoke_alarm: {
                keywords: ['smoke alarm', 'fire alarm', 'beep', 'beeping', 'alarm'],
                priority: 'CRITICAL',
                category: 'security',
                minConfidence: 0.8
            },
            phone_ring: {
                keywords: ['phone', 'ringing', 'ring', 'call', 'telephone'],
                priority: 'MEDIUM',
                category: 'household',
                minConfidence: 0.7
            },
            security_alert: {
                keywords: ['security', 'intruder', 'break-in', 'break in', 'unauthorized'],
                priority: 'CRITICAL',
                category: 'security',
                minConfidence: 0.8
            },
            unusual_noise: {
                keywords: ['unusual', 'strange', 'concerning', 'suspicious', 'unexpected'],
                priority: 'HIGH',
                category: 'security',
                minConfidence: 0.6
            },
            glass_breaking: {
                keywords: ['glass', 'breaking', 'shatter', 'smash'],
                priority: 'CRITICAL',
                category: 'security',
                minConfidence: 0.8
            }
        };

        console.log('[AUDIO_EVENT_DETECTOR] Initialized');
    }

    /**
     * Detect events from audio analysis result
     * Returns structured events with priority and metadata
     */
    detectEvents(analysisResult) {
        if (!analysisResult || !analysisResult.success) {
            return {
                success: false,
                events: [],
                error: analysisResult?.error || 'Invalid analysis result'
            };
        }

        const detectedEvents = [];
        const analysis = analysisResult.analysis || {};

        // Process events from analysis
        if (analysis.events && Array.isArray(analysis.events)) {
            for (const event of analysis.events) {
                const classifiedEvent = this.classifyEvent(event);
                if (classifiedEvent) {
                    detectedEvents.push(classifiedEvent);
                }
            }
        }

        // If no structured events but summary exists, try keyword matching
        if (detectedEvents.length === 0 && analysis.summary) {
            const keywordEvents = this.detectFromSummary(analysis.summary);
            detectedEvents.push(...keywordEvents);
        }

        return {
            success: true,
            events: detectedEvents,
            count: detectedEvents.length,
            timestamp: Date.now()
        };
    }

    /**
     * Classify and enhance an event from analysis
     */
    classifyEvent(event) {
        if (!event || !event.type) {
            return null;
        }

        const eventType = event.type.toLowerCase();
        const pattern = this.eventPatterns[eventType];

        // Use pattern if available, otherwise use event as-is
        const confidence = event.confidence || 0.5;
        const minConfidence = pattern?.minConfidence || 0.5;

        if (confidence < minConfidence) {
            return null; // Below confidence threshold
        }

        return {
            type: eventType,
            confidence: confidence,
            priority: event.priority || pattern?.priority || 'MEDIUM',
            category: pattern?.category || 'other',
            description: event.description || `${eventType} detected`,
            timestamp: event.timestamp || Date.now(),
            rawEvent: event
        };
    }

    /**
     * Detect events from summary text using keyword matching
     */
    detectFromSummary(summary) {
        const events = [];
        const lowerSummary = summary.toLowerCase();

        for (const [eventType, pattern] of Object.entries(this.eventPatterns)) {
            const hasKeyword = pattern.keywords.some(keyword => 
                lowerSummary.includes(keyword.toLowerCase())
            );

            if (hasKeyword) {
                events.push({
                    type: eventType,
                    confidence: 0.7, // Default confidence for keyword match
                    priority: pattern.priority,
                    category: pattern.category,
                    description: `${eventType} detected from audio analysis`,
                    timestamp: Date.now(),
                    detectionMethod: 'keyword'
                });
            }
        }

        return events;
    }

    /**
     * Filter events by priority
     */
    filterByPriority(events, minPriority = 'LOW') {
        const priorityLevels = {
            'CRITICAL': 4,
            'HIGH': 3,
            'MEDIUM': 2,
            'LOW': 1
        };

        const minLevel = priorityLevels[minPriority] || 1;

        return events.filter(event => {
            const eventLevel = priorityLevels[event.priority] || 1;
            return eventLevel >= minLevel;
        });
    }

    /**
     * Get events by category
     */
    getEventsByCategory(events, category) {
        return events.filter(event => event.category === category);
    }

    /**
     * Deduplicate similar events (same type within time window)
     */
    deduplicateEvents(events, timeWindow = 5000) {
        const deduplicated = [];
        const seen = new Map();

        for (const event of events) {
            const key = event.type;
            const lastSeen = seen.get(key);

            if (!lastSeen || (event.timestamp - lastSeen.timestamp) > timeWindow) {
                deduplicated.push(event);
                seen.set(key, event);
            }
        }

        return deduplicated;
    }

    /**
     * Sort events by priority and timestamp
     */
    sortEvents(events) {
        const priorityOrder = {
            'CRITICAL': 4,
            'HIGH': 3,
            'MEDIUM': 2,
            'LOW': 1
        };

        return events.sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
            if (priorityDiff !== 0) return priorityDiff;
            
            // If same priority, sort by timestamp (newest first)
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    }
}

// Export singleton instance
export const audioEventDetector = new AudioEventDetector();

