import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/genai';

async function testRealAPI() {
  console.log('🧪 Testing Real Gemini 2.5 API...\n');
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key found');
    process.exit(1);
  }
  
  console.log(`✅ API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log('🔄 Sending test prompt to Gemini 2.0 Flash...');
    const result = await model.generateContent('Say "Hello from Gemini 2.0!" in a fun way');
    const text = result.response.text();
    
    console.log('✅ SUCCESS! Response:');
    console.log(`   "${text}"\n`);
    
    // Test trading prompt
    console.log('🔄 Testing trading-style prompt...');
    const tradeResult = await model.generateContent(`You are a bullish crypto trader. Analyze BTC at $95,000 with RSI at 65. Should we go long? Return JSON:
{
  "action": "open_long",
  "confidence": 80,
  "reasoning": "your analysis"
}`);
    
    console.log('✅ Trading Response:');
    console.log(tradeResult.response.text());
    
    console.log('\n🎉 All tests passed! Gemini 2.0 is working.\n');
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.status) console.error(`   Status: ${error.status}`);
    console.error('\n💡 Suggestions:');
    console.error('   1. Verify API key at: https://aistudio.google.com/apikey');
    console.error('   2. Check if Gemini API is enabled for your project');
    console.error('   3. Ensure billing is set up (if required)\n');
    process.exit(1);
  }
}

testRealAPI();
