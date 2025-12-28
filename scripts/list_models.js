import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('No API Key');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  // Hack to access model list if not exposed directly on main class
  // Usually it's via a model manager or similar, but the error message suggested "Call ListModels"
  // The JS SDK might wrap this differently.
  // Actually, standard way:
  try {
      // The SDK doesn't expose listModels on the top level easily in older versions, 
      // but let's try a simple generation with a known model fallback to check connection first.
      // If SDK version is new, maybe we can't easily list.
      // Let's try 'gemini-1.5-flash-001' or 'gemini-1.0-pro' 
      
      console.log('Testing specific model names...');
      const candidates = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];
      
      for (const name of candidates) {
          process.stdout.write(`Testing ${name}... `);
          try {
            const model = genAI.getGenerativeModel({ model: name });
            const result = await model.generateContent('Hi');
            console.log('✅ OK');
            process.exit(0); // Found a working one
          } catch (e) {
            console.log('❌ ' + e.status);
          }
      }
  } catch (e) {
      console.error(e);
  }
}

listModels();
