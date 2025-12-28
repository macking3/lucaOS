import express from 'express';
import { whatsappService } from '../../services/whatsappService.js';
import wwebjs from 'whatsapp-web.js';

const { MessageMedia } = wwebjs;
const router = express.Router();

// Helper: Resolve contact name to chat ID
async function resolveContact(nameOrNumber) {
    const client = whatsappService.getClient();
    if (!client) return null;

    try {
        // If it looks like a number, format it
        if (/^\d+$/.test(nameOrNumber)) {
            return nameOrNumber.includes('@c.us') ? nameOrNumber : `${nameOrNumber}@c.us`;
        }

        // Search contacts
        const contacts = await client.getContacts();
        const match = contacts.find(c =>
            (c.name && c.name.toLowerCase().includes(nameOrNumber.toLowerCase())) ||
            (c.pushname && c.pushname.toLowerCase().includes(nameOrNumber.toLowerCase()))
        );

        return match ? match.id._serialized : null;
    } catch (e) {
        console.error('[WHATSAPP] Contact resolution failed:', e);
        return null;
    }
}

// --- STATUS & CONTROL ---

router.post('/start', async (req, res) => {
    await whatsappService.initialize();
    res.json(whatsappService.getStatus());
});

router.get('/status', (req, res) => {
    const status = whatsappService.getStatus();
    const uptime = status.startTime > 0 ? Date.now() - status.startTime : 0;
    res.json({ ...status, uptime });
});

router.post('/logout', async (req, res) => {
    const client = whatsappService.getClient();
    if (client) {
        try {
            await client.logout();
            res.json({ success: true });
        } catch (e) {
            res.json({ success: false, error: e.message });
        }
    } else {
        res.json({ success: false, error: "Client not active" });
    }
});

// --- MESSAGING ---

router.get('/chats', async (req, res) => {
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    const status = whatsappService.getStatus();
    
    if (!client || (status.status !== 'READY' && status.status !== 'AUTHENTICATED')) {
        return res.json({ chats: [] });
    }

    try {
        const chats = await client.getChats();
        const formatted = chats.map(c => ({
            id: c.id,
            name: c.name,
            isGroup: c.isGroup,
            timestamp: c.timestamp,
            unreadCount: c.unreadCount,
            lastMessage: c.lastMessage ? { body: c.lastMessage.body } : null
        })).slice(0, 20);
        res.json({ chats: formatted });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/contacts', async (req, res) => {
    const { query } = req.query;
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    const status = whatsappService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ contacts: [] });
    }

    try {
        let contacts = await client.getContacts();

        if (query) {
            const q = String(query).toLowerCase();
            contacts = contacts.filter(c =>
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.pushname && c.pushname.toLowerCase().includes(q)) ||
                c.number.includes(q)
            );
        }

        const formatted = contacts.slice(0, 50).map(c => ({
            id: c.id._serialized,
            name: c.name || c.pushname || c.number,
            number: c.number,
            isGroup: c.isGroup
        }));

        res.json({ contacts: formatted });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/send', async (req, res) => {
    const { contactName, message, number } = req.body;
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    const status = whatsappService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ success: false, error: "WhatsApp Neural Link Not Ready. Please pair your device." });
    }

    try {
        let chatId;
        if (number) {
            chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        } else if (contactName) {
            chatId = await resolveContact(contactName);
        }

        if (!chatId) {
            return res.json({ success: false, error: `Contact '${contactName}' not found.` });
        }

        await client.sendMessage(chatId, message);
        res.json({ success: true, to: chatId });
    } catch (e) {
        console.error("WhatsApp Send Error", e);
        res.json({ success: false, error: e.message });
    }
});

router.post('/send-image', async (req, res) => {
    const { contactName, caption, image } = req.body;
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    const status = whatsappService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ success: false, error: "WhatsApp Neural Link Not Ready." });
    }

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ success: false, error: `Contact '${contactName}' not found.` });

        const media = new MessageMedia('image/jpeg', image, 'image.jpg');
        await client.sendMessage(chatId, media, { caption: caption || '' });
        res.json({ success: true, to: chatId });
    } catch (e) {
        console.error("WhatsApp Image Error", e);
        res.json({ success: false, error: e.message });
    }
});

router.post('/chat-history', async (req, res) => {
    const { contactName, limit } = req.body;
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    const status = whatsappService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ error: "WhatsApp Neural Link Not Ready." });
    }

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ error: `Contact '${contactName}' not found.` });

        const chat = await client.getChatById(chatId);
        const searchLimit = limit || 10;
        const messages = await chat.fetchMessages({ limit: searchLimit });

        const formatted = messages.map(m => ({
            id: m.id._serialized,
            body: m.body,
            fromMe: m.fromMe,
            timestamp: m.timestamp,
            type: m.type,
            author: m.author
        }));

        res.json({ messages: formatted });
    } catch (e) {
        console.error("WhatsApp History Error", e);
        res.json({ error: e.message });
    }
});

// --- INTELLIGENCE TOOLS ---

router.post('/analyze-target', async (req, res) => {
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    if (!client) return res.status(503).json({ error: "WhatsApp Client not active" });

    const { target } = req.body;
    if (!target) return res.status(400).json({ error: "Target required" });

    try {
        let chatId = await resolveContact(target);
        if (!chatId) return res.status(404).json({ error: "Target not found" });

        const chat = await client.getChatById(chatId);
        const contact = await chat.getContact();

        const metadata = {
            id: contact.id._serialized,
            name: contact.name || contact.pushname || "Unknown",
            number: contact.number,
            isBusiness: contact.isBusiness,
            isEnterprise: contact.isEnterprise,
            about: await contact.getAbout() || "Hidden",
            profilePicUrl: await contact.getProfilePicUrl() || null
        };

        const messages = await chat.fetchMessages({ limit: 50 });
        const historyText = messages.map(m => `[${m.fromMe ? 'ME' : 'TARGET'}]: ${m.body}`).join('\\n');

        // AI Profiling (simplified - full implementation would use Gemini)
        const analysis = `Target Analysis:\\nMessage Count: ${messages.length}\\nRecent Activity: ${messages.length > 0 ? 'Active' : 'Inactive'}`;

        res.json({
            success: true,
            metadata,
            analysis,
            messageCount: messages.length
        });
    } catch (e) {
        console.error("[INTEL] Analysis failed", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/scrape-group', async (req, res) => {
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    if (!client) return res.status(503).json({ error: "WhatsApp Client not active" });

    const { groupName } = req.body;
    if (!groupName) return res.status(400).json({ error: "Group Name required" });

    try {
        const chats = await client.getChats();
        const group = chats.find(c => c.isGroup && c.name.toLowerCase().includes(groupName.toLowerCase()));

        if (!group) return res.status(404).json({ error: "Group not found" });

        const participants = group.participants;
        const memberList = await Promise.all(participants.map(async (p) => {
            const contact = await client.getContactById(p.id._serialized);
            return {
                id: p.id._serialized,
                number: contact.number,
                isAdmin: p.isAdmin,
                name: contact.name || contact.pushname || "Unknown",
                isBusiness: contact.isBusiness
            };
        }));

        res.json({
            success: true,
            groupName: group.name,
            groupId: group.id._serialized,
            memberCount: memberList.length,
            members: memberList,
            description: group.description
        });
    } catch (e) {
        console.error("[INTEL] Scrape failed", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/intel/profile', async (req, res) => {
    const { contactName } = req.body;
    const client = whatsappService.getClient();
    if (!client) return res.json({ error: "Neural Link Offline" });

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ error: "Target not found." });

        const contact = await client.getContactById(chatId);
        const picUrl = await contact.getProfilePicUrl();
        const about = await contact.getAbout();

        res.json({
            success: true,
            id: contact.id._serialized,
            name: contact.name || contact.pushname,
            number: contact.number,
            isBusiness: contact.isBusiness,
            isEnterprise: contact.isEnterprise,
            picUrl: picUrl || null,
            about: about || "No bio available"
        });
    } catch (e) {
        res.status(500).json({ error: `Intel Gathering Failed: ${e.message}` });
    }
});

router.post('/intel/group-members', async (req, res) => {
    const { groupName } = req.body;
    const client = whatsappService.getClient();

    try {
        const chats = await client.getChats();
        const group = chats.find(c => c.isGroup && c.name.toLowerCase().includes(groupName.toLowerCase()));

        if (!group) return res.json({ error: "Group not found." });

        const participants = [];
        for (const p of group.participants) {
            const contact = await client.getContactById(p.id._serialized);
            participants.push({
                id: p.id._serialized,
                name: contact.name || contact.pushname || "Unknown",
                number: contact.number,
                isAdmin: p.isAdmin,
                isSuperAdmin: p.isSuperAdmin
            });
        }

        res.json({
            success: true,
            groupName: group.name,
            groupId: group.id._serialized,
            memberCount: participants.length,
            members: participants
        });
    } catch (e) {
        res.status(500).json({ error: `Group Scrape Failed: ${e.message}` });
    }
});

router.post('/intel/presence', async (req, res) => {
    res.json({ status: "Feature requires real-time presence subscription loop." });
});

export default router;
