/**
 * Audio Analyzer Service
 * Analyzes audio using Gemini Audio API for event detection
 * Background audio analysis for Always-On Audio Monitoring System
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

class AudioAnalyzerService {
    constructor() {
        this.apiKey = null;
        this.client = null;
        this.initialized = false;
        
        console.log('[AUDIO_ANALYZER] Initialized');
    }

    /**
     * Lazy initialization - only load API key when needed
     */
    async initialize() {
        if (this.initialized && this.client) {
            return;
        }

        // Get API key from environment (lazy load)
        this.apiKey = process.env.API_KEY || process.env.GOOGLE_AI_API_KEY;
        
        if (!this.apiKey) {
            console.warn('[AUDIO_ANALYZER] API key not configured, skipping analysis');
            return;
        }

        try {
            this.client = new GoogleGenerativeAI(this.apiKey);
            this.initialized = true;
            console.log('[AUDIO_ANALYZER] Initialized with Gemini API');
        } catch (error) {
            console.error('[AUDIO_ANALYZER] Initialization failed:', error.message);
        }
    }

    /**
     * Analyze audio file for events and context
     * Returns structured analysis with detected events
     */
    async analyzeAudio(audioFilePath, options = {}) {
        if (!audioFilePath || !fs.existsSync(audioFilePath)) {
            return {
                success: false,
                error: 'Audio file not found'
            };
        }

        await this.initialize();

        if (!this.client) {
            return {
                success: false,
                error: 'Gemini API not initialized. Check API key configuration.'
            };
        }

        try {
            const audioFile = {
                inlineData: {
                    data: fs.readFileSync(audioFilePath).toString('base64'),
                    mimeType: this.detectMimeType(audioFilePath)
                }
            };

            // Analysis prompt for event detection
            const prompt = `Analyze this audio clip and identify any significant events, sounds, or alerts.

Focus on detecting:
1. Security alerts (smoke alarms, break-ins, glass breaking, etc.)
2. Household events (doorbell, phone ringing, door opening/closing)
3. Unusual or concerning sounds
4. Important notifications (alarms, alerts, beeps)

For each detected event, provide:
- Event type (e.g., "doorbell", "smoke_alarm", "phone_ring", "unusual_noise")
- Confidence level (0.0 to 1.0)
- Timestamp in audio (if applicable)
- Priority level: CRITICAL, HIGH, MEDIUM, or LOW
- Description of what you heard

If no significant events are detected, respond with: "no_events"

Return your response in JSON format:
{
  "events": [
    {
      "type": "event_type",
      "confidence": 0.95,
      "priority": "HIGH",
      "description": "Clear description",
      "timestamp": 2.5
    }
  ],
  "summary": "Brief summary of audio content"
}`;

            // Use Gemini 1.5 Flash or Pro for audio analysis
            const model = this.client.getGenerativeModel({ 
                model: 'gemini-2.0-flash' // Flash supports audio
            });

            const result = await model.generateContent([prompt, audioFile]);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            let analysis;
            try {
                // Extract JSON from response (may have markdown code blocks)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                } else {
                    // Fallback: try parsing entire response
                    analysis = JSON.parse(text);
                }
            } catch (parseError) {
                // If JSON parsing fails, create structured response from text
                analysis = this.parseTextResponse(text);
            }

            return {
                success: true,
                analysis: analysis,
                rawResponse: text,
                audioFile: audioFilePath
            };

        } catch (error) {
            console.error('[AUDIO_ANALYZER] Analysis failed:', error.message);
            return {
                success: false,
                error: error.message,
                audioFile: audioFilePath
            };
        }
    }

    /**
     * Parse text response if JSON parsing fails
     */
    parseTextResponse(text) {
        const events = [];
        const lowerText = text.toLowerCase();

        // Pattern matching for common events
        if (lowerText.includes('doorbell') || lowerText.includes('door bell')) {
            events.push({
                type: 'doorbell',
                confidence: 0.8,
                priority: 'MEDIUM',
                description: 'Doorbell detected',
                timestamp: null
            });
        }

        if (lowerText.includes('smoke alarm') || lowerText.includes('fire alarm')) {
            events.push({
                type: 'smoke_alarm',
                confidence: 0.9,
                priority: 'CRITICAL',
                description: 'Smoke alarm detected',
                timestamp: null
            });
        }

        if (lowerText.includes('phone') && (lowerText.includes('ring') || lowerText.includes('ringing'))) {
            events.push({
                type: 'phone_ring',
                confidence: 0.8,
                priority: 'MEDIUM',
                description: 'Phone ringing detected',
                timestamp: null
            });
        }

        if (lowerText.includes('unusual') || lowerText.includes('concerning') || lowerText.includes('strange')) {
            events.push({
                type: 'unusual_noise',
                confidence: 0.6,
                priority: 'HIGH',
                description: 'Unusual noise detected',
                timestamp: null
            });
        }

        return {
            events: events.length > 0 ? events : [],
            summary: text.substring(0, 200)
        };
    }

    /**
     * Detect MIME type from file extension
     */
    detectMimeType(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();
        const mimeTypes = {
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg',
            'm4a': 'audio/mp4',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
            'webm': 'audio/webm'
        };
        return mimeTypes[ext] || 'audio/wav';
    }

    /**
     * Check if service is ready
     */
    isReady() {
        return this.initialized && this.client !== null;
    }
}

// Export singleton instance
export const audioAnalyzerService = new AudioAnalyzerService();

