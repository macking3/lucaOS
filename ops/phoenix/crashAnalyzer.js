/**
 * Phoenix Crash Analyzer
 * Uses Gemini AI to analyze crash logs and suggest fixes
 */

async function analyzeCrashWithAI(crashLog) {
  try {
    // Import Google GenAI
    const { GoogleGenAI } = require('@google/genai');
    
    // Get API key
    const apiKey = process.env.VITE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn('[PHOENIX] No API key available for AI analysis');
      return {
        issue: 'API key missing - cannot analyze crash',
        canAutoFix: false
      };
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    // Extract most relevant crash info (last 2000 chars)
    const relevantLogs = crashLog.slice(-2000);
    
    const prompt = `You are a senior debugging AI for LUCA OS. Analyze this crash log and provide fix suggestions.

CRASH LOG (last 2000 chars):
${relevantLogs}

Analyze and respond in JSON format:
{
  "issue": "brief description of the problem",
  "rootCause": "detailed technical explanation",
  "file": "path/to/problematic/file.ts or null",
  "line": line_number or null,
  "suggestedFix": "code snippet or explanation of fix",
  "canAutoFix": true/false (true only if it's a simple syntax error or missing import)
}

IMPORTANT:
- Only set canAutoFix to true for simple fixes (syntax errors, missing imports, typos)
- For logic errors, architectural issues, or complex bugs, set canAutoFix to false
- Be conservative with auto-fix recommendations
`;
    
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;
    }
    
    // If no JSON found, return basic analysis
    return {
      issue: "Could not parse AI analysis",
      rootCause: responseText.slice(0, 200),
      canAutoFix: false
    };
    
  } catch (e) {
    console.error('[PHOENIX] AI Analysis Error:', e.message);
    return {
      issue: `Analysis failed: ${e.message}`,
      canAutoFix: false
    };
  }
}

module.exports = { analyzeCrashWithAI };
