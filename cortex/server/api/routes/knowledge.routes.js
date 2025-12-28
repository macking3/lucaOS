import express from 'express';
import path from 'path';

const router = express.Router();

// GitHub Repository Ingestion - Full Implementation
router.post('/github', async (req, res) => {
    const { url } = req.body;

    try {
        // Parse owner/repo
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            console.warn(`[INGEST] Blocked invalid GitHub URL: ${url}`);
            return res.status(400).json({ error: "Invalid GitHub URL. This tool only accepts valid github.com repositories." });
        }

        const owner = match[1];
        const repo = match[2].replace('.git', '');

        console.log(`[INGEST] Deep Scan Initiated for ${owner}/${repo}...`);

        // 1. Get Tree (Recursive)
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
        let treeRes = await fetch(treeUrl);

        if (!treeRes.ok) {
            // Try master
            const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
            treeRes = await fetch(masterUrl);
        }

        if (!treeRes.ok) {
            return res.json({ error: "Could not fetch repo tree. Check if repo is public and branch is main/master." });
        }

        const treeData = await treeRes.json();
        if (!treeData.tree) return res.json({ error: "No tree data found." });

        // 2. Filter for Source Code
        const allowedExts = [
            '.ts', '.tsx', '.js', '.jsx', '.py', '.ipynb', '.json', '.md',
            '.java', '.cpp', '.c', '.h', '.rs', '.go', '.yaml', '.yml',
            '.sh', '.bash', '.bat', '.ps1', '.rb', '.pl', '.php',
            '.xml', '.gradle', '.properties', '.conf', '.cfg'
        ];

        const sourceFiles = treeData.tree.filter(node =>
            node.type === 'blob' &&
            allowedExts.includes(path.extname(node.path)) &&
            !node.path.includes('package-lock') &&
            !node.path.includes('yarn.lock') &&
            !node.path.includes('dist/') &&
            !node.path.includes('node_modules/') &&
            !node.path.includes('.git/')
        );

        console.log(`[INGEST] Found ${sourceFiles.length} source files. Downloading...`);

        // 3. Smart Prioritization
        const isKnowledgeBase = repo.toLowerCase().includes('checklist') ||
            repo.toLowerCase().includes('guide') ||
            repo.toLowerCase().includes('awesome') ||
            repo.toLowerCase().includes('cheat');

        const priorityFiles = sourceFiles.sort((a, b) => {
            const score = (p) => {
                const lower = p.toLowerCase();
                let s = 0;

                if (isKnowledgeBase) {
                    if (lower.endsWith('.md')) s += 500;
                    if (lower.includes('api')) s += 50;
                    if (lower.includes('web')) s += 50;
                    if (lower.includes('injection')) s += 50;
                    if (lower.includes('vuln')) s += 50;
                }

                if (lower.includes('readme')) s += 100;
                if (/\d{2}_/.test(lower)) s += 25;
                if (lower.includes('core')) s += 20;
                if (lower.includes('memory')) s += 20;
                if (lower.includes('store')) s += 15;
                if (lower.includes('client')) s += 15;
                if (lower.includes('agent')) s += 15;
                if (lower.includes('chain')) s += 12;
                if (lower.includes('graph')) s += 12;
                if (lower.includes('flow')) s += 12;
                if (lower.includes('rag')) s += 10;
                if (lower.includes('vector')) s += 15;
                if (lower.includes('embedding')) s += 15;
                if (lower.includes('workflow')) s += 10;
                if (lower.includes('main') || lower.includes('app') || lower.includes('index')) s += 5;
                if (lower.endsWith('.ipynb')) s += 10;
                if (lower.includes('__init__')) s -= 5;
                if (lower.includes('test')) s -= 10;

                return s;
            };
            return score(b.path) - score(a.path);
        }).slice(0, 45);

        let combinedContent = `REPOSITORY: ${owner}/${repo}\n\n`;
        const scannedList = [];
        const acquiredSkills = new Set();

        // 4. Fetch Content
        for (const file of priorityFiles) {
            const branch = treeRes.url.includes('/main') ? 'main' : 'master';
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;

            // Extract Skill Name
            const tutorialMatch = file.path.match(/(?:^|\/)(\d{2}_[a-zA-Z0-9_]+)/);
            if (tutorialMatch) {
                const skillName = tutorialMatch[1].replace(/^\d+_/, '').replace(/_/g, ' ');
                acquiredSkills.add(skillName);
            } else {
                const parts = file.path.split('/');
                if (parts.length > 1) {
                    const parentDir = parts[parts.length - 2];
                    if (!['src', 'lib', 'test', 'tests', 'examples', 'utils', owner].includes(parentDir)) {
                        const skillName = parentDir.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase();
                        if (skillName.length < 20) acquiredSkills.add(skillName);
                    }
                }
            }

            if (repo === 'mem0' && file.path.includes('readme')) {
                acquiredSkills.add('MEMORY MANAGEMENT LAYER (USER/SESSION/AGENT)');
            }

            try {
                const contentRes = await fetch(rawUrl);
                if (contentRes.ok) {
                    let text = await contentRes.text();
                    scannedList.push(file.path);

                    // Parse Notebooks
                    if (file.path.endsWith('.ipynb')) {
                        try {
                            const json = JSON.parse(text);
                            const cells = json.cells || [];
                            text = cells
                                .filter(c => c.cell_type === 'code' || c.cell_type === 'markdown')
                                .map(c => {
                                    const source = Array.isArray(c.source) ? c.source.join('') : c.source;
                                    const type = c.cell_type.toUpperCase();
                                    return `[${type}]\n${source}\n[/${type}]`;
                                })
                                .join('\n\n');
                        } catch (e) {
                            console.warn(`Failed to parse notebook ${file.path}`);
                        }
                    }

                    if (file.path.toLowerCase().includes('readme')) {
                        combinedContent = `--- README SUMMARY ---\n${text.substring(0, 5000)}\n\n` + combinedContent;
                    } else {
                        combinedContent += `--- FILE: ${file.path} ---\n${text.substring(0, 15000)}\n\n`;
                    }
                }
            } catch (e) {
                console.warn(`Failed to fetch ${file.path}`);
            }
        }

        res.json({
            title: `${owner}/${repo} (Deep Scan)`,
            content: combinedContent,
            scanned: scannedList,
            skills: Array.from(acquiredSkills)
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Web Scraping - Full Implementation
router.post('/scrape', async (req, res) => {
    let { url } = req.body;
    console.log(`[SCRAPE] Fetching: ${url}`);

    try {
        // Twitter/X Interceptor
        if (url.includes('x.com') || url.includes('twitter.com')) {
            console.log(`[SCRAPE] Detected X/Twitter URL. Bypassing via fxtwitter API...`);

            const idMatch = url.match(/(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/(\d+)/);
            if (idMatch && idMatch[1]) {
                const tweetId = idMatch[1];

                let fxUrl = `https://api.fxtwitter.com/status/${tweetId}`;
                let fxRes = await fetch(fxUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' } });

                if (!fxRes.ok) {
                    fxUrl = `https://api.fixupx.com/status/${tweetId}`;
                    fxRes = await fetch(fxUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' } });
                }

                if (!fxRes.ok) {
                    return res.status(400).json({ error: `Twitter API Bypass Failed: ${fxRes.status}` });
                }

                const fxData = await fxRes.json();

                if (fxData && fxData.tweet) {
                    const t = fxData.tweet;
                    const content = `TWEET BY: ${t.author.name} (@${t.author.screen_name})\n` +
                        `DATE: ${new Date(t.created_at * 1000).toLocaleString()}\n\n` +
                        `${t.text}\n\n` +
                        `[METADATA] Likes: ${t.likes} | Retweets: ${t.retweets} | Replies: ${t.replies}`;

                    return res.json({
                        title: `Tweet by @${t.author.screen_name}`,
                        content: content,
                        scanned: [url],
                        skills: ['SOCIAL_MEDIA_INTEL']
                    });
                }
            }
        }

        // Google Docs Handler
        if (url.includes('docs.google.com/document/d/')) {
            const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (docIdMatch && docIdMatch[1]) {
                url = `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`;
                console.log(`[SCRAPE] Detected Google Doc. Transformed to Export URL: ${url}`);
            }
        }

        // Fetch with browser headers
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.google.com/'
            }
        });

        if (!response.ok) {
            return res.status(400).json({ error: `Failed to fetch URL: ${response.status}` });
        }

        let text = "";
        let title = url;

        if (url.includes('export?format=txt')) {
            text = await response.text();
            title = "Google Document (Exported)";
        } else {
            const html = await response.text();

            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            title = titleMatch ? titleMatch[1] : url;

            // HTML to text
            let cleanHtml = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");

            cleanHtml = cleanHtml.replace(/<\/(div|p|h1|h2|h3|h4|h5|h6|li|ul|ol|tr|br)>/gi, "\n");

            text = cleanHtml.replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        }

        res.json({
            title: title,
            content: text.substring(0, 40000),
            scanned: [url],
            skills: ['WEB_ANALYSIS', 'CONTENT_EXTRACTION', 'DOC_PARSING']
        });

    } catch (e) {
        console.error("Scrape Failed:", e);
        res.status(500).json({ error: e.message });
    }
});

export default router;

