# Luca Neural Link Relay Server

Cloud relay server that enables global device-to-device communication for Luca.

## Features

- ✅ WebSocket-based message routing
- ✅ Device registration with pairing tokens
- ✅ Automatic device discovery
- ✅ Health monitoring endpoint
- ✅ Message statistics tracking

## Quick Start

### Local Development

```bash
cd relay-server
npm install
npm run dev
```

Server will start on `http://localhost:3003`

### Deploy to Vercel (Free)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Deploy to Railway (Free)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select this repository
4. Railway will auto-detect and deploy

## API Endpoints

### Health Check

```
GET /health
```

Returns server status and statistics.

### Generate Pairing Token

```
POST /api/pairing/generate
```

Generates a 5-minute pairing token for device registration.

## WebSocket Events

### Client → Server

- `register`: Register device with pairing token
- `message`: Send message to target device
- `heartbeat`: Keep connection alive

### Server → Client

- `registered`: Confirmation of successful registration
- `message`: Incoming message from another device
- `error`: Error notification

## Environment Variables

- `PORT`: Server port (default: 3003)
- `ALLOWED_ORIGINS`: CORS allowed origins (optional)

## Security

- Pairing tokens expire after 5 minutes
- Device registration required before messaging
- CORS protection (configure for production)
- Rate limiting (TODO)

## Monitoring

Access `/health` endpoint for:

- Uptime
- Active devices
- Total connections
- Messages relayed
