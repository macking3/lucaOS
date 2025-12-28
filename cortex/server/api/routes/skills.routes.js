import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { spawn } from 'child_process';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

import { SKILLS_DIR } from '../../config/constants.js';

const router = express.Router();

// Ensure Skills Directory exists in Documents/Luca/skills
if (!fs.existsSync(SKILLS_DIR)) {
    try {
        fs.mkdirSync(SKILLS_DIR, { recursive: true });
        console.log(`[SKILLS] Created persistent storage at: ${SKILLS_DIR}`);
    } catch (e) {
        console.error(`[SKILLS] Failed to create storage at ${SKILLS_DIR}:`, e);
    }
}

// Helper: Parse SKILL.md (Agent Skills format)
const parseSkillMd = (skillPath) => {
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
        return null;
    }
    
    try {
        const content = fs.readFileSync(skillMdPath, 'utf8');
        
        // Extract YAML frontmatter
        const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) {
            return null;
        }
        
        const metadata = yaml.load(match[1]);
        const instructions = match[2];
        
        return {
            ...metadata,
            instructions,
            path: skillPath,
            format: 'agent-skills'
        };
    } catch (e) {
        console.error(`[SKILLS] Failed to parse ${skillMdPath}:`, e);
        return null;
    }
};

// Helper: Find main script in skill folder
const findMainScript = (skillPath, language) => {
    const extensions = {
        python: ['main.py', 'skill.py', '__main__.py'],
        node: ['main.js', 'index.js', 'skill.js']
    };
    
    for (const filename of extensions[language] || []) {
        const scriptPath = path.join(skillPath, filename);
        if (fs.existsSync(scriptPath)) {
            return scriptPath;
        }
    }
    
    return null;
};

// Create skill (supports both legacy and Agent Skills format)
router.post('/create', (req, res) => {
    const { name, code, description, language, inputs, version, format } = req.body;
    
    try {
        if (format === 'agent-skills' || !format) {
            // Agent Skills format (default)
            const skillSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const skillDir = path.join(SKILLS_DIR, skillSlug);
            
            if (fs.existsSync(skillDir)) {
                return res.status(400).json({ error: 'Skill already exists' });
            }
            
            // Create skill folder structure
            fs.mkdirSync(skillDir, { recursive: true });
            fs.mkdirSync(path.join(skillDir, 'resources'), { recursive: true });
            fs.mkdirSync(path.join(skillDir, 'templates'), { recursive: true });
            
            // Generate SKILL.md with YAML frontmatter
            const metadata = {
                name,
                version: version || '1.0.0',
                description: description || 'No description provided',
                language: language || 'python',
                runtime: language === 'python' ? 'python3' : 'node',
                inputs: (inputs || []).map(input => ({
                    name: typeof input === 'string' ? input : input.name,
                    type: 'string',
                    required: true
                })),
                author: 'luca-ai',
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };
            
            const skillMd = `---
${yaml.dump(metadata)}---

# Instructions

${description || 'This skill performs a custom task.'}

## Usage

This skill can be executed with the following inputs:
${(inputs || []).map(i => `- \`${typeof i === 'string' ? i : i.name}\``).join('\n') || 'No inputs required'}

## Implementation

See \`main.${language === 'python' ? 'py' : 'js'}\` for the executable code.
`;
            
            fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd);
            
            // Create main script
            const scriptName = language === 'python' ? 'main.py' : 'main.js';
            fs.writeFileSync(path.join(skillDir, scriptName), code || '# Add your code here');
            
            res.json({ 
                success: true, 
                path: skillDir,
                format: 'agent-skills'
            });
        } else {
            // Legacy format (single file)
            const skillPath = path.join(SKILLS_DIR, `${name}.js`);
            fs.writeFileSync(skillPath, code);
            res.json({ success: true, path: skillPath, format: 'legacy' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// List all skills (both formats)
router.get('/list', (req, res) => {
    try {
        const items = fs.readdirSync(SKILLS_DIR);
        const skills = [];
        
        for (const item of items) {
            const itemPath = path.join(SKILLS_DIR, item);
            
            try {
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory() && item !== 'legacy') {
                    // Agent Skills format
                    const skill = parseSkillMd(itemPath);
                    if (skill) {
                        skills.push({
                            name: skill.name,
                            description: skill.description,
                            language: skill.language,
                            version: skill.version,
                            inputs: skill.inputs?.map(i => i.name || i) || [],
                            path: itemPath,
                            format: 'agent-skills'
                        });
                    }
                } else if (item.endsWith('.js')) {
                    // Legacy format
                    skills.push({
                        name: item.replace('.js', ''),
                        description: 'Legacy skill',
                        language: 'node',
                        inputs: [],
                        path: itemPath,
                        format: 'legacy'
                    });
                }
            } catch (e) {
                console.error(`[SKILLS] Error processing ${item}:`, e);
            }
        }
        
        res.json({ skills });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Execute skill (both formats)
router.post('/execute', async (req, res) => {
    const { name, args } = req.body;
    
    try {
        // Try Agent Skills format first
        const skillSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const skillDir = path.join(SKILLS_DIR, skillSlug);
        
        if (fs.existsSync(skillDir) && fs.statSync(skillDir).isDirectory()) {
            // Agent Skills format
            const skill = parseSkillMd(skillDir);
            if (!skill) {
                return res.status(404).json({ error: 'Invalid skill format' });
            }
            
            const scriptPath = findMainScript(skillDir, skill.language);
            if (!scriptPath) {
                return res.status(404).json({ error: 'Main script not found' });
            }
            
            // Execute based on language
            const command = skill.language === 'python' ? 'python3' : 'node';
            const child = spawn(command, [scriptPath, JSON.stringify(args || {})], {
                cwd: skillDir,
                timeout: 30000 // 30 second timeout
            });
            
            let output = '';
            let error = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            child.on('close', (code) => {
                if (code !== 0) {
                    return res.status(500).json({ error: error || 'Execution failed' });
                }
                
                try {
                    const result = JSON.parse(output);
                    res.json({ result });
                } catch (e) {
                    res.json({ result: output });
                }
            });
            
            child.on('error', (err) => {
                res.status(500).json({ error: err.message });
            });
        } else {
            // Legacy format
            const skillPath = path.join(SKILLS_DIR, `${name}.js`);
            if (!fs.existsSync(skillPath)) {
                return res.status(404).json({ error: 'Skill not found' });
            }
            
            const skillModule = await import(`file://${skillPath}`);
            const skill = skillModule.default || skillModule;
            
            if (typeof skill === 'function') {
                const result = await skill(args);
                res.json({ result: JSON.stringify(result) });
            } else if (skill.execute && typeof skill.execute === 'function') {
                const result = await skill.execute(args);
                res.json({ result: JSON.stringify(result) });
            } else {
                res.json({ result: `Skill ${name} loaded but no execute function found` });
            }
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// AI Skill Generation Endpoint (updated for Agent Skills format)
router.post('/generate', async (req, res) => {
    const { description, language = 'python' } = req.body;
    
    try {
        // Build prompt for Luca AI
        const prompt = `You are a code generator for Luca AI Skills.

Generate a ${language} skill based on this description:
"${description}"

Requirements:
1. Create complete, executable ${language} code
2. Include proper error handling
3. Add clear comments
4. Define input parameters if needed
5. Return structured output (JSON preferred)
6. Keep it simple and focused

Respond ONLY with valid JSON in this exact format:
{
  "name": "camelCaseName",
  "description": "Clear one-line description",
  "code": "Complete executable code as a single string",
  "inputs": ["param1", "param2"],
  "language": "${language}"
}`;

        // Call Luca AI service (using existing lucaService)
        const { lucaService } = await import('../../services/lucaService.js');
        const response = await lucaService.chat([{ role: 'user', content: prompt }]);
        
        // Parse AI response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI did not return valid JSON');
        }
        
        const skillData = JSON.parse(jsonMatch[0]);
        
        res.json({
            code: skillData.code,
            name: skillData.name,
            description: skillData.description,
            inputs: skillData.inputs || [],
            language: language
        });
    } catch (error) {
        console.error('[SKILLS] Generation failed:', error);
        res.status(500).json({ 
            error: 'Skill generation failed',
            details: error.message 
        });
    }
});

// Skill Templates Endpoint (unchanged)
router.get('/templates', (req, res) => {
    const templates = [
        {
            id: 'web_scraper',
            name: 'Web Scraper',
            category: 'Data Collection',
            description: 'Scrape content from any website',
            language: 'python',
            inputs: ['url', 'selector'],
            code: `import requests
from bs4 import BeautifulSoup

def scrape(url, selector):
    """Scrape content from a website using CSS selectors"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        elements = soup.select(selector)
        return [elem.text.strip() for elem in elements]
    except Exception as e:
        return {"error": str(e)}`,
            icon: '🌐'
        },
        {
            id: 'api_caller',
            name: 'REST API Caller',
            category: 'Integration',
            description: 'Make HTTP requests to any API',
            language: 'node',
            inputs: ['endpoint', 'method', 'headers', 'body'],
            code: `const fetch = require('node-fetch');

async function callAPI(endpoint, method = 'GET', headers = '{}', body = null) {
    try {
        const options = {
            method,
            headers: JSON.parse(headers)
        };
        
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(endpoint, options);
        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = callAPI;`,
            icon: '🔌'
        },
        {
            id: 'data_transformer',
            name: 'Data Transformer',
            category: 'Data Processing',
            description: 'Transform JSON data with custom logic',
            language: 'node',
            inputs: ['data', 'transformLogic'],
            code: `function transform(data, transformLogic) {
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const logic = new Function('data', \`return \${transformLogic}\`);
        return logic(parsed);
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = transform;`,
            icon: '🔄'
        },
        {
            id: 'file_processor',
            name: 'File Processor',
            category: 'File Operations',
            description: 'Read, parse, and process files',
            language: 'python',
            inputs: ['filepath', 'operation'],
            code: `import json
import csv
import os

def process_file(filepath, operation='read'):
    """Process files with various operations"""
    try:
        if not os.path.exists(filepath):
            return {"error": "File not found"}
        
        if filepath.endswith('.json'):
            with open(filepath, 'r') as f:
                data = json.load(f)
        elif filepath.endswith('.csv'):
            with open(filepath, 'r') as f:
                data = list(csv.DictReader(f))
        else:
            with open(filepath, 'r') as f:
                data = f.read()
        
        return data
    except Exception as e:
        return {"error": str(e)}`,
            icon: '📄'
        },
        {
            id: 'text_analyzer',
            name: 'Text Analyzer',
            category: 'NLP',
            description: 'Analyze text for keywords, sentiment, etc.',
            language: 'python',
            inputs: ['text', 'analysis_type'],
            code: `def analyze_text(text, analysis_type='keywords'):
    """Analyze text with various methods"""
    try:
        if analysis_type == 'keywords':
            # Simple keyword extraction
            words = text.lower().split()
            word_freq = {}
            for word in words:
                if len(word) > 3:  # Filter short words
                    word_freq[word] = word_freq.get(word, 0) + 1
            return sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        
        elif analysis_type == 'stats':
            return {
                'char_count': len(text),
                'word_count': len(text.split()),
                'sentence_count': text.count('.') + text.count('!') + text.count('?')
            }
        
        return {"error": "Unknown analysis type"}
    except Exception as e:
        return {"error": str(e)}`,
            icon: '📊'
        }
    ];
    
    res.json({ templates });
});

// Composability: Execute skill with dependencies
router.post('/execute-with-deps', async (req, res) => {
    const { name, args } = req.body;
    
    try {
        const { executeWithDependencies } = await import('../../services/skillComposability.js');
        const result = await executeWithDependencies(SKILLS_DIR, name, args || {});
        res.json({ result });
    } catch (error) {
        console.error('[SKILLS] Dependency execution failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Composability: Orchestrate multiple skills
router.post('/orchestrate', async (req, res) => {
    const { skills, userRequest } = req.body;
    
    try {
        const { orchestrateSkills } = await import('../../services/skillComposability.js');
        const result = await orchestrateSkills(SKILLS_DIR, skills, userRequest);
        res.json(result);
    } catch (error) {
        console.error('[SKILLS] Orchestration failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Composability: Find relevant skills
router.post('/find-relevant', async (req, res) => {
    const { query } = req.body;
    
    try {
        const { findRelevantSkills } = await import('../../services/skillComposability.js');
        const skills = findRelevantSkills(SKILLS_DIR, query);
        res.json({ skills });
    } catch (error) {
        console.error('[SKILLS] Skill search failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Neural Imprinting: Save recording as a new skill folder
router.post('/imprint', upload.single('video'), async (req, res) => {
    const { name, description, mode, events: eventsStr } = req.body;
    let events = [];
    try {
        events = JSON.parse(eventsStr || '[]');
    } catch (e) {
        console.warn('[SKILLS] Failed to parse events for imprint');
    }
    
    if (!name || !req.file) {
        return res.status(400).json({ error: 'Missing name or video data' });
    }

    try {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const skillPath = path.join(SKILLS_DIR, slug);

        // Ensure folder structure matches Agent Skills standard
        if (!fs.existsSync(skillPath)) {
            fs.mkdirSync(skillPath, { recursive: true });
            fs.mkdirSync(path.join(skillPath, 'resources'), { recursive: true });
            fs.mkdirSync(path.join(skillPath, 'templates'), { recursive: true });
        }

        // 1. Save Video Imprint
        const videoPath = path.join(skillPath, 'resources', 'imprint.webm');
        fs.writeFileSync(videoPath, req.file.buffer);

        // 2. Save Event History
        const eventsPath = path.join(skillPath, 'resources', 'events.json');
        fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));

        // 3. Generate SKILL.md (Metadata Source of Truth)
        const skillMd = `---
name: ${name}
version: 1.0.0
description: ${description || 'Neural imprint recording'}
language: javascript
runtime: node
author: user
created: ${new Date().toISOString()}
updated: ${new Date().toISOString()}
format: agent-skills
---

# Instructions

This skill was created via Neural Imprinting (**${mode}** mode).
The user recorded a demonstration of a workflow or technique.

## Context
${description || 'No additional description provided.'}

## Resources
- \`resources/imprint.webm\`: High-fidelity visual demonstration of the skill.
- \`resources/events.json\`: Captured click and keydown event stream.

## Usage
Refer to the imprint video to understand the exact sequence of actions required to replicate this capability.
`;

        fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillMd);

        // 4. Create main.js (Boilerplate logic)
        const mainJs = `/**
 * Imprinted Skill: ${name}
 * 
 * This skill encapsulates a recorded human workflow.
 * Execution acknowledges the imprint context.
 */

export async function main(args) {
    console.log("Replaying context for imprinted skill: ${name}");
    return {
        success: true,
        message: "Neural imprint context acknowledged",
        imprint: "${slug}",
        mode: "${mode}",
        args
    };
}
`;
        fs.writeFileSync(path.join(skillPath, 'main.js'), mainJs);

        console.log(`[SKILLS] Successfully registered neural imprint at: ${skillPath}`);
        res.json({ success: true, path: skillPath, slug });

    } catch (error) {
        console.error('[SKILLS] Imprint saving failed:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
