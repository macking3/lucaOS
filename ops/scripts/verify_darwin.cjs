const http = require('http');
const fs = require('fs');
const path = require('path');

// Test Config
const TARGET_FILE = 'darwin_test_subject.ts';
const TARGET_PATH = path.join(__dirname, '../../', TARGET_FILE);
const API_URL = 'http://localhost:3001/api/evolution/evolve';

// Utils
function log(msg, type = 'INFO') {
    console.log(`[${type}] ${msg}`);
}

function post(data) {
    return new Promise((resolve, reject) => {
        const req = http.request(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    console.log('RAW RESPONSE:', body);
                    reject(new Error('Failed to parse JSON response'));
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTest() {
    log('--- STARTING DARWIN VERIFICATION ---');

    // 1. Create a Target File
    const originalCode = 'export const x: number = 1;';
    fs.writeFileSync(TARGET_PATH, originalCode);
    log(`Created target file: ${TARGET_FILE}`);

    try {
        // 2. Test FAIL Case (Bad Syntax)
        log('Test 1: Attempting to evolve with BROKEN code (should fail verification)...');
        const brokenCode = 'export const x: number = "this is a string";'; // Type mismatch
        // Note: tsc --noEmit might catch this type error
        const res1 = await post({ targetPath: TARGET_FILE, code: brokenCode });
        
        if (res1.success === false && res1.stage === 'verification') {
            log('PASS: System rejected broken code as expected.', 'SUCCESS');
        } else {
            log('FAIL: System accepted broken code or failed unexpectedly.', 'ERROR');
            console.log(res1);
        }

        // 3. Test SUCCESS Case (Valid Code)
        log('Test 2: Attempting to evolve with VALID code (should pass)...');
        const validCode = 'export const x: number = 42;\nexport const y: string = "Evolution complete";';
        const res2 = await post({ targetPath: TARGET_FILE, code: validCode });

        if (res2.success === true) {
            log('PASS: System accepted valid code.', 'SUCCESS');
            
            // Verify file content on disk
            const currentContent = fs.readFileSync(TARGET_PATH, 'utf8');
            if (currentContent === validCode) {
                log('PASS: File verification confirm content update.', 'SUCCESS');
            } else {
                log('FAIL: File content does not match evolved code.', 'ERROR');
            }
        } else {
            log('FAIL: System rejected valid code.', 'ERROR');
            console.log(res2);
        }

    } catch (e) {
        log(`CRITICAL ERROR: ${e.message}`, 'ERROR');
    } finally {
        // Cleanup
        if (fs.existsSync(TARGET_PATH)) fs.unlinkSync(TARGET_PATH);
        log('--- VERIFICATION COMPLETE ---');
    }
}

runTest();
