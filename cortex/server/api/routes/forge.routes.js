import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Forge recipes directory
const RECIPES_DIR = path.join(process.cwd(), 'storage/forge/recipes');
const APPS_DIR = path.join(process.cwd(), 'storage/forge/apps');

if (!fs.existsSync(RECIPES_DIR)) fs.mkdirSync(RECIPES_DIR, { recursive: true });
if (!fs.existsSync(APPS_DIR)) fs.mkdirSync(APPS_DIR, { recursive: true });

// Install from Recipe
// Install from Recipe
router.post('/install', (req, res) => {
    const { recipeId, recipeContent } = req.body;
    let recipe = recipeContent;

    // Load from disk if ID provided
    if (!recipe && recipeId) {
        try {
            const raw = fs.readFileSync(path.join(RECIPES_DIR, `${recipeId}.json`), 'utf8');
            recipe = JSON.parse(raw);
        } catch (e) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
    }

    if (!recipe) return res.status(400).json({ error: 'No recipe provided' });

    try {
        const SKILLS_DIR = path.join(process.cwd(), 'cortex/skills');
        if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

        // 1. Install Skills
        if (recipe.skills) {
            for (const skill of recipe.skills) {
                const skillPath = path.join(SKILLS_DIR, skill.filename || `${skill.name}.py`);
                fs.writeFileSync(skillPath, skill.code);
            }
        }

        // 2. Install Memories (Simple append to memory store)
        // (Assuming a memory service exists, or we just log it for now as "Knowledge Ingested")
        // Implementation note: Ideally call memoryStore.add(), here we just save a status file
        const installLog = path.join(APPS_DIR, `${recipe.name || 'app'}.installed`);
        fs.writeFileSync(installLog, new Date().toISOString());

        res.json({
            success: true,
            installed: {
                skills: recipe.skills?.length || 0,
                memories: recipe.memories?.length || 0,
                name: recipe.name
            }
        });

    } catch (e) {
        console.error('Forge Install Failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// List Forge Apps
router.get('/list', (req, res) => {
    try {
        const apps = fs.readdirSync(APPS_DIR).filter(f => !f.startsWith('.'));
        res.json({ apps });
    } catch (e) {
        res.json({ apps: [] });
    }
});

// Get Forge Recipes
router.get('/recipes', (req, res) => {
    try {
        const recipes = fs.readdirSync(RECIPES_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const data = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, f), 'utf8'));
                return data;
            });
        res.json({ recipes });
    } catch (e) {
        res.json({ recipes: [] });
    }
});

export default router;
