const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const CHECKS = [
    // FILE: services/lucaService.ts
    {
        file: 'services/lucaService.ts',
        requiredStrings: [
            'UNIVERSAL_LANGUAGE_PROMPT',
            'INTELLIGENCE_PROTOCOL',
            'EVOLUTION_PROTOCOL',
            'COMPUTER_USE_PROTOCOL',
            'PERSONA_CONFIG',
            'installCapabilityTool',
            'ingestGithubRepoTool'
        ]
    },
    // FILE: services/schemas.ts
    {
        file: 'services/schemas.ts',
        requiredStrings: [
            'readDocument',
            'getUITree',
            'manageMobileDevice',
            'runPythonScript',
            'controlSystem'
        ]
    },
    // FILE: App.tsx
    {
        file: 'App.tsx',
        requiredStrings: [
            'NeuralLinkModal',
            'VoiceCommandConfirmation',
            'WakeWordListener'
        ]
    }
];

let hasError = false;

console.log('🔍 STARTING INTEGRITY CHECK...\n');

CHECKS.forEach(check => {
    const filePath = path.join(ROOT_DIR, check.file);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ MISSING FILE: ${check.file}`);
        hasError = true;
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const missing = [];

    check.requiredStrings.forEach(str => {
        if (!content.includes(str)) {
            missing.push(str);
        }
    });

    if (missing.length > 0) {
        console.error(`❌ FAILED: ${check.file}`);
        missing.forEach(m => console.error(`   - Missing: "${m}"`));
        hasError = true;
    } else {
        console.log(`✅ PASSED: ${check.file}`);
    }
});

console.log('\n----------------------------------------');
if (hasError) {
    console.error('🚨 INTEGRITY CHECK FAILED! DO NOT COMMIT.');
    process.exit(1);
} else {
    console.log('✨ ALL SYSTEMS NOMINAL. INTEGRITY VERIFIED.');
    process.exit(0);
}
