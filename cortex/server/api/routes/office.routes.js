import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Note: These require xlsx package which may not be installed
// Adding basic implementations that will work if xlsx is available

router.post('/write', async (req, res) => {
    const { filePath, data, sheetName } = req.body;
    
    try {
        // Check if xlsx is available
        const xlsx = await import('xlsx').catch(() => null);
        
        if (!xlsx) {
            return res.json({ error: 'xlsx package not installed. Run: npm install xlsx' });
        }

        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        let workbook;

        if (fs.existsSync(fullPath)) {
            workbook = xlsx.readFile(fullPath);
        } else {
            workbook = xlsx.utils.book_new();
        }

        const sName = sheetName || 'Sheet1';
        const newSheet = xlsx.utils.json_to_sheet(data);

        if (workbook.Sheets[sName]) {
            workbook.Sheets[sName] = newSheet;
        } else {
            xlsx.utils.book_append_sheet(workbook, newSheet, sName);
        }

        xlsx.writeFile(workbook, fullPath);
        res.json({ result: `Successfully wrote ${data.length} rows to ${filePath} (Sheet: ${sName})` });
    } catch (e) {
        res.json({ result: `Excel Write Error: ${e.message}` });
    }
});

router.post('/read', async (req, res) => {
    const { filePath, sheetName } = req.body;
    
    try {
        const xlsx = await import('xlsx').catch(() => null);
        
        if (!xlsx) {
            return res.json({ error: 'xlsx package not installed. Run: npm install xlsx' });
        }

        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        
        if (!fs.existsSync(fullPath)) {
            return res.json({ result: `File not found: ${filePath}` });
        }

        const workbook = xlsx.readFile(fullPath);
        const sName = sheetName || workbook.SheetNames[0];

        if (!workbook.Sheets[sName]) {
            return res.json({ result: `Sheet "${sName}" not found. Available: ${workbook.SheetNames.join(', ')}` });
        }

        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sName]);
        res.json({ result: JSON.stringify(data, null, 2) });
    } catch (e) {
        res.json({ result: `Excel Read Error: ${e.message}` });
    }
});

// Figma Integration
router.get('/figma/:fileKey', async (req, res) => {
    const { fileKey } = req.params;
    const token = req.headers['x-figma-token'] || process.env.FIGMA_PAT;

    if (!token) {
        return res.json({ error: 'Figma token required. Set FIGMA_PAT env variable or pass X-Figma-Token header' });
    }

    try {
        const figmaRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
            headers: { 'X-Figma-Token': token }
        });

        if (!figmaRes.ok) {
            return res.json({ error: `Figma API error: ${figmaRes.status}` });
        }

        const data = await figmaRes.json();

        const docName = data.name;
        const pageCount = data.document.children.length;
        const pages = data.document.children.map(p => `${p.name} (id: ${p.id})`).join(', ');

        res.json({
            result: `Figma Design: "${docName}"\nPages: ${pageCount} [${pages}]`,
            data
        });
    } catch (e) {
        res.json({ result: `Failed to inspect Figma: ${e.message}` });
    }
});

export default router;
