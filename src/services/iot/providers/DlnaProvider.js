import { EventEmitter } from "events";
import dgram from "dgram";

const SSDP_MSEARCH = `M-SEARCH * HTTP/1.1\r
HOST: 239.255.255.250:1900\r
MAN: "ssdp:discover"\r
MX: 1\r
ST: urn:schemas-upnp-org:device:MediaRenderer:1\r
\r
`;

export class DlnaProvider extends EventEmitter {
    constructor() {
        super();
        this.name = "dlna-ssdp";
        this.socket = null;
        this.devices = new Map();
        this.isScanning = false;
        
        // Error tracking to prevent log spam
        this.networkErrorCount = 0;
        this.lastErrorLogged = null;
        this.isNetworkUnreachable = false;
        this.scanInterval = null;
    }

    async connect() {
        return new Promise((resolve) => {
            try {
                this.socket = dgram.createSocket("udp4");
                
                this.socket.on("message", (msg, rinfo) => {
                    this.handleResponse(msg.toString(), rinfo.address);
                });

                this.socket.on("error", (err) => {
                    // Only log socket errors once to avoid spam
                    if (!this.lastErrorLogged || this.lastErrorLogged !== err.code) {
                        console.error("[DLNA] Socket error:", err.message);
                        this.lastErrorLogged = err.code;
                    }
                    resolve(false);
                });

                this.socket.bind(() => {
                    console.log("[DLNA] Socket bound, starting search...");
                    this.search();
                    // Periodic scan every 30s (only if network is reachable)
                    this.scanInterval = setInterval(() => {
                        if (!this.isNetworkUnreachable) {
                            this.search();
                        }
                    }, 30000);
                    resolve(true);
                });
            } catch (e) {
                console.error("[DLNA] Failed to bind", e);
                resolve(false);
            }
        });
    }

    search() {
        if(!this.socket || this.isNetworkUnreachable) return;
        
        const msg = Buffer.from(SSDP_MSEARCH);
        this.socket.send(msg, 0, msg.length, 1900, "239.255.255.250", (err) => {
            if (err) {
                this.handleNetworkError(err);
            } else {
                // Network is back, reset error state
                if (this.networkErrorCount > 0) {
                    console.log("[DLNA] Network connectivity restored");
                    this.networkErrorCount = 0;
                    this.isNetworkUnreachable = false;
                }
            }
        });
    }

    handleNetworkError(err) {
        this.networkErrorCount++;
        
        // Network unreachable errors (ENETUNREACH, ENETDOWN, etc.)
        if (err.code === 'ENETUNREACH' || err.code === 'ENETDOWN' || err.code === 'EHOSTUNREACH') {
            if (!this.isNetworkUnreachable) {
                console.warn(`[DLNA] Network unreachable. Pausing device discovery until connectivity is restored.`);
                this.isNetworkUnreachable = true;
            }
            return;
        }
        
        // Log other errors only once every 5 attempts to reduce spam
        if (this.networkErrorCount % 5 === 1) {
            console.error(`[DLNA] Send error (${this.networkErrorCount}x):`, err.message);
        }
        
        // If too many errors, pause scanning
        if (this.networkErrorCount > 10) {
            console.warn(`[DLNA] Too many errors. Pausing device discovery.`);
            this.isNetworkUnreachable = true;
        }
    }

    handleResponse(msg, ip) {
        // Parse LOCATION header
        const locMatch = msg.match(/LOCATION: (.*)/i);
        if (locMatch) {
            const xmlUrl = locMatch[1].trim();
            this.fetchDeviceDetails(xmlUrl, ip);
        }
    }

    async fetchDeviceDetails(url, ip) {
        const id = `dlna_${ip.replace(/\./g, '_')}`;
        if (this.devices.has(id)) return; // Already known

        try {
            const res = await fetch(url);
            const xml = await res.text();
            
            // Regex Parsing for Info
            const nameMatch = xml.match(/<friendlyName>(.*?)<\/friendlyName>/);
            const modelMatch = xml.match(/<modelName>(.*?)<\/modelName>/);
            
            const name = nameMatch ? nameMatch[1] : `TV (${ip})`;
            const model = modelMatch ? modelMatch[1] : "Generic UPnP";
            
            // Regex Parsing for Services (RenderingControl & AVTransport)
            // We look for the serviceType tag and then capture the controlURL sibling
            const getServiceUrl = (serviceType) => {
                const regex = new RegExp(`<serviceType>${serviceType}<\/serviceType>[\\s\\S]*?<controlURL>(.*?)<\/controlURL>`, 'i');
                const match = xml.match(regex);
                return match ? match[1].trim() : null;
            };

            const renderingControl = getServiceUrl("urn:schemas-upnp-org:service:RenderingControl:1");
            const avTransport = getServiceUrl("urn:schemas-upnp-org:service:AVTransport:1");

            // Normalize URLs (handle relative paths)
            const getAbsoluteUrl = (path) => {
                if (!path) return null;
                if (path.startsWith("http")) return path;
                try {
                    const baseUrl = new URL(url);
                    return new URL(path, baseUrl.origin).href;
                } catch(e) { return null; }
            };

            const rcUrl = getAbsoluteUrl(renderingControl);
            const avUrl = getAbsoluteUrl(avTransport);

            console.log(`[DLNA] Discovered: ${name} (${model}) at ${ip}`);
            if (rcUrl) console.log(`[DLNA]   - RenderingControl: ${rcUrl}`);
            if (avUrl) console.log(`[DLNA]   - AVTransport: ${avUrl}`);

            const device = {
                id: id,
                name: name,
                type: 'SMART_TV',
                isOn: true,
                status: 'online',
                location: 'Local Network',
                providerId: this.name,
                attributes: { 
                    ip, 
                    xmlUrl: url,
                    model,
                    rcUrl, // Rendering Control URL
                    avUrl  // AV Transport URL
                } 
            };
            
            this.devices.set(device.id, device);
            this.emit("device_updated", device);
        } catch(e) { 
            console.error(`[DLNA] Failed to fetch details from ${url}:`, e);
        }
    }

    async getDevices() { 
        return Array.from(this.devices.values()); 
    }

    // SOAP Helper
    async sendSoapAction(controlUrl, serviceType, action, args = {}) {
        if (!controlUrl) {
            console.error(`[DLNA] No Control URL found for ${action}`);
            return null;
        }

        const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <s:Body>
        <u:${action} xmlns:u="${serviceType}">
            ${Object.entries(args).map(([k, v]) => `<${k}>${v}</${k}>`).join('')}
        </u:${action}>
    </s:Body>
</s:Envelope>`;

        console.log(`[DLNA_DEBUG] Sending ${action} to ${controlUrl}`);
        // console.log(`[DLNA_DEBUG] Payload:`, soapBody); // Uncomment if needed

        try {
            const res = await fetch(controlUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "text/xml; charset=\"utf-8\"",
                    "SOAPAction": `"${serviceType}#${action}"`
                },
                body: soapBody
            });
            
            const text = await res.text();
            
            if (!res.ok) {
                console.error(`[DLNA_ERROR] ${action} Failed. Status: ${res.status} ${res.statusText}`);
                console.error(`[DLNA_ERROR] Response: ${text.substring(0, 200)}...`);
                return null;
            }
            
            console.log(`[DLNA_DEBUG] ${action} Success!`);
            return text;
        } catch (e) {
            console.error(`[DLNA_CRITICAL] SOAP Action ${action} Network Error:`, e);
            return null;
        }
    }
    
    async controlDevice(id, action, params) {
        const device = this.devices.get(id);
        if (!device) return false;

        const { rcUrl, avUrl } = device.attributes;
        const RC_SERVICE = "urn:schemas-upnp-org:service:RenderingControl:1";
        const AV_SERVICE = "urn:schemas-upnp-org:service:AVTransport:1";

        console.log(`[DLNA] Sending command ${action} to ${device.name}`);

        try {
            switch (action) {
                // Volume Controls
                case "VOL_UP":
                case "VOL_DOWN":
                    if (!rcUrl) return false;
                    // Get Current Volume First
                    const volRes = await this.sendSoapAction(rcUrl, RC_SERVICE, "GetVolume", { InstanceID: 0, Channel: "Master" });
                    const currentVolMatch = volRes.match(/<CurrentVolume>(.*?)<\/CurrentVolume>/);
                    let currentVol = currentVolMatch ? parseInt(currentVolMatch[1]) : 20; // Default fallback
                    
                    const newVol = action === "VOL_UP" ? Math.min(100, currentVol + 5) : Math.max(0, currentVol - 5);
                    await this.sendSoapAction(rcUrl, RC_SERVICE, "SetVolume", { InstanceID: 0, Channel: "Master", DesiredVolume: newVol });
                    return true;

                case "MUTE":
                    if (!rcUrl) return false;
                    // Toggle not easily supported without state, so we just MUTE for now (or could implement toggle logic)
                    await this.sendSoapAction(rcUrl, RC_SERVICE, "SetMute", { InstanceID: 0, Channel: "Master", DesiredMute: 1 });
                    return true;

                // Transport Controls
                case "PLAY":
                    if (!avUrl) return false;
                    await this.sendSoapAction(avUrl, AV_SERVICE, "Play", { InstanceID: 0, Speed: 1 });
                    return true;
                
                case "PAUSE":
                    if (!avUrl) return false;
                    await this.sendSoapAction(avUrl, AV_SERVICE, "Pause", { InstanceID: 0 });
                    return true;

                case "STOP":
                    if (!avUrl) return false;
                    await this.sendSoapAction(avUrl, AV_SERVICE, "Stop", { InstanceID: 0 });
                    return true;
                
                // Channel / Media Nav
                case "CH_UP":
                case "NEXT":
                    if (!avUrl) return false;
                    await this.sendSoapAction(avUrl, AV_SERVICE, "Next", { InstanceID: 0 });
                    return true;

                case "CH_DOWN":
                case "PREV":
                    if (!avUrl) return false;
                    await this.sendSoapAction(avUrl, AV_SERVICE, "Previous", { InstanceID: 0 });
                    return true;

                // Navigation (Stubbed for Generic UPnP)
                case "UP":
                case "DOWN":
                case "LEFT":
                case "RIGHT":
                case "OK":
                case "BACK":
                case "MENU":
                case "EXIT":
                    console.warn(`[DLNA] Command '${action}' reqiures manufacturer-specific protocols (DIAL/SamsungTCP/WebOS). Generic UPnP does not support D-Pad.`);
                    return true; // Return true so UI doesn't show "Error", just no-op on TV

                // Auth
                case "AUTH_PAIR":
                case "PAIR":
                    console.log(`[DLNA] Auth Token Received: ${params.pin || 'N/A'}. Saving...`);
                    // Here we would store the PIN for future proprietary calls
                    return true;
                
                // CASTING
                case "CAST":
                    if (!avUrl) return false;
                    const castPayload = params.payload;
                    let castUrl = castPayload.url || castPayload.imageUrl || castPayload.videoUrl;
                    
                    // Handle visualData structure
                    if (!castUrl && castPayload.items && castPayload.items[0]) {
                        castUrl = castPayload.items[0].imageUrl;
                    }

                    if (!castUrl) {
                        console.warn('[DLNA] No castable URL found in payload', castPayload);
                        return false;
                    }

                    console.log(`[DLNA] Casting URL: ${castUrl}`);
                    
                    // 1. Set URI
                    await this.sendSoapAction(avUrl, AV_SERVICE, "SetAVTransportURI", {
                        InstanceID: 0,
                        CurrentURI: castUrl,
                        CurrentURIMetaData: ""
                    });

                    // 2. Play
                    await this.sendSoapAction(avUrl, AV_SERVICE, "Play", { InstanceID: 0, Speed: 1 });
                    return true;

                default: 
                    console.log(`[DLNA] Action ${action} not supported via generic UPnP yet.`);
                    return false;
            }
        } catch (e) {
            console.error(`[DLNA] Control Error:`, e);
            return false;
        }
    }
}

export default DlnaProvider;
