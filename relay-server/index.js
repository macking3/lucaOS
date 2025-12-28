import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, restrict to your domains
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Device registry: deviceId -> { socket, type, name, lastSeen }
const devices = new Map();

// Pairing tokens: token -> { createdAt, expiresAt }
const pairingTokens = new Map();

// Stats for monitoring
const stats = {
  totalConnections: 0,
  activeDevices: 0,
  messagesRelayed: 0,
  startTime: Date.now()
};

// Express middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Date.now() - stats.startTime,
    activeDevices: stats.activeDevices,
    totalConnections: stats.totalConnections,
    messagesRelayed: stats.messagesRelayed
  });
});

// Generate pairing token endpoint
app.post('/api/pairing/generate', (req, res) => {
  const token = generateToken();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  pairingTokens.set(token, {
    createdAt: Date.now(),
    expiresAt
  });
  
  // Clean up expired tokens
  setTimeout(() => pairingTokens.delete(token), 5 * 60 * 1000);
  
  res.json({ token, expiresAt });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[RELAY] New connection: ${socket.id}`);
  stats.totalConnections++;
  
  let deviceId = null;
  let deviceInfo = null;

  // Device registration
  socket.on('register', (data) => {
    const { deviceId: id, type, name, token } = data;
    
    // Verify pairing token
    if (!verifyToken(token)) {
      socket.emit('error', { message: 'Invalid or expired pairing token' });
      socket.disconnect();
      return;
    }
    
    deviceId = id;
    deviceInfo = {
      socket,
      type: type || 'unknown',
      name: name || `Device ${id.substring(0, 8)}`,
      lastSeen: Date.now(),
      connectedAt: Date.now()
    };
    
    devices.set(deviceId, deviceInfo);
    stats.activeDevices = devices.size;
    
    console.log(`[RELAY] Registered device: ${deviceInfo.name} (${deviceId}) [${deviceInfo.type}]`);
    
    // Send confirmation
    socket.emit('registered', {
      deviceId,
      relayServer: 'connected',
      activeDevices: stats.activeDevices
    });
    
    // Broadcast device registry to all devices
    broadcastRegistry();
  });

  // Message routing
  socket.on('message', (message) => {
    if (!deviceId) {
      socket.emit('error', { message: 'Device not registered' });
      return;
    }
    
    stats.messagesRelayed++;
    
    const { target, type } = message;
    
    console.log(`[RELAY] Routing ${type} from ${deviceId} -> ${target}`);
    
    if (target === 'all') {
      // Broadcast to all devices except sender
      for (const [id, device] of devices) {
        if (id !== deviceId) {
          device.socket.emit('message', message);
        }
      }
    } else {
      // Route to specific device
      const targetDevice = devices.get(target);
      if (targetDevice) {
        targetDevice.socket.emit('message', message);
      } else {
        socket.emit('error', { 
          message: `Target device ${target} not connected`,
          messageId: message.id
        });
      }
    }
  });

  // Heartbeat
  socket.on('heartbeat', () => {
    if (deviceId && devices.has(deviceId)) {
      devices.get(deviceId).lastSeen = Date.now();
    }
  });

  // Disconnection
  socket.on('disconnect', () => {
    if (deviceId && devices.has(deviceId)) {
      console.log(`[RELAY] Device disconnected: ${deviceInfo.name} (${deviceId})`);
      devices.delete(deviceId);
      stats.activeDevices = devices.size;
      broadcastRegistry();
    }
  });
});

// Helper functions
function generateToken() {
  return 'RELAY-' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function verifyToken(token) {
  const tokenData = pairingTokens.get(token);
  if (!tokenData) return false;
  if (Date.now() > tokenData.expiresAt) {
    pairingTokens.delete(token);
    return false;
  }
  return true;
}

function broadcastRegistry() {
  const registry = Array.from(devices.entries()).map(([id, device]) => ({
    deviceId: id,
    type: device.type,
    name: device.name,
    lastSeen: device.lastSeen
  }));
  
  const message = {
    id: generateToken(),
    type: 'sync',
    source: 'relay',
    target: 'all',
    timestamp: Date.now(),
    sync: {
      type: 'registry',
      data: registry
    }
  };
  
  for (const [id, device] of devices) {
    device.socket.emit('message', message);
  }
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pairingTokens) {
    if (now > data.expiresAt) {
      pairingTokens.delete(token);
    }
  }
}, 60000); // Every minute

// Start server
const PORT = process.env.PORT || 3003;
httpServer.listen(PORT, () => {
  console.log(`[RELAY] Neural Link Relay Server running on port ${PORT}`);
  console.log(`[RELAY] Health check: http://localhost:${PORT}/health`);
});
