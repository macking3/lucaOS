# Cortex Backend Deployment Guide

## Hybrid Deployment Architecture

This Cortex backend supports a **hybrid deployment model**:

- **Cloud (Railway):** Lightweight API proxy for mobile connectivity
- **Local (Your Machine):** Full-featured with RAG, vision, and ML capabilities

---

## Cloud Deployment (Railway)

**What's Deployed:**

- ✅ Gemini API proxy
- ✅ Memory and chat features
- ✅ Basic endpoints
- ❌ RAG features (disabled)
- ❌ Vision analysis (disabled)
- ❌ Local ML inference (disabled)

**URL:** `https://lucaos-production.up.railway.app`

**Dependencies:** Uses `requirements.txt` (lightweight, ~200MB)

**Use Case:** Mobile app connectivity, basic chat/memory when away from home

---

## Local Deployment (Full Features)

**What's Available:**

- ✅ Gemini API proxy
- ✅ Memory and chat features
- ✅ **Full RAG features** (knowledge graph, document ingestion)
- ✅ **Vision analysis (UI-TARS)** (screenshot analysis, UI control)
- ✅ **Local ML inference** (torch-based models)

**URL:** `http://localhost:8000`

**Dependencies:** Uses `requirements.local.txt` (full, ~3GB)

**Use Case:** Desktop app, full AI agent capabilities, local development

---

## Setup Instructions

### For Local Development (Full Features):

1. **Install full dependencies:**

   ```bash
   cd cortex/python
   pip install -r requirements.local.txt
   ```

2. **Set environment variables:**

   ```bash
   # Create .env file in cortex/python/
   echo "GEMINI_API_KEY=your_key_here" > .env
   ```

3. **Run the server:**

   ```bash
   uvicorn cortex:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Test:**
   ```bash
   curl http://localhost:8000/health
   ```

### For Railway Deployment (Lightweight):

Railway automatically uses `requirements.txt` (already configured).

**No action needed** - deployment is automatic via GitHub.

---

## Mobile App Configuration

Your mobile app can switch between cloud and local:

**In your `.env` file:**

```bash
# For cloud connectivity (when away from home)
VITE_CORTEX_URL=https://lucaos-production.up.railway.app

# For local connectivity (when on same network)
# VITE_CORTEX_URL=http://192.168.1.XXX:8000
```

**Dynamic Switching:**
The mobile app can detect network and automatically switch:

- On home WiFi → Use local Cortex (full features)
- On mobile data → Use cloud Cortex (basic features)

---

## Feature Comparison

| Feature                   | Cloud (Railway) | Local (Full) |
| ------------------------- | --------------- | ------------ |
| Gemini API Proxy          | ✅              | ✅           |
| Memory/Chat               | ✅              | ✅           |
| RAG (Knowledge Graph)     | ❌              | ✅           |
| Document Ingestion        | ❌              | ✅           |
| Vision Analysis (UI-TARS) | ❌              | ✅           |
| Local ML Inference        | ❌              | ✅           |
| Deployment Time           | 1-2 min         | N/A          |
| Cost                      | $5/month        | Free         |
| Memory Usage              | ~500MB          | ~3GB         |

---

## Troubleshooting

### Cloud (Railway) Issues:

**502 Error:**

- Check Railway logs for errors
- Ensure `GEMINI_API_KEY` environment variable is set
- Verify root directory is set to `/cortex/python`

**Features Not Working:**

- RAG/Vision features are intentionally disabled on cloud
- Use local deployment for full features

### Local Issues:

**Import Errors:**

- Ensure you installed `requirements.local.txt`, not `requirements.txt`
- Run: `pip install -r requirements.local.txt`

**Port Already in Use:**

- Change port: `uvicorn cortex:app --port 8001`
- Or kill existing process: `lsof -ti:8000 | xargs kill`

---

## Best Practices

1. **Use cloud for mobile connectivity** - Always available, low latency
2. **Use local for heavy workloads** - RAG indexing, vision analysis, ML inference
3. **Keep both in sync** - Same codebase, different dependencies
4. **Monitor costs** - Railway Hobby plan ($5/month) is sufficient for cloud

---

**Your hybrid deployment is now complete! 🎉**
