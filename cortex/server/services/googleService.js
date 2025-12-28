import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { DATA_DIR, AUTH_PORT } from '../config/constants.js';

const TOKENS_PATH = path.join(DATA_DIR, 'google_tokens.json');

// Get client credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = `http://localhost:${AUTH_PORT}/api/google/auth/callback`;

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
    'https://www.googleapis.com/auth/documents'
];

class GoogleService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        this.tokens = null;
        this.loadTokens();
    }

    loadTokens() {
        if (fs.existsSync(TOKENS_PATH)) {
            try {
                const data = fs.readFileSync(TOKENS_PATH, 'utf8');
                this.tokens = JSON.parse(data);
                this.oauth2Client.setCredentials(this.tokens);
                console.log('[GOOGLE] Tokens loaded from storage.');
            } catch (e) {
                console.error('[GOOGLE] Failed to load tokens:', e.message);
            }
        }
    }

    saveTokens(tokens) {
        this.tokens = tokens;
        this.oauth2Client.setCredentials(tokens);
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
        console.log('[GOOGLE] Tokens saved to storage.');
    }

    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });
    }

    async handleCallback(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.saveTokens(tokens);
            return { success: true, message: "Authentication successful" };
        } catch (e) {
            console.error('[GOOGLE] Auth Callback Error:', e.message);
            throw new Error(`Auth failed: ${e.message}`);
        }
    }

    async executeTool(name, args) {
        console.log(`[GOOGLE] Executing tool: ${name}`, args);
        try {
            switch (name) {
                case 'gmail_list_messages':
                    return await this.gmailListMessages(args);
                case 'gmail_get_message':
                    return await this.gmailGetMessage(args);
                case 'gmail_send_message':
                    return await this.gmailSendMessage(args);
                case 'drive_list_files':
                    return await this.driveListFiles(args);
                case 'drive_search':
                    return await this.driveSearch(args);
                case 'calendar_list_events':
                    return await this.calendarListEvents(args);
                case 'calendar_create_event':
                    return await this.calendarCreateEvent(args);
                case 'docs_get_document':
                    return await this.docsGetDocument(args);
                case 'docs_create_document':
                    return await this.docsCreateDocument(args);
                default:
                    throw new Error(`Tool ${name} not found in GoogleService`);
            }
        } catch (e) {
            console.error(`[GOOGLE] Tool ${name} failed:`, e.message);
            throw e;
        }
    }

    // --- GMAIL TOOLS ---
    async gmailListMessages({ query = '', maxResults = 10 }) {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults });
        return res.data;
    }

    async gmailGetMessage({ messageId }) {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        const res = await gmail.users.messages.get({ userId: 'me', id: messageId });
        return res.data;
    }

    async gmailSendMessage({ to, subject, body }) {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${to}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            body,
        ];
        const message = messageParts.join('\n');
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
            
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage },
        });
        return res.data;
    }

    // --- DRIVE TOOLS ---
    async driveListFiles({ query = '', maxResults = 10 }) {
        const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        const res = await drive.files.list({
            pageSize: maxResults,
            fields: 'nextPageToken, files(id, name, mimeType)',
            q: query
        });
        return res.data;
    }

    async driveSearch({ query }) {
        const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        const res = await drive.files.list({
            q: `name contains '${query}' or fullText contains '${query}'`,
            fields: 'files(id, name, mimeType, webViewLink)'
        });
        return res.data;
    }

    // --- CALENDAR TOOLS ---
    async calendarListEvents({ calendarId = 'primary', timeMin = new Date().toISOString(), maxResults = 10 }) {
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        const res = await calendar.events.list({
            calendarId,
            timeMin,
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data;
    }

    async calendarCreateEvent({ summary, description, start, end, location }) {
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary,
                location,
                description,
                start: { dateTime: start },
                end: { dateTime: end },
            },
        });
        return res.data;
    }

    // --- DOCS TOOLS ---
    async docsGetDocument({ documentId }) {
        const docs = google.docs({ version: 'v1', auth: this.oauth2Client });
        const res = await docs.documents.get({ documentId });
        return res.data;
    }

    async docsCreateDocument({ title }) {
        const docs = google.docs({ version: 'v1', auth: this.oauth2Client });
        const res = await docs.documents.create({ requestBody: { title } });
        return res.data;
    }

    async getStatus() {
        if (!this.tokens) return { status: 'DISCONNECTED' };
        
        try {
            // Check if token is expired and refresh if necessary
            const now = Date.now();
            if (this.tokens.expiry_date && now > this.tokens.expiry_date - 300000) {
                console.log('[GOOGLE] Refreshing expired token...');
                const { tokens } = await this.oauth2Client.refreshAccessToken();
                this.saveTokens(tokens);
            }
            
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            
            return {
                status: 'READY',
                email: userInfo.data.email,
                name: userInfo.data.name,
                picture: userInfo.data.picture
            };
        } catch (e) {
            console.error('[GOOGLE] Status Check Error:', e.message);
            return { status: 'ERROR', message: e.message };
        }
    }
}

export const googleService = new GoogleService();
