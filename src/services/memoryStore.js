import db from './db.js';
import fs from 'fs';
import path from 'path';

const MEMORY_FILE = path.join(process.cwd(), 'memory.json');

export const memoryStore = {

    // Migration: Load legacy JSON and insert into SQLite
    migrateFromJson: () => {
        if (fs.existsSync(MEMORY_FILE)) {
            console.log('[MEMORY_STORE] Found legacy memory.json. Migrating to SQLite...');
            try {
                const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
                const memories = JSON.parse(raw);

                if (Array.isArray(memories)) {
                    const insert = db.prepare(`
                        INSERT INTO memories (content, type, created_at, metadata_json)
                        VALUES (@content, @type, @created_at, @metadata_json)
                    `);

                    const insertMany = db.transaction((items) => {
                        for (const item of items) {
                            // Check if already exists (simple duplicate check by content key)
                            const exists = db.prepare('SELECT id FROM memories WHERE content LIKE ?').get(`${item.key}:%`);
                            if (!exists) {
                                insert.run({
                                    content: `${item.key}: ${item.value}`,
                                    type: item.category === 'FACT' ? 'semantic' : 'episodic',
                                    created_at: item.timestamp || Date.now(),
                                    metadata_json: JSON.stringify({
                                        category: item.category,
                                        confidence: item.confidence,
                                        original_id: item.id
                                    })
                                });
                            }
                        }
                    });

                    insertMany(memories);
                    console.log(`[MEMORY_STORE] Migrated ${memories.length} memories.`);

                    // Rename legacy file
                    fs.renameSync(MEMORY_FILE, `${MEMORY_FILE}.bak`);
                }
            } catch (e) {
                console.error('[MEMORY_STORE] Migration failed:', e);
            }
        }
    },

    // Get all memories (formatted as MemoryNode for frontend compatibility)
    getAll: () => {
        const rows = db.prepare('SELECT * FROM memories ORDER BY created_at DESC').all();
        return rows.map(row => {
            const meta = row.metadata_json ? JSON.parse(row.metadata_json) : {};
            const [key, ...valParts] = row.content.split(':');
            const value = valParts.join(':').trim();

            return {
                id: row.id.toString(),
                key: key.trim(),
                value: value,
                category: meta.category || 'FACT',
                timestamp: row.created_at,
                confidence: meta.confidence || 1.0
            };
        });
    },

    // Save a single memory
    add: (memory) => {
        const stmt = db.prepare(`
            INSERT INTO memories (content, type, created_at, metadata_json)
            VALUES (?, ?, ?, ?)
        `);

        const content = `${memory.key}: ${memory.value}`;
        const meta = {
            category: memory.category,
            confidence: memory.confidence
        };

        return stmt.run(
            content,
            memory.category === 'FACT' ? 'semantic' : 'episodic',
            memory.timestamp || Date.now(),
            JSON.stringify(meta)
        );
    },

    // Bulk Save (Overwrite/Sync from Frontend)
    // NOTE: In a real DB, we wouldn't wipe and replace, but for now we maintain compatibility
    // with the frontend's "save all" behavior, but we'll try to be smarter.
    sync: (memories) => {
        // For now, we will just add new ones that don't exist, 
        // or update existing ones. This is a simplified sync.
        const upsert = db.prepare(`
            INSERT INTO memories (content, type, created_at, metadata_json)
            VALUES (@content, @type, @created_at, @metadata_json)
        `);

        const syncTx = db.transaction((items) => {
            for (const item of items) {
                // We use the content (Key: Value) as a pseudo-unique identifier for now
                // Ideally we should use the ID, but the frontend generates random UUIDs
                const content = `${item.key}: ${item.value}`;

                // Check if exact content exists
                const exists = db.prepare('SELECT id FROM memories WHERE content = ?').get(content);

                if (!exists) {
                    upsert.run({
                        content,
                        type: item.category === 'FACT' ? 'semantic' : 'episodic',
                        created_at: item.timestamp || Date.now(),
                        metadata_json: JSON.stringify({
                            category: item.category,
                            confidence: item.confidence
                        })
                    });
                }
            }
        });

        syncTx(memories);
    },

    // Search with Vector (In-memory Cosine Similarity for now)
    searchByVector: (targetEmbedding, limit = 5) => {
        const rows = db.prepare('SELECT * FROM memories WHERE embedding_json IS NOT NULL').all();

        const results = rows.map(row => {
            const embedding = JSON.parse(row.embedding_json);
            return {
                ...row,
                similarity: cosineSimilarity(targetEmbedding, embedding)
            };
        });

        // Sort by similarity desc
        results.sort((a, b) => b.similarity - a.similarity);

        // Filter and map to format
        return results
            .filter(r => r.similarity > 0.4)
            .slice(0, limit)
            .map(row => {
                const meta = row.metadata_json ? JSON.parse(row.metadata_json) : {};
                const [key, ...valParts] = row.content.split(':');
                return {
                    id: row.id.toString(),
                    key: key.trim(),
                    value: valParts.join(':').trim(),
                    category: meta.category || 'FACT',
                    timestamp: row.created_at,
                    confidence: row.similarity
                };
            });
    },

    // Save Vector (Called by vector-save endpoint)
    addVector: (data) => {
        const { id, content, embedding, metadata } = data;

        // Check if memory exists by content (or we could use ID if we synced them better)
        // For now, we treat vector-save as an UPSERT on the memory
        const exists = db.prepare('SELECT id FROM memories WHERE content = ?').get(content);

        if (exists) {
            db.prepare('UPDATE memories SET embedding_json = ? WHERE id = ?').run(JSON.stringify(embedding), exists.id);
        } else {
            db.prepare(`
                INSERT INTO memories (content, type, created_at, embedding_json, metadata_json)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                content,
                'semantic',
                Date.now(),
                JSON.stringify(embedding),
                JSON.stringify(metadata)
            );
        }
    },
    // --- Knowledge Graph Methods ---

    addEntity: (name, type = 'concept', description = '') => {
        const stmt = db.prepare(`
            INSERT INTO entities (name, type, description, last_updated)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                last_updated = excluded.last_updated,
                description = COALESCE(excluded.description, entities.description)
        `);
        return stmt.run(name, type, description, Date.now());
    },

    addRelationship: (sourceName, relation, targetName) => {
        const getEntity = db.prepare('SELECT id FROM entities WHERE name = ?');
        let source = getEntity.get(sourceName);
        let target = getEntity.get(targetName);

        // Auto-create entities if missing
        if (!source) {
            memoryStore.addEntity(sourceName);
            source = getEntity.get(sourceName);
        }
        if (!target) {
            memoryStore.addEntity(targetName);
            target = getEntity.get(targetName);
        }

        const stmt = db.prepare(`
            INSERT INTO relationships (source_id, target_id, relation)
            VALUES (?, ?, ?)
            ON CONFLICT(source_id, target_id, relation) DO NOTHING
        `);

        return stmt.run(source.id, target.id, relation);
    },

    getGraph: () => {
        const nodes = db.prepare('SELECT id, name, type FROM entities').all();
        const edges = db.prepare(`
            SELECT r.id, s.name as source, t.name as target, r.relation
            FROM relationships r
            JOIN entities s ON r.source_id = s.id
            JOIN entities t ON r.target_id = t.id
        `).all();

        return { nodes, edges };
    }
};

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}
