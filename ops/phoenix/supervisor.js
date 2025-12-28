const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Phoenix Supervisor - Self-Healing System
 * Monitors LUCA, detects crashes, analyzes with AI, repairs code, and resurrects
 */
class PhoenixSupervisor {
  constructor() {
    this.crashCount = 0;
    this.maxCrashes = 10;
    this.crashLog = [];
    this.process = null;
    this.logBuffer = '';
  }
  
  start() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 PHOENIX SUPERVISOR - Activated');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[PHOENIX] Starting LUCA with immortality protocol...\n');
    
    this.process = spawn('npm', ['run', 'electron:dev'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd: path.join(__dirname, '../../')
    });
    
    // Capture stdout
    this.process.stdout.on('data', (data) => {
      process.stdout.write(data);
      this.logBuffer += data.toString();
      
      // Keep only last 50KB
      if (this.logBuffer.length > 50000) {
        this.logBuffer = this.logBuffer.slice(-50000);
      }
    });
    
    // Capture stderr
    this.process.stderr.on('data', (data) => {
      process.stderr.write(data);
      this.logBuffer += data.toString();
      
      if (this.logBuffer.length > 50000) {
        this.logBuffer = this.logBuffer.slice(-50000);
      }
    });
    
    // Handle crash/exit
    this.process.on('exit', async (code, signal) => {
      if (code !== 0 && code !== null) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`💀 [PHOENIX] LUCA DIED - Exit Code: ${code}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        this.crashCount++;
        this.crashLog.push({
          timestamp: Date.now(),
          code,
          signal,
          logs: this.logBuffer.slice(-5000) // Last 5KB
        });
        
        // Save crash log
        const crashFile = path.join(__dirname, '../../crash.log');
        fs.writeFileSync(crashFile, this.logBuffer);
        console.log(`[PHOENIX] Crash log saved to: ${crashFile}`);
        
        // Analyze and repair
        console.log('[PHOENIX] 🔍 Analyzing crash with AI...\n');
        try {
          await this.analyzeCrash(this.logBuffer);
        } catch (e) {
          console.error('[PHOENIX] ❌ Analysis failed:', e.message);
        }
        
        // Resurrect
        if (this.crashCount < this.maxCrashes) {
          console.log(`\n[PHOENIX] 🔥 Resurrection attempt ${this.crashCount}/${this.maxCrashes} in 3 seconds...`);
          setTimeout(() => {
            this.logBuffer = ''; // Reset buffer
            this.start();
          }, 3000);
        } else {
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`❌ [PHOENIX] MAX RESURRECTIONS REACHED (${this.maxCrashes})`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log('[PHOENIX] Manual intervention required.');
          console.log('[PHOENIX] Check crash.log for details.\n');
          process.exit(1);
        }
      } else if (code === 0) {
        console.log('\n[PHOENIX] LUCA exited normally (code 0)');
      }
    });
    
    // Handle supervisor termination
    process.on('SIGINT', () => {
      console.log('\n[PHOENIX] Supervisor shutdown requested');
      if (this.process) {
        this.process.kill();
      }
      process.exit(0);
    });
  }
  
  async analyzeCrash(logs) {
    try {
      const { analyzeCrashWithAI } = require('./crashAnalyzer');
      const { applyAutoRepair } = require('./autoRepair');
      
      const analysis = await analyzeCrashWithAI(logs);
      
      console.log('[PHOENIX] 📋 Analysis Results:');
      console.log(`  Issue: ${analysis.issue}`);
      console.log(`  Root Cause: ${analysis.rootCause || 'Unknown'}`);
      
      if (analysis.file) {
        console.log(`  File: ${analysis.file}`);
        if (analysis.line) console.log(`  Line: ${analysis.line}`);
      }
      
      if (analysis.canAutoFix) {
        console.log('\n[PHOENIX] ✅ Auto-repair available!');
        console.log('[PHOENIX] 🔧 Attempting automatic repair...\n');
        
        const repaired = await applyAutoRepair(analysis);
        
        if (repaired) {
          console.log('[PHOENIX] ✅ Auto-repair successful!');
          console.log('[PHOENIX] Code has been patched. Resurrection will use fixed code.\n');
        } else {
          console.log('[PHOENIX] ❌ Auto-repair failed');
          console.log('[PHOENIX] Will resurrect with original code (may crash again).\n');
        }
      } else {
        console.log('\n[PHOENIX] ⚠️ Manual fix required');
        console.log('[PHOENIX] Will resurrect with current code (may crash again).\n');
      }
    } catch (e) {
      console.error('[PHOENIX] Analysis error:', e.message);
    }
  }
}

// Start Phoenix
const phoenix = new PhoenixSupervisor();
phoenix.start();

module.exports = { PhoenixSupervisor };
