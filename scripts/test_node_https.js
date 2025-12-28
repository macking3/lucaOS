import https from 'https';
import { URLSearchParams } from 'url';

async function testNodeHTTP() {
  console.log('🔍 Testing Node.js HTTPS Module Directly...\n');
  
  // Test with native https module (not fetch)
  console.log('1. Using native https.get()...');
  
  return new Promise((resolve) => {
    https.get('https://api.binance.com/api/v3/ping', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   ✅ Status:', res.statusCode);
        console.log('   ✅ Response:', data);
        resolve(true);
      });
    }).on('error', (e) => {
      console.log('   ❌ Error:', e.message);
      console.log('   Error code:', e.code);
      console.log('   Error syscall:', e.syscall);
      
      // Diagnose specific errors
      if (e.code === 'ETIMEDOUT') {
        console.log('\n💡 Timeout - possible firewall or network issue');
      } else if (e.code === 'ENOTFOUND') {
        console.log('\n💡 DNS resolution failed - check DNS settings');
      } else if (e.code === 'ECONNREFUSED') {
        console.log('\n💡 Connection refused - possible proxy blocking');
      }
      
      resolve(false);
    });
  });
}

testNodeHTTP();
