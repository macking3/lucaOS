import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'luca.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance

// Initialize Schema
const initSchema = () => {
    console.log('[DB] Initializing Schema...');

    // Memories Table: Stores episodic and semantic memories
    db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            embedding_json TEXT, -- JSON string of vector array
            type TEXT DEFAULT 'episodic', -- 'episodic', 'semantic', 'fact'
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
            metadata_json TEXT -- JSON string for extra context (source, tags, etc.)
        )
    `);

    // Entities Table: Knowledge Graph Nodes
    db.exec(`
        CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            type TEXT, -- 'person', 'location', 'project', 'concept'
            description TEXT,
            last_updated INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )
    `);

    // Relationships Table: Knowledge Graph Edges
    db.exec(`
        CREATE TABLE IF NOT EXISTS relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            relation TEXT NOT NULL, -- 'knows', 'owns', 'located_in'
            strength REAL DEFAULT 1.0,
            FOREIGN KEY(source_id) REFERENCES entities(id),
            FOREIGN KEY(target_id) REFERENCES entities(id),
            UNIQUE(source_id, target_id, relation)
        )
    `);

    // User Profile Table: Admin Identity
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            face_reference_path TEXT, -- Path to the master photo
            voice_settings_json TEXT, -- JSON for voice preferences
            voice_reference_path TEXT, -- Path to the master voice recording
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )
    `);

    // Migration: Add voice_reference_path if it doesn't exist (for existing DBs)
    try {
        db.prepare('ALTER TABLE user_profile ADD COLUMN voice_reference_path TEXT').run();
    } catch (e) {
        // Ignore error if column already exists
    }

    // Credentials Table (Encrypted Vault)
    db.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
            site TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            encrypted_password TEXT NOT NULL,
            iv TEXT NOT NULL,
            auth_tag TEXT NOT NULL,
            metadata_json TEXT, 
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )
    `);

    console.log('[DB] Schema Initialized.');
};

initSchema();

export default db;
