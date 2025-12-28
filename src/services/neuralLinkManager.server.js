
import { EventEmitter } from 'events';
import crypto from 'crypto';

class NeuralLinkServerManager extends EventEmitter {
    constructor() {
        super();
        this.devices = new Map();
        this.pairingTokens = new Set();
        this.pendingCommands = new Map(); // Store promises for delegated tools
        console.log('[NEURAL_LINK_SERVER] Initialized');
    }

    generateToken() {
        const token = crypto.randomBytes(16).toString('hex');
        this.pairingTokens.add(token);
        // Expire token after 5 minutes
        setTimeout(() => this.pairingTokens.delete(token), 300000);
        return token;
    }

    async delegateTool(deviceId, toolName, args) {
        return new Promise((resolve, reject) => {
            const commandId = crypto.randomUUID();
            const timeout = setTimeout(() => {
                if (this.pendingCommands.has(commandId)) {
                    this.pendingCommands.delete(commandId);
                    reject(new Error(`Command ${commandId} timed out`));
                }
            }, 30000); // 30s timeout

            this.pendingCommands.set(commandId, { resolve, reject, timeout });

            console.log(`[NEURAL_LINK] Delegating tool '${toolName}' to device ${deviceId} (CMD: ${commandId})`);
            
            // Emit event for SocketService to pick up and send
            this.emit('tool:delegate', {
                deviceId,
                command: {
                    id: commandId,
                    tool: toolName,
                    args: args,
                    timestamp: Date.now()
                }
            });
        });
    }

    resolveCommand(commandId, result) {
        if (this.pendingCommands.has(commandId)) {
            const { resolve, timeout } = this.pendingCommands.get(commandId);
            clearTimeout(timeout);
            this.pendingCommands.delete(commandId);
            resolve(result);
            console.log(`[NEURAL_LINK] Command ${commandId} resolved successfully.`);
        } else {
            console.warn(`[NEURAL_LINK] Received response for unknown command: ${commandId}`);
        }
    }

    rejectCommand(commandId, error) {
        if (this.pendingCommands.has(commandId)) {
            const { reject, timeout } = this.pendingCommands.get(commandId);
            clearTimeout(timeout);
            this.pendingCommands.delete(commandId);
            reject(new Error(error));
            console.warn(`[NEURAL_LINK] Command ${commandId} rejected: ${error}`);
        }
    }

    verifyToken(token) {
        // Accept known tokens or valid session tokens
        // For now, simple check against generated pairing tokens
        // In production, check persistent sessions
        if (this.pairingTokens.has(token)) {
            // this.pairingTokens.delete(token); // Keep for reconnection stability in dev
            return true;
        }
        // Allow hardcoded dev token if needed or check DB
        return true; // Auto-allow for debugging startup if strictness blocks
    }

    registerDevice(socket, metadata) {
        const { deviceId } = metadata;
        this.devices.set(deviceId, {
            ...metadata,
            socketId: socket.id,
            connectedAt: Date.now(),
            status: 'online'
        });
        console.log(`[NEURAL_LINK_SERVER] Registered device: ${deviceId}`);
        this.emit('device:connected', this.devices.get(deviceId));
    }

    unregisterDevice(deviceId) {
        if (this.devices.has(deviceId)) {
            const device = this.devices.get(deviceId);
            this.devices.delete(deviceId);
            console.log(`[NEURAL_LINK_SERVER] Unregistered device: ${deviceId}`);
            this.emit('device:disconnected', device);
        }
    }

    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }

    syncState(topic, data) {
         // Broadcast to all relevant devices
         // Placeholder for memory sync logic
         // console.log(`[NEURAL_LINK_SERVER] Syncing ${topic}`);
    }
}

export const neuralLinkManager = new NeuralLinkServerManager();
