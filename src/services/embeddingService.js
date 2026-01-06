/**
 * Embedding Service - JavaScript wrapper for memoryService
 * This provides a CommonJS/ESM compatible interface for Node.js backend services
 */

// Since memoryService is TypeScript, we need to use a workaround
// We'll use the Google GenAI SDK directly here for backend embedding generation

import { GoogleGenAI } from '@google/genai';

let aiInstance = null;

const getAI = () => {
    if (aiInstance) return aiInstance;
    
    // Get API key from environment
    const key = process.env.VITE_API_KEY || 
                process.env.API_KEY || 
                process.env.GEMINI_API_KEY || 
                '';
    
    if (!key) {
        console.warn('[EMBEDDING] No API Key found in environment');
        return null;
    }
    
    try {
        aiInstance = new GoogleGenAI({ apiKey: key });
        console.log('[EMBEDDING] Initialized with API key from environment');
    } catch (e) {
        console.error('[EMBEDDING] Failed to init GoogleGenAI:', e);
    }
    return aiInstance;
};

export const embeddingService = {
    /**
     * Generate Embedding Vector for text using Gemini embedding model
     */
    async generateEmbedding(text) {
        try {
            const client = getAI();
            if (!client) {
                console.warn('[EMBEDDING] No AI client available, returning empty vector');
                return [];
            }
            
            const result = await client.models.embedContent({
                model: 'text-embedding-004',
                contents: [{ parts: [{ text }] }]
            });
            return result.embeddings?.[0]?.values || [];
        } catch (e) {
            console.error('[EMBEDDING] Generation failed:', e.message);
            return []; // Fallback to empty vector
        }
    }
};
