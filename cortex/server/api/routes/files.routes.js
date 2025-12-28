import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const RECOVERY_FILE = path.join(process.cwd(), 'storage/data/.luca_recovery');
// Check if we are running inside a compiled Electron app (ASAR) or standard Node process
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || (process.mainModule && process.mainModule.filename.includes('app.asar'));

// State
let currentWorkingDirectory = process.cwd();

// --- API IMPLEMENTATION ---

// Get/Set CWD
router.post('/cwd', (req, res) => {
    const { path: newPath } = req.body;
    if (newPath) {
        try {
            // Resolve path relative to current, or absolute
            const resolved = path.resolve(currentWorkingDirectory, newPath);
            if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
                currentWorkingDirectory = resolved;
                console.log(`[CWD] Changed to: ${currentWorkingDirectory}`);
                res.json({ result: currentWorkingDirectory });
            } else {
                res.json({ error: `Directory not found: ${resolved}` });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.json({ result: currentWorkingDirectory });
    }
});

// List Files
router.post('/list', (req, res) => {
    const targetPath = req.body.path ? path.resolve(currentWorkingDirectory, req.body.path) : currentWorkingDirectory;
    try {
        if (!fs.existsSync(targetPath)) {
            return res.json({ error: `Path not found: ${targetPath}` });
        }
        const items = fs.readdirSync(targetPath).map(item => {
            try {
                const fullPath = path.join(targetPath, item);
                const stats = fs.statSync(fullPath);
                return {
                    name: item,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    mtime: stats.mtime
                };
            } catch (e) {
                return { name: item, isDirectory: false, error: 'Access Denied' };
            }
        });
        // Sort directories first
        items.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
        res.json({ path: targetPath, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// List Files (GET) - For compatibility
router.get('/list', (req, res) => {
    const targetPath = req.query.path ? path.resolve(currentWorkingDirectory, req.query.path) : currentWorkingDirectory;
    try {
        if (!fs.existsSync(targetPath)) {
            return res.json({ error: `Path not found: ${targetPath}` });
        }
        const items = fs.readdirSync(targetPath).map(item => {
            try {
                const fullPath = path.join(targetPath, item);
                const stats = fs.statSync(fullPath);
                return {
                    name: item,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    mtime: stats.mtime
                };
            } catch (e) {
                return { name: item, isDirectory: false, error: 'Access Denied' };
            }
        });
         items.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
        res.json({ path: targetPath, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Read File
router.post('/read', (req, res) => {
    const { path: filePath } = req.body;
    const targetPath = path.resolve(currentWorkingDirectory, filePath);
    try {
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            const content = fs.readFileSync(targetPath, 'utf8');
            res.json({ content });
        } else {
            res.json({ error: 'File not found or is a directory' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/read', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({error: "No path provided"});
    
    const targetPath = path.resolve(currentWorkingDirectory, filePath);
    try {
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            const content = fs.readFileSync(targetPath, 'utf8');
            res.json({ content });
        } else {
            res.json({ error: 'File not found or is a directory' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// Helper: Cleanup Old Backups
const cleanupOldBackups = (originalPath) => {
    try {
        const dir = path.dirname(originalPath);
        const baseName = path.basename(originalPath);

        const files = fs.readdirSync(dir);
        const backups = files.filter(f => f.startsWith(baseName) && f.endsWith('.bak'));

        const backupStats = backups.map(f => ({
            name: f,
            time: fs.statSync(path.join(dir, f)).mtime.getTime()
        }));

        backupStats.sort((a, b) => b.time - a.time); // Newest first

        // Keep last 5
        const toDelete = backupStats.slice(5);
        toDelete.forEach(f => {
            fs.unlinkSync(path.join(dir, f.name));
        });
    } catch (e) {
        console.warn("Backup cleanup failed", e);
    }
};

// Write File
router.post('/write', (req, res) => {
    const { path: filePath, content } = req.body;
    const targetPath = path.resolve(currentWorkingDirectory, filePath);

    // --- INTEGRITY CHECK FOR PRODUCTION BUILDS ---
    if (IS_PRODUCTION) {
        const lockedPaths = ['server.js', 'App.tsx', 'index.tsx', 'components/', 'services/'];
        const isRestricted = lockedPaths.some(p => filePath.includes(p));

        if (isRestricted) {
            console.warn(`[SECURITY] Blocked write attempt to ${filePath} in Production Mode.`);
            return res.json({
                error: "KERNEL INTEGRITY LOCK: Cannot modify core source code in Production Distribution."
            });
        }
    }

    try {
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (fs.existsSync(targetPath)) {
            const timestamp = Date.now();
            const backupPath = `${targetPath}.${timestamp}.bak`;
            fs.copyFileSync(targetPath, backupPath);
            fs.copyFileSync(targetPath, targetPath + '.bak');

             try {
                if (!fs.existsSync(path.dirname(RECOVERY_FILE))) fs.mkdirSync(path.dirname(RECOVERY_FILE), {recursive:true});
                fs.writeFileSync(RECOVERY_FILE, targetPath, 'utf8');
            } catch (e) {
                 // ignore
            }
            cleanupOldBackups(targetPath);
        }

        fs.writeFileSync(targetPath, content, 'utf8');
        res.json({ success: true, path: targetPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
