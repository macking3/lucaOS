/**
 * Voice Command Service
 * Handles command validation, risk detection, and interpretation
 */

// High-risk commands that require confirmation
const HIGH_RISK_KEYWORDS = [
    'delete', 'wipe', 'format', 'uninstall', 'remove',
    'shutdown', 'restart', 'disconnect', 'clear', 'reset',
    'drop', 'truncate', 'kill', 'terminate', 'destroy',
    'send', 'email', 'message', 'post', 'publish', 'share' // Prevent accidental sending
];

// Commands that might be misinterpreted (especially with accents)
const POTENTIALLY_MISINTERPRETED = [
    /^(open|close|launch|start|stop)/i,
    /^(search|find|look)/i,
    /^(create|make|build)/i
];

// Commands that might be misinterpreted
const AMBIGUOUS_PATTERNS = [
    /^(delete|remove|clear)\s+(all|everything|all files)/i,
    /^(format|wipe)\s+(disk|drive|system)/i,
    /^(shutdown|restart)\s+(system|computer|server)/i
];

export interface CommandAnalysis {
    original: string;
    interpreted: string;
    isRisky: boolean;
    requiresConfirmation: boolean;
    confidence?: number;
    riskLevel: 'low' | 'medium' | 'high';
}

export const voiceCommandService = {
    /**
     * Analyze a voice command for risk and interpretation
     */
    analyzeCommand(transcript: string, confidence?: number): CommandAnalysis {
        const lowerTranscript = transcript.toLowerCase().trim();
        
        // Filter out wake words
        const wakeWords = ['hey luca', 'luca', 'ok luca', 'okay luca', 'hi luca', 'hello luca'];
        if (wakeWords.some(w => lowerTranscript === w || lowerTranscript.startsWith(w + ' '))) {
            return {
                original: transcript,
                interpreted: transcript,
                isRisky: false,
                requiresConfirmation: false,
                confidence: 1.0,
                riskLevel: 'low'
            };
        }
        
        // Check for high-risk keywords
        const hasRiskyKeyword = HIGH_RISK_KEYWORDS.some(keyword => 
            lowerTranscript.includes(keyword)
        );

        // Check for ambiguous patterns
        const hasAmbiguousPattern = AMBIGUOUS_PATTERNS.some(pattern => 
            pattern.test(transcript)
        );

        // Check for potentially misinterpreted commands (especially with accents)
        const mightBeMisinterpreted = POTENTIALLY_MISINTERPRETED.some(pattern => 
            pattern.test(transcript)
        );

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (hasAmbiguousPattern) {
            riskLevel = 'high';
        } else if (hasRiskyKeyword) {
            riskLevel = 'medium';
        } else if (mightBeMisinterpreted) {
            riskLevel = 'medium'; // Medium risk for potentially misinterpreted commands
        }

        // Low confidence also requires confirmation
        const lowConfidence = confidence !== undefined && confidence < 0.7;

        return {
            original: transcript,
            interpreted: transcript, // In future, could use LLM to interpret/expand
            isRisky: hasRiskyKeyword || hasAmbiguousPattern,
            requiresConfirmation: hasRiskyKeyword || hasAmbiguousPattern || mightBeMisinterpreted || lowConfidence,
            confidence,
            riskLevel
        };
    },

    /**
     * Check if a command requires confirmation
     */
    requiresConfirmation(transcript: string, confidence?: number): boolean {
        const analysis = this.analyzeCommand(transcript, confidence);
        return analysis.requiresConfirmation;
    },

    /**
     * Get risk level of a command
     */
    getRiskLevel(transcript: string): 'low' | 'medium' | 'high' {
        return this.analyzeCommand(transcript).riskLevel;
    }
};

