# Deploy Luca Neural Link Relay to Vercel

## Quick Deployment Guide

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate with Vercel (free account).

### Step 3: Deploy

```bash
cd /Users/macking/Downloads/kaleido/luca/relay-server
vercel
```

Follow the prompts:

- **Set up and deploy?** → Yes
- **Which scope?** → Your personal account
- **Link to existing project?** → No
- **Project name?** → luca-neural-link-relay (or your choice)
- **Directory?** → ./ (current directory)
- **Override settings?** → No

### Step 4: Production Deployment

```bash
vercel --prod
```

This deploys to production and gives you a permanent URL like:
`https://luca-neural-link-relay.vercel.app`

### Step 5: Update Luca Settings

Copy the production URL and update in Luca settings:

1. Open Luca → Settings → Neural Link
2. Paste URL in "Cloud Relay Server" field
3. Save settings

## Alternative: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import from Git or upload `relay-server/` folder
4. Vercel auto-detects Node.js
5. Click "Deploy"

## Testing

After deployment, test the relay server:

```bash
curl https://your-relay-url.vercel.app/health
```

Should return:

```json
{
  "status": "healthy",
  "uptime": 12345,
  "activeDevices": 0,
  "totalConnections": 0,
  "messagesRelayed": 0
}
```

## Troubleshooting

**Issue**: Vercel CLI not found
**Solution**: Make sure npm global bin is in PATH:

```bash
npm config get prefix
# Add to PATH if needed
```

**Issue**: Socket.IO not working on Vercel
**Solution**: Vercel supports WebSocket, but may need serverless function wrapper. The current setup should work with polling fallback.

## Cost

- **Free Tier**: 100GB bandwidth/month, unlimited requests
- **Hobby**: Free forever for personal projects
- **Pro**: $20/month if you need more bandwidth

For most users, the free tier is more than enough! 🎉
