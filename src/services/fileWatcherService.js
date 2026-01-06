import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { memoryStore } from './memoryStore.js';
import { embeddingService } from './embeddingService.js';

let watcher = null;

export const fileWatcher = {
    start: (workspacePath) => {
        if (watcher) return;

        console.log(`[FILE_WATCHER] Starting watch on: ${workspacePath}`);

        watcher = chokidar.watch(workspacePath, {
            ignored: (pathStr, stats) => {
                // Always ignore node_modules, .git, dist, build, and hidden files
                if (pathStr.includes('node_modules') ||
                    pathStr.includes('.git') ||
                    pathStr.includes('dist') ||
                    pathStr.includes('build') ||
                    pathStr.includes('.db') ||
                    pathStr.includes('.log') ||
                    pathStr.includes('.wwebjs_auth')) {
                    return true;
                }

                // If it's a file, only allow specific extensions
                if (stats?.isFile()) {
                    const ext = path.extname(pathStr).toLowerCase();
                    return !['.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.html', '.css', '.py'].includes(ext);
                }

                return false;
            },
            persistent: true,
            ignoreInitial: true,
            depth: 10 // Prevent infinite recursion
        });

        watcher.on('change', async (filePath) => {
            console.log(`[FILE_WATCHER] File changed: ${filePath}`);

            // Debounce or queue could be added here
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                // Only index text files
                if (isTextFile(filePath) && content.length < 100000) {
                    const relativePath = path.relative(workspacePath, filePath);
                    const memoryKey = `File: ${relativePath}`;

                    // Generate Embedding
                    const vector = await embeddingService.generateEmbedding(`${memoryKey}: ${content.substring(0, 1000)}`);


                    // Save to Vector DB
                    memoryStore.addVector({
                        id: `file_${relativePath}`, // Stable ID
                        content: `${memoryKey}: ${content.substring(0, 500)}...`, // Store snippet
                        embedding: vector,
                        metadata: {
                            category: 'CODEBASE',
                            path: filePath,
                            type: 'file_change'
                        }
                    });

                    console.log(`[FILE_WATCHER] Indexed: ${relativePath}`);
                }
            } catch (e) {
                console.error(`[FILE_WATCHER] Failed to index ${filePath}:`, e);
            }
        });
    },

    stop: () => {
        if (watcher) {
            watcher.close();
            watcher = null;
        }
    }
};

function isTextFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.html', '.css', '.py'].includes(ext);
}
