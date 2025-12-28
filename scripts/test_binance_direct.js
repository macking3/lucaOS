import https from 'https';
import http from 'http';

async function testDirectAPI() {
  console.log('🔍 Testing Direct Binance API Access...\n');
  
  // Test 1: Direct HTTPS request to Binance
  console.log('1. Testing api.binance.com/api/v3/ping...');
  try {
    const response = await fetch('https://api.binance.com/api/v3/ping');
    const data = await response.json();
    console.log('   ✅ SUCCESS:', response.status, data);
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
  }
  
  // Test 2: Test time endpoint
  console.log('\n2. Testing api.binance.com/api/v3/time...');
  try {
    const response = await fetch('https://api.binance.com/api/v3/time');
    const data = await response.json();
    console.log('   ✅ SUCCESS:', new Date(data.serverTime));
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
  }
  
  // Test 3: Test exchangeInfo
  console.log('\n3. Testing api.binance.com/api/v3/exchangeInfo?symbol=BTCUSDT...');
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo?symbol=BTCUSDT');
    const data = await response.json();
    console.log('   ✅ SUCCESS:', data.symbols?.[0]?.symbol || 'Data received');
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
  }
  
  // Test 4: Test Bybit
  console.log('\n4. Testing api.bybit.com/v5/market/time...');
  try {
    const response = await fetch('https://api.bybit.com/v5/market/time');
    const data = await response.json();
    console.log('   ✅ SUCCESS:', data);
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
  }
  
  // Test 5: CCXT direct instantiation
  console.log('\n5. Testing CCXT Binance instantiation...');
  try {
    const ccxt = await import('ccxt');
    const exchange = new ccxt.binance({
      enableRateLimit: true,
      options: {
        defaultType: 'future'
      }
    });
    
    console.log('   Loading markets...');
    await exchange.loadMarkets();
    console.log('   ✅ Markets loaded:', Object.keys(exchange.markets).length);
    
    console.log('   Fetching BTC/USDT ticker...');
    const ticker = await exchange.fetchTicker('BTC/USDT');
    console.log('   ✅ BTC Price:', ticker.last);
    
  } catch (e) {
    console.log('   ❌ CCXT FAILED:', e.message);
    console.log('   Stack:', e.stack?.split('\n')[0]);
  }
}

testDirectAPI();
