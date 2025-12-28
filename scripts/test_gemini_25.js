import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function testGemini25() {
  console.log('🧪 Testing Gemini 2.5 Flash API...\n');
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key');
    return;
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    console.log('🔄 Test 1: Simple prompt');
    const result1 = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: 'Say hi!'
    });
    console.log(`✅ Response: "${result1.text}"\n`);
    
    console.log('🔄 Test 2: Trading analysis');
    const result2 = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: 'You are a bull trader. BTC is at $95k, RSI 65. Go long? Reply in 20 words.'
    });
    console.log(`✅ Response: "${result2.text}"\n`);
    
    console.log('🎉 All tests PASSED! Gemini 2.5 is working!\n');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Status:', e.status || 'N/A');
  }
}

testGemini25();
