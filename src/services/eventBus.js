/**
 * Event Bus Service
 * Centralized event system for Always-On Vision System
 * Handles event prioritization, queuing, and logging
 */

import { EventEmitter } from 'events';

const PRIORITY_ORDER = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
};

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.eventQueue = [];
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.isProcessing = false;
        console.log('[EVENT_BUS] Initialized');
    }

    /**
     * Emit a vision event with prioritization
     */
    emitEvent(event) {
        // Ensure timestamp is set
        if (!event.context) {
            event.context = { timestamp: Date.now() };
        } else if (!event.context.timestamp) {
            event.context.timestamp = Date.now();
        }

        // Add to queue
        this.eventQueue.push(event);

        // Sort by priority (highest first)
        this.eventQueue.sort((a, b) => {
            return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        });

        // Log event
        this.logEvent(event);

        // Emit to listeners
        this.emit('vision-event', event);

        // Also emit type-specific events for targeted listeners
        this.emit(`vision-event:${event.type}`, event);
        this.emit(`vision-event:${event.priority}`, event);

        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Process event queue (emit highest priority first)
     */
    async processQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Process events one by one, starting with highest priority
            while (this.eventQueue.length > 0) {
                const event = this.eventQueue.shift();
                if (event) {
                    // Event already emitted in emitEvent, just log
                    console.log(`[EVENT_BUS] Processing ${event.priority} priority event: ${event.message}`);
                    
                    // Small delay between events to avoid flooding
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Log event to history
     */
    logEvent(event) {
        this.eventHistory.push({
            event,
            timestamp: Date.now(),
            acknowledged: false
        });

        // Keep history size manageable
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history
     */
    getHistory(limit) {
        const history = [...this.eventHistory].reverse(); // Newest first
        return limit ? history.slice(0, limit) : history;
    }

    /**
     * Get unacknowledged events
     */
    getUnacknowledgedEvents() {
        return this.eventHistory.filter(entry => !entry.acknowledged);
    }

    /**
     * Acknowledge an event
     */
    acknowledgeEvent(index) {
        if (index >= 0 && index < this.eventHistory.length) {
            // Reverse index since history is reversed when retrieved
            const actualIndex = this.eventHistory.length - 1 - index;
            if (actualIndex >= 0) {
                this.eventHistory[actualIndex].acknowledged = true;
                return true;
            }
        }
        return false;
    }

    /**
     * Clear event queue
     */
    clearQueue() {
        this.eventQueue = [];
        console.log('[EVENT_BUS] Event queue cleared');
    }

    /**
     * Get queue size
     */
    getQueueSize() {
        return this.eventQueue.length;
    }

    /**
     * Get statistics
     */
    getStats() {
        const recentThreshold = Date.now() - (60 * 60 * 1000); // Last hour
        const recentEvents = this.eventHistory.filter(
            entry => entry.timestamp > recentThreshold
        ).length;

        return {
            queueSize: this.eventQueue.length,
            historySize: this.eventHistory.length,
            unacknowledged: this.getUnacknowledgedEvents().length,
            recentEvents
        };
    }
}

// Export singleton instance
export const eventBus = new EventBus();
export default eventBus;
