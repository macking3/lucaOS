# 🚀 Relay Server Deployment Guide

This server handles the real-time `Socket.IO` connections between your **Luca Desktop** and **Mobile/Guest** clients.

> **⚠️ IMPORTANT:** This server **CANNOT** be deployed on Vercel or Netlify because they are "stateless" (serverless) and kill ephemeral connections. You must use a "stateful" provider that supports Docker/Node.js background processes.

We recommend **Render** or **Railway** (both have free/cheap tiers and are very easy to use).

---

## Option 1: Deploy to Render (Recommended)

Render is the easiest option because we included a `render.yaml` blueprint.

1.  **Push your code to GitHub/GitLab.**
    - Make sure the `relay-server` folder is in your repository.
2.  **Create a Render Account** at [render.com](https://render.com).
3.  **Click "New +"** -> **"Web Service"**.
4.  **Connect your Repo**.
5.  **Settings**:
    - **Root Directory:** `relay-server` (Very Important!)
    - **Runtime:** `Docker`
    - **Region:** Choose one close to you (e.g., Oregon, Frankfurt).
    - **Instance Type:** "Free" is fine for testing, "Starter" ($7/mo) is recommended for 24/7 reliability (prevents sleep).
6.  **Click "Create Web Service"**.

_Render will automatically detect the `Dockerfile` in the `relay-server` folder and build it._

---

## Option 2: Deploy to Railway

Railway is excellent for zero-config deployments.

1.  **Create a Railway Account** at [railway.app](https://railway.app).
2.  **Click "New Project"** -> **"Deploy from GitHub repo"**.
3.  **Select your repository.**
4.  **Configure**:
    - Click on the new service block.
    - Go to **Settings** -> **Root Directory**.
    - Set it to `/relay-server`.
5.  **Variables**:
    - Railway usually detects the port automatically, but if not, create a variable `PORT` = `3003` (or `8080`).
6.  **Domain**:
    - Go to **Settings** -> **Domains** -> **Generate Domain**.
    - You will get something like `relay-server-production-xxxx.up.railway.app`.

---

## 🏁 Post-Deployment: Update Your App

Once your server is running (it usually takes 2-3 minutes), get the **URL** (e.g., `https://luca-relay.onrender.com`).

1.  Open your local project **`.env`** file.
2.  Update the `VITE_RELAY_SERVER_URL` variable:

```bash
# In your .env file
VITE_RELAY_SERVER_URL=https://your-new-render-url.onrender.com
```

3.  **Restart your Luca Desktop App**. The new settings will take effect, and the QR code will now point to this stable, permanent server!
