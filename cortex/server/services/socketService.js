import { Server as SocketIOServer } from 'socket.io';
import { WS_PORT } from '../config/constants.js';
// We need to pass neuralLinkManager instance or import it if singleton.
// Assuming neuralLinkManager is a singleton imported from src/services.
import { neuralLinkManager } from '../../../src/services/neuralLinkManager.server.js';

class SocketService {
    constructor() {
        this.io = null;
    }

    initialize() {
        if (this.io) return;

        this.io = new SocketIOServer(WS_PORT, {
            cors: {
                origin: "*", // Allow connections from mobile web app
                methods: ["GET", "POST"]
            },
            path: '/mobile/socket.io'
        });

        console.log(`[SOCKET] Mobile Socket.IO Server running on port ${WS_PORT}`);
        
        // Listen for server-side tool delegation
        neuralLinkManager.on('tool:delegate', (packet) => {
            const { deviceId, command } = packet;
            console.log(`[SOCKET] Relaying command ${command.id} to device ${deviceId}`);
            this.io.to(`device:${deviceId}`).emit('command:received', command);
        });

        this._setupEventListeners();
    }

    _setupEventListeners() {
        this.io.on('connection', (socket) => {
            const deviceId = socket.handshake.query.deviceId || `device_${socket.id}`;
            let clientType = socket.handshake.query.clientType || 'mobile'; // 'mobile', 'desktop', 'android', 'ios'

            // Detect device type from user agent if not specified
            const userAgent = socket.handshake.headers['user-agent'] || '';
            if (clientType === 'mobile') {
                if (userAgent.includes('Android')) {
                    clientType = 'android';
                } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
                    clientType = 'ios';
                }

                // SECURITY: Verify Token for Mobile Devices
                const token = socket.handshake.query.token;
                if (!neuralLinkManager.verifyToken(token)) {
                    console.warn(`[NEURAL LINK] Rejected connection from ${deviceId}: Invalid Token`);
                    socket.disconnect(true);
                    return;
                }
            }

            // Register Device & Join Room
            socket.join(`device:${deviceId}`);
            neuralLinkManager.registerDevice(socket, {
                deviceId,
                type: clientType,
                name: `${clientType}_${deviceId.substr(0, 4)}`,
                capabilities: [] // Will be updated via 'register' message
            });

            if (clientType === 'desktop') {
                socket.join('desktop');

                socket.on('generate_token', () => {
                    const token = neuralLinkManager.generateToken();
                    socket.emit('token_generated', { token });
                });

                socket.on('stream_screen', (data) => {
                    this.io.emit('server:stream', {
                        ...data,
                        source: 'desktop'
                    });
                });
            }

            socket.on('register', (data) => {
                neuralLinkManager.registerDevice(socket, {
                    deviceId,
                    type: clientType,
                    name: data.name,
                    capabilities: data.capabilities
                });
            });
            
            socket.on('secure:message', (data) => {
                // Relay encrypted message
                // If it has a target, send only to that target
                // If no target, broadcast to all other connected devices
                if (data.target) {
                    this.io.to(`device:${data.target}`).emit('secure:message', {
                        ...data,
                        source: deviceId
                    });
                } else {
                    socket.broadcast.emit('secure:message', {
                        ...data,
                        source: deviceId
                    });
                }
            });

            socket.on('command:result', (data) => {
                // Relay result back to NeuralLinkManager to resolve promise
                if (data.error) {
                    neuralLinkManager.rejectCommand(data.id, data.error);
                } else {
                    neuralLinkManager.resolveCommand(data.id, data.result);
                }
            });

            socket.on('disconnect', () => {
                neuralLinkManager.unregisterDevice(deviceId);
            });
        });
    }

    getIO() {
        return this.io;
    }

    isRunning() {
        return this.io !== null;
    }

    shutdown() {
        if (this.io) {
            console.log('[SOCKET] Shutting down Neural Link socket server...');
            this.io.disconnectSockets(true);
            this.io.close();
            this.io = null;
            console.log('[SOCKET] Neural Link socket server stopped.');
        }
    }
}

export const socketService = new SocketService();
