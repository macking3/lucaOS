import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Guest sessions: sessionId -> { desktopDeviceId, createdAt, expiresAt, guestSocket }
const guestSessions = new Map();

// Stats for monitoring
const stats = {
  totalConnections: 0,
  activeDevices: 0,
  activeGuests: 0,
  messagesRelayed: 0,
  startTime: Date.now()
};

// Express middleware
app.use(cors());
app.use(express.json());

// Serve static files (guest.html)
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Date.now() - stats.startTime,
    activeDevices: stats.activeDevices,
    activeGuests: stats.activeGuests,
    totalConnections: stats.totalConnections,
    messagesRelayed: stats.messagesRelayed
  });
});

// Generate pairing token endpoint (for Luca app pairing)
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

// Generate guest session endpoint (for web guest access)
app.post('/api/guest/generate', (req, res) => {
  const { desktopDeviceId } = req.body;
  
  if (!desktopDeviceId) {
    return res.status(400).json({ error: 'desktopDeviceId required' });
  }
  
  // Verify desktop is connected
  if (!devices.has(desktopDeviceId)) {
    return res.status(404).json({ error: 'Desktop not connected' });
  }
  
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  guestSessions.set(sessionId, {
    desktopDeviceId,
    createdAt: Date.now(),
    expiresAt,
    guestSocket: null
  });
  
  // Clean up expired session
  setTimeout(() => guestSessions.delete(sessionId), 24 * 60 * 60 * 1000);
  
  const guestUrl = `${req.protocol}://${req.get('host')}/guest?session=${sessionId}`;
  
  res.json({ 
    sessionId, 
    expiresAt,
    guestUrl
  });
});

// Guest page route
app.get('/guest', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guest.html'));
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

  // ========== GUEST CONNECTION HANDLING ==========
  
  // Guest joins with session ID
  socket.on('guest-join', (data) => {
    const { sessionId } = data;
    
    const session = guestSessions.get(sessionId);
    if (!session) {
      socket.emit('error', { message: 'Invalid or expired session' });
      socket.disconnect();
      return;
    }
    
    // Link guest socket to session
    session.guestSocket = socket;
    stats.activeGuests++;
    
    console.log(`[RELAY] Guest joined session ${sessionId}`);
    
    // Notify desktop that guest connected
    const desktopDevice = devices.get(session.desktopDeviceId);
    if (desktopDevice) {
      desktopDevice.socket.emit('guest-connected', { sessionId });
    }
    
    socket.emit('joined', { 
      sessionId,
      desktopConnected: !!desktopDevice
    });
  });

  // ========== WEBRTC SIGNALING ==========
  
  // WebRTC offer from Desktop to Guest
  socket.on('webrtc-offer', (data) => {
    const { sessionId, offer } = data;
    const session = guestSessions.get(sessionId);
    
    if (session && session.guestSocket) {
      console.log(`[RELAY] Forwarding WebRTC offer to guest`);
      session.guestSocket.emit('webrtc-offer', { offer });
    }
  });

  // WebRTC answer from Guest to Desktop
  socket.on('webrtc-answer', (data) => {
    const { sessionId, answer } = data;
    const session = guestSessions.get(sessionId);
    
    if (session) {
      const desktopDevice = devices.get(session.desktopDeviceId);
      if (desktopDevice) {
        console.log(`[RELAY] Forwarding WebRTC answer to desktop`);
        desktopDevice.socket.emit('webrtc-answer', { answer, sessionId });
      }
    }
  });

  // ICE candidates exchange
  socket.on('webrtc-ice-candidate', (data) => {
    const { sessionId, candidate, fromDesktop } = data;
    const session = guestSessions.get(sessionId);
    
    if (!session) return;
    
    if (fromDesktop) {
      // Forward to guest
      if (session.guestSocket) {
        session.guestSocket.emit('webrtc-ice-candidate', { candidate });
      }
    } else {
      // Forward to desktop
      const desktopDevice = devices.get(session.desktopDeviceId);
      if (desktopDevice) {
        desktopDevice.socket.emit('webrtc-ice-candidate', { candidate, sessionId });
      }
    }
  });

  // ========== GUEST MESSAGE PROXYING ==========
  
  // Message from guest to desktop
  socket.on('guest-message', (data) => {
    const { sessionId, message } = data;
    const session = guestSessions.get(sessionId);
    
    if (session) {
      const desktopDevice = devices.get(session.desktopDeviceId);
      if (desktopDevice) {
        stats.messagesRelayed++;
        desktopDevice.socket.emit('guest-message', { sessionId, message });
      }
    }
  });

  // Message from desktop to guest
  socket.on('desktop-to-guest', (data) => {
    const { sessionId, message, audio } = data;
    const session = guestSessions.get(sessionId);
    
    if (session && session.guestSocket) {
      stats.messagesRelayed++;
      session.guestSocket.emit('desktop-message', { message, audio });
    }
  });

  // Guest disconnect handling
  socket.on('disconnect', () => {
    // Check if this was a guest socket
    for (const [sessionId, session] of guestSessions) {
      if (session.guestSocket === socket) {
        console.log(`[RELAY] Guest disconnected from session ${sessionId}`);
        session.guestSocket = null;
        stats.activeGuests--;
        
        // Notify desktop
        const desktopDevice = devices.get(session.desktopDeviceId);
        if (desktopDevice) {
          desktopDevice.socket.emit('guest-disconnected', { sessionId });
        }
        break;
      }
    }
  });
});

// Helper functions
function generateToken() {
  return 'RELAY-' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function generateSessionId() {
  return 'GUEST-' + Math.random().toString(36).substring(2, 10).toUpperCase();
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
  
  for (const device of devices.values()) {
    device.socket.emit('message', message);
  }
}

// Cleanup expired tokens and sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pairingTokens) {
    if (now > data.expiresAt) {
      pairingTokens.delete(token);
    }
  }
  for (const [sessionId, session] of guestSessions) {
    if (now > session.expiresAt) {
      guestSessions.delete(sessionId);
    }
  }
}, 60000); // Every minute

// Start server
const PORT = process.env.PORT || 3003;
httpServer.listen(PORT, () => {
  console.log(`[RELAY] Neural Link Relay Server running on port ${PORT}`);
  console.log(`[RELAY] Health check: http://localhost:${PORT}/health`);
  console.log(`[RELAY] Guest access: http://localhost:${PORT}/guest`);
});
