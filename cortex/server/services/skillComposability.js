/**
 * Skill Composability Engine
 * Handles dependency resolution and auto-stacking of skills
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { spawn } from 'child_process';

// Helper: Parse SKILL.md
const parseSkillMd = (skillPath) => {
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
        return null;
    }
    
    try {
        const content = fs.readFileSync(skillMdPath, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) {
            return null;
        }
        
        const metadata = yaml.load(match[1]);
        const instructions = match[2];
        
        return {
            ...metadata,
            instructions,
            path: skillPath
        };
    } catch (e) {
        console.error(`[COMPOSABILITY] Failed to parse ${skillMdPath}:`, e);
        return null;
    }
};

// Helper: Find main script
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

// Helper: Execute skill
const executeSkill = (skillPath, skill, args) => {
    return new Promise((resolve, reject) => {
        const scriptPath = findMainScript(skillPath, skill.language);
        if (!scriptPath) {
            return reject(new Error('Main script not found'));
        }
        
        const command = skill.language === 'python' ? 'python3' : 'node';
        const child = spawn(command, [scriptPath, JSON.stringify(args || {})], {
            cwd: skillPath,
            timeout: 30000
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
                return reject(new Error(error || 'Execution failed'));
            }
            
            try {
                const result = JSON.parse(output);
                resolve(result);
            } catch (e) {
                resolve(output);
            }
        });
        
        child.on('error', (err) => {
            reject(err);
        });
    });
};

/**
 * Resolve skill dependencies and execute in correct order
 */
export const executeWithDependencies = async (skillsDir, skillName, args) => {
    const executed = new Set();
    const results = {};
    
    const executeSkillRecursive = async (name, skillArgs) => {
        // Avoid circular dependencies
        if (executed.has(name)) {
            return results[name];
        }
        
        // Find skill
        const skillSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const skillPath = path.join(skillsDir, skillSlug);
        
        if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isDirectory()) {
            throw new Error(`Skill not found: ${name}`);
        }
        
        // Parse skill metadata
        const skill = parseSkillMd(skillPath);
        if (!skill) {
            throw new Error(`Invalid skill format: ${name}`);
        }
        
        // Execute required dependencies first
        if (skill.dependencies?.required) {
            console.log(`[COMPOSABILITY] Executing required dependencies for ${name}:`, skill.dependencies.required);
            
            for (const depName of skill.dependencies.required) {
                const depResult = await executeSkillRecursive(depName, {});
                results[depName] = depResult;
            }
        }
        
        // Execute optional dependencies (best effort)
        if (skill.dependencies?.optional) {
            console.log(`[COMPOSABILITY] Executing optional dependencies for ${name}:`, skill.dependencies.optional);
            
            for (const depName of skill.dependencies.optional) {
                try {
                    const depResult = await executeSkillRecursive(depName, {});
                    results[depName] = depResult;
                } catch (e) {
                    console.warn(`[COMPOSABILITY] Optional dependency ${depName} failed:`, e.message);
                }
            }
        }
        
        // Execute main skill
        console.log(`[COMPOSABILITY] Executing ${name} with args:`, skillArgs);
        const result = await executeSkill(skillPath, skill, skillArgs);
        
        executed.add(name);
        results[name] = result;
        
        return result;
    };
    
    return await executeSkillRecursive(skillName, args);
};

/**
 * Auto-stack multiple skills for complex tasks
 * Analyzes which skills are needed and orchestrates their execution
 */
export const orchestrateSkills = async (skillsDir, skillNames, userRequest) => {
    console.log(`[COMPOSABILITY] Orchestrating skills:`, skillNames);
    
    const results = {};
    
    // Execute skills in sequence, passing outputs as inputs
    for (let i = 0; i < skillNames.length; i++) {
        const skillName = skillNames[i];
        const previousResult = i > 0 ? results[skillNames[i - 1]] : null;
        
        // Use previous skill's output as input for next skill
        const args = previousResult ? { input: previousResult } : {};
        
        const result = await executeWithDependencies(skillsDir, skillName, args);
        results[skillName] = result;
    }
    
    return {
        orchestrated: true,
        skills: skillNames,
        results
    };
};

/**
 * Find relevant skills based on description/tags
 */
export const findRelevantSkills = (skillsDir, query) => {
    const items = fs.readdirSync(skillsDir);
    const relevantSkills = [];
    
    for (const item of items) {
        const itemPath = path.join(skillsDir, item);
        
        try {
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory() && item !== 'legacy') {
                const skill = parseSkillMd(itemPath);
                if (skill) {
                    // Simple relevance check (can be enhanced with AI)
                    const searchText = `${skill.name} ${skill.description} ${skill.tags?.join(' ') || ''}`.toLowerCase();
                    if (searchText.includes(query.toLowerCase())) {
                        relevantSkills.push({
                            name: skill.name,
                            score: 1.0 // Placeholder for relevance score
                        });
                    }
                }
            }
        } catch (e) {
            console.error(`[COMPOSABILITY] Error processing ${item}:`, e);
        }
    }
    
    return relevantSkills;
};

export default {
    executeWithDependencies,
    orchestrateSkills,
    findRelevantSkills
};
