/**
 * Phoenix Auto-Repair
 * Applies code fixes suggested by AI analysis
 */

const fs = require('fs');
const path = require('path');

async function applyAutoRepair(analysis) {
  if (!analysis.file || !analysis.suggestedFix) {
    console.log('[PHOENIX] Insufficient data for auto-repair');
    return false;
  }
  
  const filePath = path.join(__dirname, '../../', analysis.file);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`[PHOENIX] File not found: ${filePath}`);
    return false;
  }
  
  // Create backup
  const backupPath = filePath + '.phoenix.bak';
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`[PHOENIX] Created backup: ${path.basename(backupPath)}`);
  } catch (e) {
    console.error(`[PHOENIX] Failed to create backup: ${e.message}`);
    return false;
  }
  
  try {
    // Read current file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // For now, simple strategy: add suggested fix as comment at the top
    // In production, this would use more sophisticated patching
    const fixedContent = `/* PHOENIX AUTO-REPAIR APPLIED
 * Issue: ${analysis.issue}
 * Fix: ${analysis.suggestedFix}
 * Timestamp: ${new Date().toISOString()}
 * Note: This is a temporary fix. Please review and apply proper solution.
 */

${content}`;
    
    // Write patched file
    fs.writeFileSync(filePath, fixedContent);
    
    console.log(`[PHOENIX] Auto-repair applied to ${analysis.file}`);
    console.log(`[PHOENIX] Backup stored at: ${backupPath}`);
    console.log(`[PHOENIX] Review the fix and apply properly later.`);
    
    return true;
    
  } catch (e) {
    console.error(`[PHOENIX] Auto-repair failed: ${e.message}`);
    
    // Restore from backup
    try {
      fs.copyFileSync(backupPath, filePath);
      console.log('[PHOENIX] Restored from backup');
    } catch (restoreError) {
      console.error('[PHOENIX] Failed to restore backup!');
    }
    
    return false;
  }
}

module.exports = { applyAutoRepair };
