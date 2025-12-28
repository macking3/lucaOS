
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import iotManager from '../services/iot/IoTManager.js';
import { securityTools } from '../services/securityTools.js';
import { AUTH_PORT } from '../server/config/constants.js';

// --- TOOL DEFINITIONS (For Gemini) ---
export const headlessToolsDefinitions = [
    {
        name: 'executeTerminalCommand',
        description: 'Execute a shell command on the host machine.',
        parameters: {
            type: 'OBJECT',
            properties: {
                command: { type: 'STRING', description: 'The command to execute.' }
            },
            required: ['command']
        }
    },
    {
        name: 'readFile',
        description: 'Read the contents of a file.',
        parameters: {
            type: 'OBJECT',
            properties: {
                path: { type: 'STRING', description: 'Absolute path to the file.' }
            },
            required: ['path']
        }
    },
    {
        name: 'writeFile',
        description: 'Write content to a file.',
        parameters: {
            type: 'OBJECT',
            properties: {
                path: { type: 'STRING', description: 'Absolute path to the file.' },
                content: { type: 'STRING', description: 'Content to write.' }
            },
            required: ['path', 'content']
        }
    },
    {
        name: 'listIoTDevices',
        description: 'List all available smart home devices.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        }
    },
    {
        name: 'controlIoTDevice',
        description: 'Control a smart home device.',
        parameters: {
            type: 'OBJECT',
            properties: {
                deviceId: { type: 'STRING', description: 'The ID of the device to control.' },
                action: { type: 'STRING', description: 'The action to perform (turnOn, turnOff, toggle, etc.).' },
                params: { type: 'OBJECT', description: 'Optional parameters for the action.' }
            },
            required: ['deviceId', 'action']
        }
    },
    {
        name: 'presentVisualData',
        description: 'Display data, news, comparisons, or visuals on the Smart Screen/Visual Core.',
        parameters: {
            type: 'OBJECT',
            properties: {
                type: { type: 'STRING', description: 'Type of content (e.g., NEWS, PRODUCT, PLACE, DATA_ROOM).' },
                topic: { type: 'STRING', description: 'Title or topic of the data.' },
                layout: { type: 'STRING', description: 'Preferred layout (GRID, FEED, COMPARISON, CAROUSEL).' },
                items: { 
                    type: 'ARRAY', 
                    description: 'List of items to display (images, text, prices).',
                    items: { type: 'OBJECT' }
                }
            },
            required: ['type', 'topic', 'items']
        }
    },
    {
        name: 'fetchSecuritySource',
        description: 'Resolve proxy implementation and fetch source code for a contract.',
        parameters: {
            type: 'OBJECT',
            properties: {
                address: { type: 'STRING', description: 'Target contract address.' },
                chain: { type: 'STRING', description: 'Blockchain (ethereum, bsc, polygon, base).' }
            },
            required: ['address']
        }
    },
    {
        name: 'resolveSecurityConstructor',
        description: 'Resolve deployment constructor parameters for a contract.',
        parameters: {
            type: 'OBJECT',
            properties: {
                address: { type: 'STRING', description: 'Target contract address.' },
                chain: { type: 'STRING', description: 'Blockchain.' }
            },
            required: ['address']
        }
    },
    {
        name: 'validateSecurityExploit',
        description: 'Validate a Solidity Proof-of-Concept exploit code in a forked sandbox.',
        parameters: {
            type: 'OBJECT',
            properties: {
                pocCode: { type: 'STRING', description: 'Solidity exploit code.' },
                chain: { type: 'STRING', description: 'Target blockchain.' }
            },
            required: ['pocCode']
        }
    },
    {
        name: 'readSecurityStorage',
        description: 'Read private variables or slots from a contract using Slither.',
        parameters: {
            type: 'OBJECT',
            properties: {
                address: { type: 'STRING', description: 'Contract address.' },
                chain: { type: 'STRING', description: 'Target blockchain.' },
                options: {
                    type: 'OBJECT',
                    properties: {
                        variableName: { type: 'STRING', description: 'Name of the private variable.' },
                        slot: { type: 'STRING', description: 'Explicit storage slot (optional).' },
                        key: { type: 'STRING', description: 'Mapping key or array index (optional).' },
                        structVar: { type: 'STRING', description: 'Struct field name (optional).' }
                    }
                }
            },
            required: ['address']
        }
    },
    {
        name: 'ingestExploitLibrary',
        description: 'Ingests a library of past exploits (e.g., from DefiHack) into Luca\'s semantic memory to learn patterns.',
        parameters: {
            type: 'OBJECT',
            properties: {
                repoUrl: { type: 'STRING', description: 'The URL of the exploit repository.' }
            },
            required: ['repoUrl']
        }
    },
    {
        name: 'addSecurityGoal',
        description: 'Adds a strategic security goal to the OS-level task system for autonomous tracking.',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'Goal title.' },
                description: { type: 'STRING', description: 'Detailed strategy.' },
                priority: { type: 'STRING', description: 'HIGH, MEDIUM, LOW.' }
            },
            required: ['title', 'description']
        }
    },
    {
        name: 'updateSecurityGoalStatus',
        description: 'Updates the status of an autonomous security goal.',
        parameters: {
            type: 'OBJECT',
            properties: {
                id: { type: 'STRING', description: 'Goal ID.' },
                status: { type: 'STRING', description: 'PENDING, IN_PROGRESS, COMPLETED.' }
            },
            required: ['id', 'status']
        }
    }
];

// --- TOOL IMPLEMENTATIONS ---
export const headlessTools = {
    executeTerminalCommand: async ({ command }) => {
        return new Promise((resolve) => {
            exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
                if (error) {
                    resolve(`Error: ${error.message}\nStderr: ${stderr}`);
                } else {
                    resolve(stdout || stderr || 'Command executed successfully (no output).');
                }
            });
        });
    },

    readFile: async ({ path: filePath }) => {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
            return `Error: File not found at ${filePath}`;
        } catch (e) {
            return `Error reading file: ${e.message}`;
        }
    },

    writeFile: async ({ path: filePath, content }) => {
        try {
            fs.writeFileSync(filePath, content, 'utf8');
            return `Successfully wrote to ${filePath}`;
        } catch (e) {
            return `Error writing file: ${e.message}`;
        }
    },

    listIoTDevices: async () => {
        try {
            const devices = iotManager.getAllDevices();
            return JSON.stringify(devices, null, 2);
        } catch (e) {
            return `Error listing devices: ${e.message}`;
        }
    },

    controlIoTDevice: async ({ deviceId, action, params }) => {
        try {
            const success = await iotManager.controlDevice(deviceId, action, params);
            return success ? `Successfully performed ${action} on ${deviceId}` : `Failed to perform ${action} on ${deviceId}`;
        } catch (e) {
            return `Error controlling device: ${e.message}`;
        }
    },

    presentVisualData: async (data) => {
        // The actual emission happens in LifeLoop.js via event interception
        return `SUCCESS: Visual data presented on Smart Screen (Topic: ${data.topic || 'Unknown'}).`;
    },

    fetchSecuritySource: async ({ address, chain }) => {
        const result = await securityTools.fetchSource(address, chain);
        return JSON.stringify(result, null, 2);
    },

    resolveSecurityConstructor: async ({ address, chain }) => {
        const result = await securityTools.resolveConstructor(address, chain);
        return JSON.stringify(result, null, 2);
    },

    validateSecurityExploit: async ({ pocCode, chain }) => {
        const result = await securityTools.validateExploit(pocCode, chain);
        return JSON.stringify(result, null, 2);
    },

    ingestExploitLibrary: async ({ repoUrl }) => {
        // Since we need 'io', we'll hit the fetch endpoint via context or handle it here
        // But headlessTools usually calls services directly.
        // For simulation/HUD consistency, we'll use a fetch to the local API
        const res = await fetch(`http://localhost:${AUTH_PORT}/api/security/ingest-library`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl })
        });
        return await res.text();
    },

    addSecurityGoal: async ({ title, description, priority }) => {
        const res = await fetch(`http://localhost:${AUTH_PORT}/api/goals/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, priority })
        });
        return await res.text();
    },

    updateSecurityGoalStatus: async ({ id, status }) => {
        const res = await fetch(`http://localhost:${AUTH_PORT}/api/goals/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        return await res.text();
    },

    readSecurityStorage: async ({ address, options, chain }) => {
        const result = await securityTools.readStorage(address, options, chain);
        return JSON.stringify(result, null, 2);
    }
};
