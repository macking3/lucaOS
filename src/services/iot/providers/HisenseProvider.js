import mqtt from 'mqtt';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';


// hardcoded certs for dev/testing - in prod ideally generate unique ones
const CLIENT_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCjin+l9z9BVN6e
V/UfR/d6Tn0dyCkw+4PwH4bpNniB19MiQ74ZpRqLM/GCdJO6FGbeHkIBPI/RqISF
jBs0vHG3M70TOutgMpH1C+X8UEn95bSjyEzFNYqdEJjQfwZvGEvEit0Rg0tnsCVf
6IWzGft9CTNnWwlNK0LrQ3euMrw0HMSQCgrcNM5fKN3ER+3yADaC5LsSKcDDybtC
T9Key+3XTnswqvh+/80NfaOmPSFUE23GL8YfnVzKZm4kJDMuVKLZo50+BSyvySTk
4YUY+Po1jaKGYKWRIulS5NC6VWBh2Vbc6fRlbIkXdGXOnsfPWRwJTzJ6k6jFDV65
KITC5nG/AgMBAAECggEAA5DgiajjezQzinZWhPEXx1XwynZz13qUfObjFTC33fTr
yKJ7gamk84YVbQfHtNX/DDbSr543cJXhFdxhN3woaps5MzMksLtJjXNN93t0sZGR
p8SVT/OD6zrSajFq3X9FH6r7eQdI3KDtn7K9P5OAdVB/C3DjuggIdILLGERI8EXr
X3dn3uk4eJLL9tTwnFPBtzcusVHE7PMWgdvBHjXphQC2XjH1dzyUWATDw41k3dhY
ZtONz3+tDR5cOVPnxJvvmgxURhFNt0fzYpnDmsMGWVr/UDAolyfFr7qkd3QpOiu1
tKhfuuT7Lw74QxOvXvlNJ1ewYT5MyMM8xFOJ/dkSwQKBgQDYSsWmY3bGdA6qH71d
4i6dpq7qwo71eTF2nYWepqKj4hY8lSqyxmd3n+BBjf5YfSDrzAhbM20v7eDwIAi9
sffE8VsewCnOWmKfuvntYaeWvOsFv2cpKFUZEHAFJGtnAkqrCFOT7dP8nf9ydS4r
WG3+MBPqSbLy9wOQOUXxIdOSIQKBgQDBkIxZTs5DykVHmDKFzXgELHxp7bVDjISo
y8v/qjotT0np40e5DmXjvggxfUFljL4nHodTcexcA4BqL8u4wKunRUW/zxX889NS
XdSQ/lOEuWyR0OwW9NTUHGsWF9yYZU0gNaugMfWw1YKv+2XIPMEsbFa9uRYXP8rU
2QuLUbNH3wKBgBBVTSmsdyqzVuwn62/shaKoFKtrt8n3tfGEIbQCV2PSzeUTSp8n
dmbFLvUkWOGryVGlHbhtYMBu0T6w3JgemVxI8Z2X21BW6P2w6/CuIC6043aSpqKo
Bg0Xfa4VuvqTZLoXreAM5KY99C1bhfoF+oBodwiJOjc4yg8ZFBwKduShAoGADMnq
G/Ry+FOi5CoQHHsI1O3DgpQsB7x+/1AHuGqc0WWNsqBLmtRysutZSzvFWFpGLft8
YW0DesjYcSubQCeqr7CJ/TRHdaD+c1CzvKixB/HgVHoDPzkJ3sHJ6XnGH2OCBwDE
yB7E5twUeGAZx3MMKE04JezWos6aLhnxA1FwkO0CgYA5ozSi/h29scxv99QgYiCw
JqnuWP5zZ0zHalnPaOifbIGh+6ZC4HaPp6WpeHrKPdmOzj8ldW1efgfYp0vwg+zw
VZbVynRUxO8L3MjZtTbXx19v5Gl5kWo2g/Kc0Qqtu1bGho/SOAYYROBnjryjgrmM
+zUHraq8TqUjXgKzCdKwXA==
-----END PRIVATE KEY-----`;

const CLIENT_CERT = `-----BEGIN CERTIFICATE-----
MIIDDTCCAfWgAwIBAgIUYXhe+r/qszm4Ve5p2ZFVGMJEeK0wDQYJKoZIhvcNAQEL
BQAwFjEUMBIGA1UEAwwLbHVjYS1yZW1vdGUwHhcNMjUxMjIwMDMzMDI2WhcNMzUx
MjE4MDMzMDI2WjAWMRQwEgYDVQQDDAtsdWNhLXJlbW90ZTCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBAKOKf6X3P0FU3p5X9R9H93pOfR3IKTD7g/Afhuk2
eIHX0yJDvhmlGosz8YJ0k7oUZt4eQgE8j9GohIWMGzS8cbczvRM662AykfUL5fxQ
Sf3ltKPITMU1ip0QmNB/Bm8YS8SK3RGDS2ewJV/ohbMZ+30JM2dbCU0rQutDd64y
vDQcxJAKCtw0zl8o3cRH7fIANoLkuxIpwMPJu0JP0p7L7ddOezCq+H7/zQ19o6Y9
IVQTbcYvxh+dXMpmbiQkMy5UotmjnT4FLK/JJOThhRj4+jWNooZgpZEi6VLk0LpV
YGHZVtzp9GVsiRd0Zc6ex89ZHAlPMnqTqMUNXrkohMLmcb8CAwEAAaNTMFEwHQYD
VR0OBBYEFDdHUtMyKwS2pifsHDcaJf/ADh1eMB8GA1UdIwQYMBaAFDdHUtMyKwS2
pifsHDcaJf/ADh1eMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEB
AF7i0H/U+j4pQnisjYAsOLjNhKmyhIIHuWrc0YRiiCdBMOj8eK3DyRc01NLNh+In
W7hh2tc3GDFodI0Tek+GGN1IDjSCTr3m58BEqLXS2+1h96YAFMsU1p/e3UEAlOSx
d8oBG975dIr+mP9MHOEsoc8OfPILbBaA2lIda3iPpiocOFvYu6oMpssIw63vhaAE
NSPli0QoXmgDH/MpNb5BMTgTu7lDjgM1UYXHD22E3KZM8Um4GPnEliwTa48o4vHD
uuPKsa/sv0TGxAUXXpZVUuOMeho4Fwhq4LR5V8UzbI9PG7fez+vWtYzsgK5nwPnJ
PK0BZ1I/u9Kdbt1XCKmc5AI=
-----END CERTIFICATE-----`;

class HisenseProvider {
    constructor() {
        this.client = null;
        this.devices = new Map(); // id -> device
        this.isConnected = false;
        this.paired = false;
    }

    // Connect to a specific IP
    connect(ip) {
        const brokerUrl = `mqtts://${ip}:36669`;
        
        console.log(`[HISENSE] Connecting to ${brokerUrl}...`);

        let key = null;
        let cert = null;

        try {
            // Attempt to load keys from src/resources/certs
            const certPath = path.resolve('src/resources/certs/rcm_certchain_pem.cer');
            const keyPath = path.resolve('src/resources/certs/rcm_pem_privkey.pkcs8');

            if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                cert = fs.readFileSync(certPath);
                key = fs.readFileSync(keyPath);
                console.log('[HISENSE] Loaded official certificates.');
            } else {
                console.warn('###########################################################');
                console.warn('[HISENSE] MISSING CERTIFICATES!');
                console.warn(`Expected at: ${certPath}`);
                console.warn('To fix SSL Error, download keys from: https://github.com/d3nd3/Hisense-mqtt-keyfiles/blob/main/hi_keys.zip');
                console.warn('Extract rcm_certchain_pem.cer and rcm_pem_privkey.pkcs8 into src/resources/certs/');
                console.warn('###########################################################');
            }
        } catch (e) {
            console.error('[HISENSE] Cert loading error:', e);
        }

        // Modernized Handshake for ConnectLife Compatibility
        const uniqueSuffix = Math.random().toString(16).slice(2, 10);
        const options = {
            rejectUnauthorized: false, 
            username: 'hisenseservice', 
            password: 'multimqttservice',
            clientId: `luca_remote_${uniqueSuffix}`, 
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: false, // Maintain session
            keepalive: 60,
            connectTimeout: 5000,
            reconnectPeriod: 1000
        };

        if (key && cert) {
            options.key = key;
            options.cert = cert;
        }
        
        // Note: For actual Hisense, we often need specific Certs. 
        // For now, testing generic TLS connection.

        try {
            this.client = mqtt.connect(brokerUrl, options);

            this.client.on('connect', () => {
                console.log(`[HISENSE] MQTT Connected to ${ip}`);
                this.isConnected = true;
                this.subscribe();
            });

            this.client.on('error', (err) => {
                console.error(`[HISENSE] MQTT Error:`, err.message);
                this.isConnected = false;
            });

            this.client.on('message', (topic, message) => {
                this.handleMessage(topic, message);
            });

        } catch (e) {
            console.error(`[HISENSE] Connection setup failed:`, e);
        }
    }

    subscribe() {
        if (!this.client) return;
        // Standard topics for VIDAA
        this.client.subscribe('/remoteapp/mobile/#', (err) => {
            if (!err) console.log('[HISENSE] Subscribed to /remoteapp/mobile/#');
        });
    }

    handleMessage(topic, message) {
        console.log(`[HISENSE] Msg [${topic}]: ${message.toString()}`);
        // Handle pairing challenge here if checking payload
    }

    // Main Control Function
    async sendCommand(action, params = {}) {
        if (!this.client || !this.isConnected) {
            console.warn('[HISENSE] Not connected');
            return false;
        }

        // Newer VIDA firmware often prefers /remoteapp/tv/ui_service/${MAC_OR_UUID}/sendkey
        // Extracting identifier from deviceId: dlna_192_168_1_122 or other UUIDs
        const identifier = params.deviceId ? params.deviceId.replace('dlna_', '').replace(/_/g, '.') : null;
        
        let topic = identifier 
            ? `/remoteapp/tv/ui_service/${identifier}/sendkey`
            : '/remoteapp/tv/ui_service/sendkey';
        let payload = '';

        // Mapping
        // Standard keys often JSON: { "key_code": "KEY_HOME" } or similar
        const keyMap = {
            'HOME': 'KEY_HOME',
            'MENU': 'KEY_MENU',
            'UP': 'KEY_UP',
            'DOWN': 'KEY_DOWN',
            'LEFT': 'KEY_LEFT',
            'RIGHT': 'KEY_RIGHT',
            'OK': 'KEY_OK',
            'BACK': 'KEY_RETURNS',
            'EXIT': 'KEY_EXIT',
            'VOL_UP': 'KEY_VOLUMEUP',
            'VOL_DOWN': 'KEY_VOLUMEDOWN',
            'MUTE': 'KEY_MUTE',
            'POWER': 'KEY_POWER',
            'CH_UP': 'KEY_CHANNELUP',
            'CH_DOWN': 'KEY_CHANNELDOWN',
            'NETFLIX': 'KEY_NETFLIX',
            'YOUTUBE': 'KEY_YOUTUBE',
            'PRIME': 'KEY_AMAZON',
            'DISNEY': 'KEY_DISNEY',
            'BROWSER': 'KEY_BROWSER',
            'YT_MUSIC': 'KEY_YOUTUBE_MUSIC',
            'INPUT': 'KEY_INPUT'
        };

        if (keyMap[action]) {
            payload = JSON.stringify({ action: "sendkey", key_code: keyMap[action] });
        } else if (action === 'AUTH_PAIR') {
            // Special pairing logic
            topic = identifier 
                ? `/remoteapp/tv/platform_service/${identifier}/kal_auth/input_pin`
                : '/remoteapp/tv/platform_service/kal_auth/input_pin';
            payload = JSON.stringify({ pin: params.pin });
            console.log(`[HISENSE] Sending auth PIN: ${params.pin} to ${topic}`);
        } else {
            console.warn(`[HISENSE] Unknown action: ${action}`);
            return false;
        }

        this.client.publish(topic, payload, (err) => {
            if (err) console.error('[HISENSE] Publish Error:', err);
            else console.log(`[HISENSE] Sent ${action}`);
        });

        return true;
    }
}

export default new HisenseProvider();
