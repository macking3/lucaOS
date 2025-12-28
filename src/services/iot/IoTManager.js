import { EventEmitter } from 'events';
import dlnaProvider from './providers/DlnaProvider.js';
import hisenseProvider from './providers/HisenseProvider.js';

class IoTManager extends EventEmitter {
    constructor() {
        super();
        this.providers = new Map();
        this.devices = new Map();
        console.log('[IoT_MANAGER] Initialized');
    }

    // Alias for removeListener for EventEmitter compatibility
    off(event, listener) {
        return this.removeListener(event, listener);
    }

    async registerProvider(provider) {
        if (this.providers.has(provider.name)) {
            console.warn(`[IoT_MANAGER] Provider ${provider.name} already registered`);
            return;
        }

        console.log(`[IoT_MANAGER] Registering provider: ${provider.name}`);
        this.providers.set(provider.name, provider);

        provider.on('device_updated', (device) => {
            this.updateDeviceState(device);
        });

        // Refetch devices on reconnection/authentication
        provider.on('authenticated', (success) => {
            if (success) {
                console.log(`[IoT_MANAGER] Provider ${provider.name} authenticated/reconnected. Refreshing devices...`);
                this.refreshDevices(provider.name);
            }
        });

        try {
            const connected = await provider.connect();
            if (connected) {
                console.log(`[IoT_MANAGER] Connected to ${provider.name}`);
                await this.refreshDevices(provider.name);
            }
        } catch (error) {
            console.error(`[IoT_MANAGER] Failed to connect to ${provider.name}:`, error);
        }
    }

    async refreshDevices(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider) return;

        try {
            const result = await provider.getDevices();
            // Validate result is an array before processing
            const devices = Array.isArray(result) ? result : [];
            
            devices.forEach(device => {
                this.devices.set(device.id, device);
            });
            console.log(`[IoT_MANAGER] Refreshed ${devices.length} devices from ${providerName}`);
            if (this.retryCounts) this.retryCounts.delete(providerName);
            this.emit('devices_updated', Array.from(this.devices.values()));
        } catch (error) {
            console.error(`[IoT_MANAGER] Failed to refresh devices from ${providerName}:`, error);
            
            // Retry logic for connection issues
            if (!this.retryCounts) this.retryCounts = new Map();
            const retries = this.retryCounts.get(providerName) || 0;

            if ((error.message.includes('Not connected') || error.message.includes('closed')) && retries < 3) {
                 const nextRetry = retries + 1;
                 this.retryCounts.set(providerName, nextRetry);
                 console.log(`[IoT_MANAGER] Retrying refresh for ${providerName} in 2s... (Attempt ${nextRetry}/3)`);
                 setTimeout(() => this.refreshDevices(providerName), 2000);
            } else {
                // Reset counter on success or max retries
                if (retries >= 3) {
                     console.error(`[IoT_MANAGER] Max retries reached for ${providerName}.`);
                     this.retryCounts.delete(providerName);
                }
            }
        }
    }

    updateDeviceState(device) {
        this.devices.set(device.id, device);
        this.emit('device_updated', device);
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }

    // Alias for compatibility with d.ts and App.tsx
    getDevices() {
        return this.getAllDevices();
    }

    getDevice(id) {
        return this.devices.get(id);
    }

    async controlDevice(deviceId, action, params = {}) {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }

        // [OVERRIDE] Check for Native Hisense Actions (MQTT)
        // Guard: Only for Hisense/VIDAA devices
        const isHisense = device.name && (device.name.toLowerCase().includes('hisense') || device.name.toLowerCase().includes('vidaa'));

        if (isHisense) {
            // Extract IP from ID: dlna_192_168_1_122
            const ipMatch = deviceId.match(/dlna_(\d+)_(\d+)_(\d+)_(\d+)/);
            let ip = null;
            if (ipMatch) {
                ip = `${ipMatch[1]}.${ipMatch[2]}.${ipMatch[3]}.${ipMatch[4]}`;
            }

            const HISENSE_NATIVE = [
                'MENU', 'HOME', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'OK', 'BACK', 'EXIT', 'AUTH_PAIR', 'POWER',
                'CH_UP', 'CH_DOWN', 'NETFLIX', 'YOUTUBE', 'PRIME', 'DISNEY', 'BROWSER', 'YT_MUSIC',
                'INPUT', 'MUTE', 'VOL_UP', 'VOL_DOWN'
            ];

            if (ip && (HISENSE_NATIVE.includes(action) || action === 'PAIR')) {
                console.log(`[IoT_MANAGER] Switching to HISENSE MQTT for ${action} on ${ip}`);
                
                // Initial Connect
                if (!hisenseProvider.isConnected) {
                    hisenseProvider.connect(ip);
                    // Tiny delay for handshake
                    await new Promise(r => setTimeout(r, 200));
                }
                
                return await hisenseProvider.sendCommand(action, { ...params, deviceId });
            }
        }

        if (!device.providerId) {
            // If device exists but no provider, it might be a ghost or manually added
             throw new Error(`Device ${deviceId} has no provider`);
        }

        const provider = this.providers.get(device.providerId);
        if (!provider) {
            throw new Error(`Provider ${device.providerId} not found`);
        }

        console.log(`[IoT_MANAGER] Controlling ${device.name} (${action}) via ${device.providerId}`);
        return await provider.controlDevice(deviceId, action, params);
    }
}

export const iotManager = new IoTManager();
export default iotManager;
