import os from 'os';
import path from 'path';

export const SERVER_PORT = process.env.SERVER_PORT || process.env.PORT || 3002;
export const WS_PORT = process.env.WS_PORT || 3003;
export const CORTEX_PORT = process.env.CORTEX_PORT || 8000;
export const AUTH_PORT = process.env.AUTH_PORT || 3001;

// Storage Paths - MOVED TO USER DOCUMENTS for Production Persistence
// In dev, this is ~/Documents/Luca. In prod, this ensures we can write files.
const USER_HOME = os.homedir(); 
export const LUCA_ROOT_DIR = path.join(USER_HOME, 'Documents', 'Luca');

export const DATA_DIR = path.join(LUCA_ROOT_DIR, 'storage', 'data');
export const MACROS_DIR = path.join(LUCA_ROOT_DIR, 'storage', 'macros');
export const SKILLS_DIR = path.join(LUCA_ROOT_DIR, 'skills'); // External Skills Folder
export const FACES_DIR = path.join(DATA_DIR, 'faces');
export const VOICE_DIR = path.join(DATA_DIR, 'voice');
// Tools can remain internal if they are core, but user skills go to SKILLS_DIR
export const LUCA_TOOLS_DIR = path.join(process.cwd(), 'ops/LucaOS_Tools'); 
export const MANIFEST_FILE = path.join(LUCA_TOOLS_DIR, 'tool_manifest.json');

// File Paths
export const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
export const VECTOR_FILE = path.join(DATA_DIR, 'vectors.json');
export const GRAPH_FILE = path.join(DATA_DIR, 'knowledge_graph.json');
export const RECOVERY_FILE = path.join(DATA_DIR, '.luca_recovery');

// IoT Defaults
export const ROKU_DEFAULT_PORT = 8060;
