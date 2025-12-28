import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Configuration
// We use process.cwd() as the root, assuming the server runs from project root.
const SANDBOX_DIR = path.join(process.cwd(), 'temp_nofx_v2', 'sandbox');
const BACKUP_DIR = path.join(process.cwd(), 'temp_nofx_v2', 'backups');

class EvolutionService {
    constructor() {
        this.ensureDirs();
    }

    ensureDirs() {
        if (!fs.existsSync(SANDBOX_DIR)) fs.mkdirSync(SANDBOX_DIR, { recursive: true });
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    /**
     * Stage 1: Create a Sandbox Environment
     * Copies the target file to the sandbox directory.
     */
    async createSandbox(targetPath) {
        // Handle absolute vs relative paths
        const absoluteTargetPath = path.resolve(process.cwd(), targetPath);
        
        if (!fs.existsSync(absoluteTargetPath)) {
            throw new Error(`Target file not found: ${absoluteTargetPath}`);
        }

        const fileName = path.basename(absoluteTargetPath);
        const sandboxPath = path.join(SANDBOX_DIR, fileName);
        
        // Copy file
        fs.copyFileSync(absoluteTargetPath, sandboxPath);
        console.log(`[EVOLUTION] Created sandbox for ${fileName} at ${sandboxPath}`);
        
        return { 
            sandboxPath, 
            originalPath: absoluteTargetPath,
            content: fs.readFileSync(sandboxPath, 'utf8') 
        };
    }

    /**
     * Stage 2: Apply Mutation
     * Writes the new AI-generated code to the sandboxed file.
     */
    async applyMutation(sandboxPath, code) {
        if (!fs.existsSync(sandboxPath)) {
             throw new Error("Sandbox file does not exist. Create sandbox first.");
        }
        fs.writeFileSync(sandboxPath, code, 'utf8');
        console.log(`[EVOLUTION] Mutated ${path.basename(sandboxPath)}`);
        return true;
    }

    /**
     * Stage 3: Verify Mutation (The Filter)
     * Runs a verification command (e.g., test runner or compile check).
     */
    async verifyMutation(sandboxPath, verificationCommand = null) {
        const fileName = path.basename(sandboxPath);
        
        try {
            let cmd = verificationCommand;
            
            if (!cmd) {
                // Sane Defaults based on file extension
                if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
                    // Syntax check only (fast)
                    // We need to point to the sandbox file, but tsc might need context. 
                    // For now, we try to run tsc on it in isolation if possible, or just syntax check.
                    // "tsc --noEmit" on the specific file might fail if imports aren't resolved.
                    // A better approach for "Safe Evolution" with React is assuming the AI knows how to verify.
                    // For this MVP, we will try a syntax check.
                    cmd = `npx tsc "${sandboxPath}" --noEmit --esModuleInterop --skipLibCheck --jsx react-jsx`;
                } else if (fileName.endsWith('.js') || fileName.endsWith('.cjs')) {
                    cmd = `node --check "${sandboxPath}"`;
                } else {
                    return { success: true, message: "No verification available for this file type. Passed." };
                }
            }

            console.log(`[EVOLUTION] Verifying: ${cmd}`);
            const { stdout, stderr } = await execPromise(cmd);
            return { success: true, message: 'Verification Passed', output: stdout };
        } catch (error) {
            console.warn(`[EVOLUTION] Verification Failed: ${error.message}`);
            return { 
                success: false, 
                message: 'Verification Failed', 
                output: error.stdout || error.stderr || error.message 
            };
        }
    }

    /**
     * Stage 4: Commit Evolution
     * If verification passed, overwrite the original file.
     */
    async commitEvolution(sandboxPath, targetPath) {
         if (!fs.existsSync(sandboxPath)) {
             throw new Error("Sandbox file missing.");
        }

        const absoluteTargetPath = path.resolve(process.cwd(), targetPath);

        // 1. Backup original
        const fileName = path.basename(absoluteTargetPath);
        const backupPath = path.join(BACKUP_DIR, `${fileName}.${Date.now()}.bak`);
        if (fs.existsSync(absoluteTargetPath)) {
            fs.copyFileSync(absoluteTargetPath, backupPath);
        }

        // 2. Overwrite
        fs.copyFileSync(sandboxPath, absoluteTargetPath);
        console.log(`[EVOLUTION] Committed evolution to ${absoluteTargetPath}`);
        
        return { success: true, backupPath };
    }
}

export const evolutionService = new EvolutionService();
