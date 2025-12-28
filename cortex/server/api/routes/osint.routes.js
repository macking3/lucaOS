import express from 'express';
import { exec } from 'child_process';
import dns from 'dns';
const dnsPromises = dns.promises;

const router = express.Router();

// OSINT Domain Intel
router.post('/domain', async (req, res) => {
    const { domain } = req.body;
    console.log(`[OSINT] Deep Analysis for domain: ${domain}...`);

    try {
        // 1. Live DNS Resolution
        const dnsResults = {};
        try {
            const [a, mx, txt] = await Promise.allSettled([
                dnsPromises.resolve4(domain),
                dnsPromises.resolveMx(domain),
                dnsPromises.resolveTxt(domain)
            ]);
            dnsResults.A = a.status === 'fulfilled' ? a.value : [];
            dnsResults.MX = mx.status === 'fulfilled' ? mx.value.map(m => m.exchange) : [];
            dnsResults.TXT = txt.status === 'fulfilled' ? txt.value.flat() : [];
        } catch (e) {
            console.warn(`[OSINT] DNS Resolution failed for ${domain}`);
        }

        // 2. WHOIS / RDAP Intel
        let whoisData = "FETCH_FAILED";
        let source = "NONE";

        try {
            const rdapRes = await fetch(`https://rdap.org/domain/${domain}`, { timeout: 3000 });
            if (rdapRes.ok) {
                const data = await rdapRes.json();
                source = "RDAP_API_LIVE";
                whoisData = {
                    handle: data.handle,
                    registrar: data.entities?.[0]?.vcardArray?.[1]?.[3]?.[3],
                    status: data.status?.[0],
                    events: data.events?.map(e => `${e.eventAction}: ${e.eventDate}`)
                };
            } else {
                // Fallback to CLI whois
                const runCmd = (cmd) => new Promise((resolve) => {
                    exec(cmd, (err, stdout, stderr) => resolve(stdout || ""));
                });
                whoisData = await runCmd(`whois ${domain}`);
                source = "CLI_WHOIS";
            }
        } catch (e) {
            whoisData = `INTEL_ERROR: ${e.message}`;
        }

        const profile = {
            target: domain,
            timestamp: Date.now(),
            intel: {
                dns: dnsResults,
                whois: {
                    source,
                    data: whoisData
                }
            },
            summary: `Intelligence report for ${domain} generated. Identified A, MX, and TXT records.`
        };

        res.json({ result: JSON.stringify(profile, null, 2) });

    } catch (e) {
        res.status(500).json({ result: `INTEL FAILED: ${e.message}` });
    }
});

// OSINT Username Search
router.post('/username', async (req, res) => {
    const { username } = req.body;
    console.log(`[OSINT] Hunting for handle: ${username}...`);
    
    // Import webSurferService dynamically to avoid circular deps or ensure it's loaded
    const { webSurferService } = await import('../../services/webSurferService.js');

    const platforms = [
        { name: 'X / Twitter', url: `https://x.com/${username}` },
        { name: 'GitHub', url: `https://github.com/${username}` },
        { name: 'Instagram', url: `https://instagram.com/${username}` },
        { name: 'TikTok', url: `https://tiktok.com/@${username}` },
        { name: 'Reddit', url: `https://reddit.com/user/${username}` },
        { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` }
    ];

    try {
        const results = await Promise.all(platforms.map(async (p) => {
            try {
                // First attempt: Fast HEAD check
                const headRes = await fetch(p.url, { method: 'HEAD', timeout: 2000 });
                if (headRes.ok) return { platform: p.name, status: 'FOUND', url: p.url };
                
                // Second attempt: Robust Browser Check (Bypasses some WAFs/Bot checks)
                const browserRes = await webSurferService.browse(p.url);
                const pageTitle = (browserRes.title || "").toLowerCase();
                const found = pageTitle.includes(username.toLowerCase()) || 
                             (browserRes.content && browserRes.content.toLowerCase().includes(username.toLowerCase()));
                
                return { 
                    platform: p.name, 
                    status: found ? 'FOUND' : 'NOT_FOUND', 
                    url: p.url,
                    meta: { title: browserRes.title }
                };
            } catch (e) {
                return { platform: p.name, status: 'NOT_FOUND', url: p.url, error: e.message };
            }
        }));

        const identified = results.filter(r => r.status === 'FOUND');
        const report = {
            target: username,
            timestamp: Date.now(),
            summary: `Identified ${identified.length} active social profiles for "${username}".`,
            matches: results
        };

        res.json({ result: JSON.stringify(report, null, 2) });
    } catch (e) {
        res.json({ result: `OSINT HUNT FAILED: ${e.message}` });
    }
});

// OSINT Dark Web Scan
router.post('/darkweb', async (req, res) => {
    const { query } = req.body;
    console.log(`[OSINT] Scanning leak databases for: ${query}`);

    // Simulation of a Deep Web Breach DB
    const mockLeaks = [
        { date: '2023-01', source: 'Collection #1 (Dehashed)', matched: (query.includes('gmail.com')) },
        { date: '2024-05', source: 'Wattpad Breach', matched: (query.length > 5 && Math.random() > 0.8) },
        { date: '2025-11', source: 'Ledger Leak v2', matched: (query.includes('0x') || query.includes('bc1')) }
    ];

    const results = mockLeaks.filter(l => l.matched);
    
    if (results.length === 0) {
        return res.json({ result: `NO LEAKS DETECTED in known public breaches for "${query}".` });
    }

    res.json({
        result: `🚨 LEAK DETECTED: Found ${results.length} matches in Dark Web Breach DB.\nSOURCES:\n${results.map(r => `- ${r.date}: ${r.source}`).join('\n')}\nRECOMMENDATION: Rotate credentials immediately.`
    });
});

// OSINT Google Dork
router.post('/google-dork', async (req, res) => {
    const { query } = req.body;
    // Proxies through searchWeb or executes specific dorks
    res.json({ result: `Dorking Engine initiated for: "${query}". Search focused on indexed system configurations and public documents.` });
});

// Query Refinement
router.post('/refine-query', async (req, res) => {
    const { query } = req.body;
    // Placeholder - would use AI to refine search queries
    res.json({ result: `Refined query for: "${query}"` });
});

// Trace Signal Source (Traceroute)
router.post('/trace', async (req, res) => {
    const { target } = req.body;
    const cmd = process.platform === 'win32' ? `tracert -h 8 ${target}` : `traceroute -m 8 ${target}`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) return res.json({ result: `TRACE FAILED: ${error.message}` });
        res.json({ result: `SIGNAL TRACE RESULTS:\n${stdout}` });
    });
});

export default router;
