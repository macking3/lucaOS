import { GoogleGenAI } from "@google/genai";
// import { settingsService } from "./settingsService"; // Removed to avoid Node.js crash

// Initialize AI for Embeddings
let aiInstance = null;

const getAI = () => {
    if (aiInstance) return aiInstance;
    
    // settingsService might not be ready in module scope if cyclic dependency, 
    // but usually fine in function scope.
    // const settingsKey = settingsService.get("brain").geminiApiKey; // Removed for Node compatibility
    const envKey = (typeof process !== 'undefined' && (process.env.API_KEY || process.env.GEMINI_API_KEY)) || 
                   (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_KEY);
    
    const key = envKey || "";
    
    try {
        aiInstance = new GoogleGenAI({ apiKey: key });
    } catch (e) {
        console.error("Failed to init embedding AI", e);
    }
    return aiInstance;
};


export const embeddingService = {
    /**
     * Generate Embedding Vector for text using Gemini 2.5 Flash or embedding model
     */
    async generateEmbedding(text) {
        try {
            const client = getAI();
            if (!client) return [];
            
            const result = await client.models.embedContent({
                model: "text-embedding-004",
                contents: [{ parts: [{ text }] }]
            });
            return result.embeddings?.[0]?.values || [];
        } catch (e) {
            console.error("Embedding Generation Failed:", e);
            return []; // Fallback
        }
    }
};
