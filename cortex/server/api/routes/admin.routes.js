import express from 'express';
import fs from 'fs';
import path from 'path';
import db from '../../../../src/services/db.js';
import { FACES_DIR, VOICE_DIR } from '../../config/constants.js';

const router = express.Router();

// --- ADMIN ENROLLMENT ENDPOINT (PHASE 10) ---
router.post('/enroll', (req, res) => {
    const { name, faceImageBase64 } = req.body;
    if (!name || !faceImageBase64) {
        return res.status(400).json({ error: 'Name and Face Image required' });
    }

    try {
        // 1. Save Image
        if (!fs.existsSync(FACES_DIR)) fs.mkdirSync(FACES_DIR, { recursive: true });

        const imagePath = path.join(FACES_DIR, 'admin_reference.jpg');
        const buffer = Buffer.from(faceImageBase64, 'base64');
        fs.writeFileSync(imagePath, buffer);

        // 2. Update DB
        const existing = db.prepare('SELECT id FROM user_profile LIMIT 1').get();

        if (existing) {
            db.prepare('UPDATE user_profile SET name = ?, face_reference_path = ?, created_at = ? WHERE id = ?')
                .run(name, imagePath, Date.now(), existing.id);
        } else {
            db.prepare('INSERT INTO user_profile (name, face_reference_path, created_at) VALUES (?, ?, ?)')
                .run(name, imagePath, Date.now());
        }

        console.log(`[ADMIN] Enrolled user: ${name}`);
        res.json({ success: true, path: imagePath });
    } catch (e) {
        console.error('[ADMIN] Enrollment failed:', e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/reference-image', (req, res) => {
    try {
        const imagePath = path.join(FACES_DIR, 'admin_reference.jpg');

        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64 = imageBuffer.toString('base64');
            res.json({ success: true, imageBase64: base64 });
        } else {
            res.status(404).json({ error: 'Reference image not found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/enroll-voice', (req, res) => {
    const { name, audioBase64 } = req.body;
    if (!audioBase64) {
        return res.status(400).json({ error: 'Audio data required' });
    }

    try {
        // 1. Save Audio
        if (!fs.existsSync(VOICE_DIR)) fs.mkdirSync(VOICE_DIR, { recursive: true });

        const audioPath = path.join(VOICE_DIR, 'admin_reference.webm');
        const buffer = Buffer.from(audioBase64, 'base64');
        fs.writeFileSync(audioPath, buffer);

        // 2. Update DB
        const existing = db.prepare('SELECT id FROM user_profile LIMIT 1').get();

        if (existing) {
            db.prepare('UPDATE user_profile SET voice_reference_path = ? WHERE id = ?')
                .run(audioPath, existing.id);
        } else {
            // If no profile exists, we create one (though usually face comes first)
            db.prepare('INSERT INTO user_profile (name, voice_reference_path, created_at) VALUES (?, ?, ?)')
                .run(name || 'Admin', audioPath, Date.now());
        }

        console.log(`[ADMIN] Enrolled voice for: ${name || 'Admin'}`);
        res.json({ success: true, path: audioPath });
    } catch (e) {
        console.error('[ADMIN] Voice Enrollment failed:', e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/reference-voice', (req, res) => {
    try {
        const audioPath = path.join(VOICE_DIR, 'admin_reference.webm');

        if (fs.existsSync(audioPath)) {
            const audioBuffer = fs.readFileSync(audioPath);
            const base64 = audioBuffer.toString('base64');
            res.json({ success: true, audioBase64: base64 });
        } else {
            res.status(404).json({ error: 'Reference audio not found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
