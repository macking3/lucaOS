import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Compile Self
router.post('/compile', (req, res) => {
    const { platform } = req.body;
    
    // Placeholder - would trigger electron-builder
    const buildCommand = platform ? `npm run build:${platform}` : 'npm run build';
    
    exec(buildCommand, { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) {
            return res.json({
                success: false,
                error: err.message,
                stderr
            });
        }
        
        res.json({
            success: true,
            output: stdout,
            platform: platform || 'all'
        });
    });
});

// Get Build Status
router.get('/status', (req, res) => {
    const { platform } = req.query;
    
    // Check if build artifacts exist
    const distDir = path.join(process.cwd(), 'dist');
    const buildExists = fs.existsSync(distDir);
    
    res.json({
        buildExists,
        platform: platform || 'current',
        distPath: distDir,
        note: 'Build status checking is basic - enhance as needed'
    });
});

export default router;
