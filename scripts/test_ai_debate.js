import 'dotenv/config';
import debateManager from '../cortex/server/services/tradingDebateService.js';

async function testDebate() {
  console.log('🧪 Testing AI Debate System...');
  
  // 1. Check Key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ FAIL: GEMINI_API_KEY is missing from .env');
    process.exit(1);
  }
  console.log('✅ API Key found in environment');

  // 2. Start Debate
  try {
    console.log('🔄 Initiating debate session...');
    const session = await debateManager.startDebate({
      symbol: 'BTC/USDT',
      participants: ['bull', 'bear'], // Reduced for speed
      maxRounds: 1
    });
    
    if (session && session.id) {
      console.log(`✅ Debate started successfully! Session ID: ${session.id}`);
      console.log(`   Participants: ${session.participants.map(p => p.name).join(', ')}`);
      
      // Wait a moment to see if it moves to 'running' or fails asynchronously
      await new Promise(r => setTimeout(r, 2000));
      const updated = debateManager.getDebate(session.id);
      console.log(`   Current Status: ${updated.status}`);
      
      if (updated.status === 'failed') {
        console.error('❌ Debate FAILED during execution:', updated.error);
      } else {
        console.log('✅ AI Service appears operational');
      }
    } else {
      console.error('❌ Failed to create session object');
    }

  } catch (error) {
    console.error('❌ Unexpected Error:', error);
  }
}

testDebate();
