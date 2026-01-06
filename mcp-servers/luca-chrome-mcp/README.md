# Luca Chrome MCP Server

AI-powered Chrome browser control via Model Context Protocol (MCP).

## Features

- **AI-Optimized DOM** - Accessibility tree snapshots for LLM-friendly page understanding
- **Real Chrome Control** - Uses your Chrome profile with logged-in sessions
- **Semantic Search** - Vector search across open tabs
- **Stealth Mode** - Avoids bot detection
- **20+ Tools** - Navigation, interactions, screenshots, bookmarks, history

## Installation

```bash
npm install -g luca-chrome-mcp
```

Or use directly with npx:

```bash
npx luca-chrome-mcp
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chrome": {
      "command": "npx",
      "args": ["luca-chrome-mcp"]
    }
  }
}
```

## Usage with Cursor/Windsurf

Add to your MCP settings:

```json
{
  "chrome": {
    "command": "npx",
    "args": ["luca-chrome-mcp"]
  }
}
```

## Available Tools

### Navigation

- `navigate` - Go to URL
- `get_tabs` - List all open tabs
- `switch_tab` - Switch to a tab
- `close_tab` - Close tab(s)
- `go_back` / `go_forward` - Browser navigation

### AI-Optimized Content

- `snapshot` - Get accessibility tree (AI-friendly DOM)
- `get_elements` - Get interactive elements with refs

### Interactions

- `click` - Click element
- `type` - Type into input
- `select` - Select dropdown option
- `keyboard` - Send keyboard shortcuts

### Content

- `screenshot` - Capture full page or element
- `get_html` - Get raw HTML
- `execute_js` - Run JavaScript

### Chrome Data

- `get_history` - Search browsing history
- `get_bookmarks` - Get bookmarks

## Configuration

### Using Your Chrome Profile

By default, launches with a clean browser. To use your Chrome profile:

```bash
luca-chrome-mcp --profile=/path/to/chrome/profile
```

Or set environment variable:

```bash
CHROME_PROFILE_PATH=/path/to/profile luca-chrome-mcp
```

### Connecting to Running Chrome

Launch Chrome with remote debugging:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

Then connect:

```bash
luca-chrome-mcp --connect=ws://localhost:9222
```

## License

MIT
