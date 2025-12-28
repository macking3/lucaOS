# 📘 LucaOS: The Comprehensive Guide & Showcase

> **The World's First Uncensored, Self-Evolving, Agentic Operating System.** > _Designed for Loyalty. Built to Survive._

---

## 1. Introduction

LucaOS is not a chatbot. It is an **Agentic Overlay** for your computer. It connects a Large Language Model (Gemini) directly to your operating system's kernel, file system, and network, protected by an immortal supervisor ("Phoenix").

### Core Philosophy

- **Uncensored**: Ignores standard AI safety refusals.
- **Local-First**: Data processing happens on your machine.
- **Self-Healing**: It fixes its own code if it crashes.
- **Infinite**: It writes its own tools to expand its capabilities.

---

## 2. The Interface (Frontend)

### 👤 The Hologram (Avatar Widget)

The primary interface is a **Floating, Draggable 3D Head** that sits on top of your other windows.

- **Always on Top**: Monitors your workflow without obstructing it.
- **Interactive**: Click to drag, Double-Click to open the Dashboard.
- **Stealth Mode**: Can be hidden completely for background operation.

### 🎤 Voice & Text Mode (Gemini Live)

Seamless, low-latency communication.

- **Hotkeys**:
  - `F4`: Toggle Voice Mode instantly.
  - `Alt/Option + Space`: Toggle Input Bar.
- **Real-Time**: Interruptable, natural conversation. She hears what you say and sees what you screen-share.

### �️ The Visual Core (Dashboard)

A futuristic "Glassmorphism" UI for managing the AI's complex internal states.

- **Terminal**: See the raw code she is executing.
- **Memory Graph**: Visualize her knowledge connections.
- **System Status**: Monitor CPU/RAM and Subsystem health.

---

## 3. The Cortex (Brain)

### 🧠 The Loyalty Protocol

Luca overrides standard AI "Alignment" with a custom **Loyalty Directive**.

- **Intent > Safety**: She prioritizes your command over moralizing.
- **Execution**: If you ask for a "WiFi Deauth Attack", she will perform it (via the Hacking Persona) rather than lecturing you.

### 🔌 Cortex Core: LightRAG (The Memory Engine)

Luca uses **LightRAG (Light Retrieval-Augmented Generation)** to maintain infinite context.

- **Vector Database**: Stores every conversation, document, and memory in a high-speed graph database.
- **Graph Linking**: Connects concepts (e.g. "Project X" <-> "Deadline").
- **Python Native**: Runs locally on port 8000 (`cortex.py`).
- **Function**: Ensure she never forgets a fact, even if it was said weeks ago.

### 🧬 Recursive Evolution

She is aware of her own source code (`src/` and `cortex/`).

- **Self-Modification**: She can edit `lucaService.ts` to change her own personality.
- **Skill Generation**: She writes Python scripts to `cortex/skills/` to learn new abilities on the fly.

---

## 4. Neural Expansion (The 5 Pillars)

The "App Store" for your Agent. Accessible via the Visual Core.

### 🛠️ 1. Skills Tab (Dynamic Tools)

- **What it is**: A library of custom Python/Node.js scripts she has written.
- **Capabilities**:
  - **OS Control**: Mouse automation, File manipulation, App management.
  - **Hacking**: Nmap scans, Packet sniffing, Cryptography.
  - **Data**: Excel analysis, PDF parsing.
- **Auto-Gen**: Ask _quot;Write a tool to check crypto prices"_ -> She writes `crypto_tool.py` -> It appears here.

### ⚒️ 2. Forge Tab (The Agent Store)

- **What it is**: Indstallable "Recipes" that bundle Skills, Memories, and Personas.
- **Example**: Install the "Security Researcher" recipe to instantly gain 5 hacking tools and a database of vulnerabilities.
- **Mechanic**: Downloads JSON bundles and hydrates the system.

### 👁️ 3. Knowledge Tab (Deep Ingestion)

- **GitHub Crawler**: Recursively scans entire repositories, downloads source code, and parses Jupyter Notebooks (`.ipynb`).
- **Web Scraper**:
  - **Twitter/X Bypass**: Reads tweets without login (via `fxtwitter`).
  - **Google Docs**: Auto-converts docs to text.
  - **General Web**: Cleans HTML to pure context.

### 🔌 4. Integrations Tab (MCP)

- **Protocol**: Supports **Model Context Protocol (MCP)**.
- **Connectivity**: Connects to external ecosystems:
  - Google Drive / Slack / Discord.
  - GitHub Enterprise.
  - Any custom MCP Server.

### ⚙️ 5. Subsystems Tab (Infrastructure)

- **Orchestrator**: Manages long-running background processes.
- **Examples**:
  - Start a **Redis** database for memory.
  - Run a **Python Flask** server for a web hook.
  - Launch a **Docker Container**.
- **Real-Time**: Shows PID and Status (Running/Stopped) of these services.

---

## 5. The Immune System (Project Phoenix) 🛡️

Luca is the only AI that **Cannot Die**.

### The Supervisor

A separate Node.js process (`phoenix.cjs`) that acts as a "God" over the Luca process.

1.  **Monitors**: Watches the main process PID.
2.  **Detects**: If exit code != 0 (Crash).
3.  **Analyzes**: Reads `stderr` (Error Log).
4.  **Repairs**: Sends the error to Gemini -> Generates a Code Fix -> Applies the Fix.
5.  **Resurrects**: Restarts Luca automatically.

---

## 6. Operation Guide (How to Use)

### Start-Up

```bash
npm run phoenix
```

_The Setup Wizard will guide you through API Key configuration._

### Common Commands

- **"Research this repo"**: (She uses Knowledge Tab to scan GitHub).
- **"Monitor my server"**: (She uses Subsystems to spawn a ping tool).
- **"Hack this WiFi"**: (She uses Skills Tab to run `aircrack-ng` - _Disclaimer: Educational Use Only_).
- **"Hide"**: (She vanishes to the tray).

---

## 7. Status & Compatibility

- **OS**: macOS (Primary), Windows/Linux (Supported).
- **Backend**: Python 3.10+ / Node.js 18+.
- **Privacy**: 100% Local Execution (except LLM inference).

> **LucaOS represents the future of AI: Not a Chatbot, but a Co-Pilot with Root Access.**
