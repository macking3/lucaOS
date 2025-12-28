#!/usr/bin/env node

/**
 * Migrate legacy single-file skills to Agent Skills format
 * 
 * Usage: node scripts/migrate-skills.js
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = path.join(process.env.HOME, 'Documents', 'Luca', 'skills');

console.log('🔄 Luca Skills Migration Tool');
console.log('================================\n');
console.log(`Skills directory: ${SKILLS_DIR}\n`);

// Ensure skills directory exists
if (!fs.existsSync(SKILLS_DIR)) {
    console.log('❌ Skills directory not found. Creating it...');
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

// Create legacy folder for backup
const legacyDir = path.join(SKILLS_DIR, 'legacy');
if (!fs.existsSync(legacyDir)) {
    fs.mkdirSync(legacyDir, { recursive: true });
}

const migrateSkill = (oldPath) => {
    const filename = path.basename(oldPath);
    const name = filename.replace('.js', '');
    const skillSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newDir = path.join(SKILLS_DIR, skillSlug);
    
    if (fs.existsSync(newDir)) {
        console.log(`⏭️  Skipping "${name}" - already migrated`);
        return false;
    }
    
    try {
        // Read old skill code
        const code = fs.readFileSync(oldPath, 'utf8');
        
        // Create new folder structure
        fs.mkdirSync(newDir, { recursive: true });
        fs.mkdirSync(path.join(newDir, 'resources'), { recursive: true });
        fs.mkdirSync(path.join(newDir, 'templates'), { recursive: true });
        
        // Generate SKILL.md
        const metadata = {
            name,
            version: '1.0.0',
            description: `Migrated from legacy format`,
            language: 'node',
            runtime: 'node',
            author: 'luca-ai',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        const skillMd = `---
${yaml.dump(metadata)}---

# Instructions

This skill was migrated from the legacy single-file format.

## Implementation

See \`main.js\` for the executable code.

## Migration Notes

- Original file: \`${filename}\`
- Migrated on: ${new Date().toISOString()}
- Backup location: \`legacy/${filename}\`
`;
        
        fs.writeFileSync(path.join(newDir, 'SKILL.md'), skillMd);
        fs.writeFileSync(path.join(newDir, 'main.js'), code);
        
        // Move old file to legacy folder (backup)
        const backupPath = path.join(legacyDir, filename);
        fs.copyFileSync(oldPath, backupPath);
        fs.unlinkSync(oldPath);
        
        console.log(`✅ Migrated "${name}" → ${skillSlug}/`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to migrate "${name}":`, error.message);
        return false;
    }
};

// Find all .js files in skills directory
const files = fs.readdirSync(SKILLS_DIR);
const jsFiles = files.filter(f => f.endsWith('.js') && f !== 'migrate-skills.js');

if (jsFiles.length === 0) {
    console.log('ℹ️  No legacy skills found to migrate.');
    console.log('   All skills are already in Agent Skills format! 🎉\n');
    process.exit(0);
}

console.log(`Found ${jsFiles.length} legacy skill(s) to migrate:\n`);

let migrated = 0;
let skipped = 0;
let failed = 0;

for (const file of jsFiles) {
    const result = migrateSkill(path.join(SKILLS_DIR, file));
    if (result === true) {
        migrated++;
    } else if (result === false) {
        skipped++;
    } else {
        failed++;
    }
}

console.log('\n================================');
console.log('Migration Summary:');
console.log(`  ✅ Migrated: ${migrated}`);
console.log(`  ⏭️  Skipped:  ${skipped}`);
console.log(`  ❌ Failed:   ${failed}`);
console.log('================================\n');

if (migrated > 0) {
    console.log('🎉 Migration complete!');
    console.log(`   Backups saved to: ${legacyDir}\n`);
    console.log('Next steps:');
    console.log('  1. Restart Luca backend server');
    console.log('  2. Test migrated skills in Skills Matrix');
    console.log('  3. Delete legacy/ folder when ready\n');
}
