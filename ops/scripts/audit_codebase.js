const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ERRORS = [];
const WARNINGS = [];

function checkFile(relativePath) {
    const fullPath = path.join(ROOT, relativePath);
    if (!fs.existsSync(fullPath)) {
        ERRORS.push(`MISSING FILE: ${relativePath}`);
        return false;
    }
    return true;
}

function checkDir(relativePath) {
    const fullPath = path.join(ROOT, relativePath);
    if (!fs.existsSync(fullPath)) {
        ERRORS.push(`MISSING DIR: ${relativePath}`);
        return false;
    }
    return true;
}

function grepFile(relativePath, forbiddenPattern, message) {
    const fullPath = path.join(ROOT, relativePath);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.match(forbiddenPattern)) {
            WARNINGS.push(`FILE ${relativePath}: ${message}`);
        }
    }
}

console.log('--- STARTING LUCA CODEBASE AUDIT ---');

// 1. Structure Check
checkDir('cortex');
checkDir('cortex/server');
checkDir('cortex/server/api/routes');
checkDir('cortex/server/services');
checkDir('cortex/server/config');
checkDir('platforms/electron');
checkDir('src');
checkDir('ops');
checkDir('storage');

// 2. Critical Files
checkFile('server.js');
checkFile('package.json');
checkFile('platforms/electron/main.cjs');
checkFile('platforms/electron/preload.cjs');
checkFile('cortex/server/config/constants.js');
checkFile('cortex/server/services/whatsappService.js');
checkFile('cortex/server/services/socketService.js');
checkFile('cortex/server/services/cortexService.js');
checkFile('src/App.tsx');
checkFile('vite.config.ts');

// 3. Port Configuration Check
const packageJson = require(path.join(ROOT, 'package.json'));
if (!packageJson.scripts['electron:dev']) {
    ERRORS.push('package.json: Missing electron:dev script');
}

// 4. Content Checks (Legacy Paths)
grepFile('platforms/electron/main.cjs', /require\(['"]\.\.\/server\.js['"]\)/, 'Found reference to ../server.js (Should be ../../server.js)');
// This is actually what we want in main.cjs: const serverPath = path.join(__dirname, '../../server.js');
// So verify it HAS ../../server.js


// 5. Check constants.js exports
const constantsPath = path.join(ROOT, 'cortex/server/config/constants.js');
if (fs.existsSync(constantsPath)) {
    const content = fs.readFileSync(constantsPath, 'utf8');
    if (!content.includes('SERVER_PORT')) ERRORS.push('constants.js: Missing SERVER_PORT');
    if (!content.includes('DATA_DIR')) ERRORS.push('constants.js: Missing DATA_DIR');
}

// REPORT
console.log('\n--- AUDIT REPORT ---');
if (ERRORS.length === 0 && WARNINGS.length === 0) {
    console.log('✅ PASS: Codebase structure appears sound.');
} else {
    if (ERRORS.length > 0) {
        console.log('❌ ERRORS:');
        ERRORS.forEach(e => console.log(`  - ${e}`));
    }
    if (WARNINGS.length > 0) {
        console.log('⚠️ WARNINGS:');
        WARNINGS.forEach(w => console.log(`  - ${w}`));
    }
}
