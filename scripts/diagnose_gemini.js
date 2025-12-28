import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function diagnose() {
  console.log('🔍 Diagnosing Gemini API Configuration...\n');
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log('1. API Key Check:');
  console.log(`   Format: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING'}`);
  console.log(`   Length: ${apiKey?.length || 0} chars`);
  console.log(`   Valid prefix: ${apiKey?.startsWith('AIza') ? '✅' : '❌'}\n`);
  
  if (!apiKey) {
    console.error('❌ No API key found. Set GEMINI_API_KEY in .env');
    return;
  }
  
  console.log('2. SDK Version Check:');
  const pkg = await import('../package.json', { assert: { type: 'json' } });
  console.log(`   @google/generative-ai: ${pkg.default.dependencies['@google/generative-ai']}\n`);
  
  console.log('3. Testing Model Access:\n');
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try different model naming patterns
  const modelVariants = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-flash-latest',
    'models/gemini-pro'
  ];
  
  for (const modelName of modelVariants) {
    process.stdout.write(`   Testing "${modelName}"... `);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hi');
      const text = result.response.text();
      console.log(`✅ SUCCESS (response: "${text.substring(0, 20)}...")`);
      console.log(`\n🎉 WORKING MODEL FOUND: "${modelName}"\n`);
      return modelName;
    } catch (e) {
      console.log(`❌ ${e.status || 'ERROR'} - ${e.message?.substring(0, 60) || 'Unknown'}`);
    }
  }
  
  console.log('\n❌ No working model found. Possible issues:');
  console.log('   - API key may not have Gemini API enabled');
  console.log('   - Region restriction');
  console.log('   - SDK version incompatibility');
  console.log('\n💡 Try: https://aistudio.google.com/app/apikey to verify your key\n');
}

diagnose();
