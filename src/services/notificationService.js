/**
 * Notification Service
 * Handles proactive notifications for Always-On Vision System
 * Supports voice (TTS), visual (toast), and text (chat) notifications
 */

// Simple sound service stub (backend doesn't need full sound service)
const soundService = {
    play: (type) => {
        // Backend can't play sounds, just log
        console.log(`[SOUND] Would play: ${type}`);
    }
};

class NotificationService {
    constructor() {
        this.preferences = {
            voiceEnabled: true,
            visualEnabled: true,
            chatEnabled: true,
            priorityThreshold: 'MEDIUM', // Notify for MEDIUM, HIGH, and CRITICAL
            enabled: true
        };

        this.notificationHistory = [];
        console.log('[NOTIFICATION] Service initialized');
        this.loadPreferences();
    }

    /**
     * Notify user about a vision event
     */
    async notify(event) {
        if (!this.preferences.enabled) {
            console.log('[NOTIFICATION] Notifications disabled, skipping');
            return;
        }

        // Check priority threshold
        if (!this.shouldNotifyForPriority(event.priority)) {
            console.log(`[NOTIFICATION] Event priority ${event.priority} below threshold ${this.preferences.priorityThreshold}`);
            return;
        }

        try {
            // Voice notification (TTS)
            if (this.preferences.voiceEnabled) {
                await this.notifyVoice(event);
            }

            // Visual notification (toast)
            if (this.preferences.visualEnabled) {
                await this.notifyVisual(event);
            }

            // Chat notification (if chat enabled)
            if (this.preferences.chatEnabled) {
                await this.notifyChat(event);
            }

            // Log to history
            this.notificationHistory.push({
                event,
                timestamp: Date.now(),
                delivered: true
            });

            // Keep history size manageable (last 50)
            if (this.notificationHistory.length > 50) {
                this.notificationHistory.shift();
            }

            console.log(`[NOTIFICATION] ✓ Notified: ${event.message}`);
        } catch (error) {
            console.error('[NOTIFICATION] Failed to send notification:', error.message);
        }
    }

    /**
     * Voice notification using TTS
     */
    async notifyVoice(event) {
        // Format message for voice
        const voiceMessage = this.formatVoiceMessage(event);
        
        // Use sound service for audio feedback
        // TODO: Integrate with TTS service when available
        // For now, just play a sound alert
        soundService.play('ALERT');

        console.log(`[NOTIFICATION] 🔊 Voice: ${voiceMessage}`);
        
        // In the future, this would call a TTS service:
        // await ttsService.speak(voiceMessage);
    }

    /**
     * Visual notification (toast)
     * This would emit an event that the frontend can listen to
     */
    async notifyVisual(event) {
        // Format visual notification
        const visualNotification = {
            type: event.type,
            priority: event.priority,
            title: this.getNotificationTitle(event),
            message: event.message,
            timestamp: Date.now(),
            actionSuggested: event.actionSuggested
        };

        // Emit event that frontend can listen to
        // This will be handled by server.js emitting to socket.io clients
        // TODO: Integrate with server.js socket.io
        
        console.log(`[NOTIFICATION] 📺 Visual: ${visualNotification.title} - ${visualNotification.message}`);
    }

    /**
     * Chat notification
     * Adds a message to the conversation from LUCA
     */
    async notifyChat(event) {
        const chatMessage = this.formatChatMessage(event);
        
        // This would add a message to the chat
        // TODO: Integrate with conversation service or App.tsx
        // For now, just log
        
        console.log(`[NOTIFICATION] 💬 Chat: ${chatMessage}`);
    }

    /**
     * Format message for voice notification
     */
    formatVoiceMessage(event) {
        const prefix = event.priority === 'CRITICAL' ? 'Sir, urgent: ' :
                      event.priority === 'HIGH' ? 'Sir, ' : '';
        
        return `${prefix}${event.message}`;
    }

    /**
     * Format message for chat notification
     */
    formatChatMessage(event) {
        const priorityEmoji = {
            CRITICAL: '🚨',
            HIGH: '⚠️',
            MEDIUM: 'ℹ️',
            LOW: '💡'
        };

        const emoji = priorityEmoji[event.priority] || 'ℹ️';
        let message = `${emoji} **${event.priority}**: ${event.message}`;

        if (event.actionSuggested) {
            message += `\n\n*Suggested action: ${event.actionSuggested}*`;
        }

        return message;
    }

    /**
     * Get notification title based on event type
     */
    getNotificationTitle(event) {
        const titles = {
            error: '🚨 Error Detected',
            warning: '⚠️ Warning',
            success: '✅ Success',
            info: 'ℹ️ Information',
            opportunity: '💡 Opportunity'
        };

        return titles[event.type] || 'Notification';
    }

    /**
     * Check if we should notify for this priority
     */
    shouldNotifyForPriority(priority) {
        const priorityOrder = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1
        };

        const thresholdOrder = priorityOrder[this.preferences.priorityThreshold] || 2;
        const eventOrder = priorityOrder[priority] || 2;

        return eventOrder >= thresholdOrder;
    }

    /**
     * Update notification preferences
     */
    updatePreferences(prefs) {
        this.preferences = { ...this.preferences, ...prefs };
        this.savePreferences();
        console.log('[NOTIFICATION] Preferences updated:', this.preferences);
    }

    /**
     * Get current preferences
     */
    getPreferences() {
        return { ...this.preferences };
    }

    /**
     * Load preferences from storage (localStorage or file)
     */
    loadPreferences() {
        try {
            // TODO: Load from localStorage (browser) or file (Node.js)
            // For now, use defaults
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('luca_notification_prefs');
                if (saved) {
                    this.preferences = { ...this.preferences, ...JSON.parse(saved) };
                }
            }
        } catch (error) {
            console.warn('[NOTIFICATION] Failed to load preferences, using defaults');
        }
    }

    /**
     * Save preferences to storage
     */
    savePreferences() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('luca_notification_prefs', JSON.stringify(this.preferences));
            }
        } catch (error) {
            console.warn('[NOTIFICATION] Failed to save preferences');
        }
    }

    /**
     * Get notification history
     */
    getHistory(limit) {
        const history = [...this.notificationHistory].reverse(); // Newest first
        return limit ? history.slice(0, limit) : history;
    }

    /**
     * Clear notification history
     */
    clearHistory() {
        this.notificationHistory = [];
        console.log('[NOTIFICATION] History cleared');
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
