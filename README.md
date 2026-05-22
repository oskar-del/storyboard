# ⬡ Storyboard

> Your AI work, finally visible.

Storyboard is a visual memory layer for AI work. Every session, decision, and idea you build with AI gets captured, connected, and stored — then injected back into any new chat as full context.

**No more re-explaining. No more lost decisions. No more amnesia.**

→ **[Live demo](https://oskar-del.github.io/storyboard)**

![Storyboard Dashboard](https://oskar-del.github.io/storyboard/thumbnails/dashboard-preview.png)

---

## The problem it solves

Every AI conversation starts with amnesia. You re-explain your project. You re-make decisions you already made. You lose the thread of weeks of work. Storyboard fixes this with three things:

1. **Capture** — every session block, decision, and idea is logged (automatically or with one click)
2. **Canvas** — all your projects on one visual board, filterable by time, type, and project  
3. **Seed** — one click copies your full project context to clipboard — paste into any AI chat to start with total memory

---

## Features

- 🗂️ **Canvas view** — project cards with live block/decision/idea counts
- 📋 **Feed view** — chronological stream across all projects
- 🔍 **Search** (`⌘K`) — instant fuzzy search across all blocks
- ➕ **FAB speed-dial** — capture ideas, log decisions, add blocks in one click
- 💉 **Seed New Chat** — data-driven context digest copied to clipboard
- 🎯 **North Star** — per-project goal shown on every card and header
- 📊 **Skills health** — scores your AI workflows, flags weak spots
- ⏱️ **Session timer** — live counter in the right panel
- 🌙 **AI mode** — dark theme optimised for AI work sessions

---

## Quick start

```bash
# 1. Clone the repo
git clone https://github.com/oskar-del/storyboard.git
cd storyboard

# 2. Install dependencies (for MCP server)
npm install

# 3. Start the MCP server (enables live block updates + screenshot capture)
node mcp-server.js

# 4. Open the dashboard
open http://localhost:3848   # served by mcp-server.js, or open app.html directly
```

## Connect your AI tools

Storyboard works with every AI tool — via MCP for tools that support it, via browser extension for everything else.

### Claude Desktop — auto-capture (MCP)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "storyboard": {
      "command": "node",
      "args": ["/absolute/path/to/storyboard/mcp-server.js"]
    }
  }
}
```

Restart Claude Desktop. Every session block, decision and idea gets captured automatically.

---

### Cursor — auto-capture (MCP)

Add to your Cursor MCP config (`~/.cursor/mcp.json` or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "storyboard": {
      "command": "node",
      "args": ["/absolute/path/to/storyboard/mcp-server.js"]
    }
  }
}
```

Same server, same blocks-data.json, same dashboard. Cursor sessions appear alongside Claude sessions automatically.

---

### Windsurf — auto-capture (MCP)

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "storyboard": {
      "command": "node",
      "args": ["/absolute/path/to/storyboard/mcp-server.js"]
    }
  }
}
```

---

### Microsoft Copilot — auto-capture (MCP)

Microsoft adopted MCP in early 2026. Add to Copilot's MCP config:

**Mac:** `~/Library/Application Support/Microsoft Copilot/mcp_config.json`  
**Windows:** `%APPDATA%\Microsoft\Copilot\mcp_config.json`

```json
{
  "mcpServers": {
    "storyboard": {
      "command": "node",
      "args": ["/absolute/path/to/storyboard/mcp-server.js"]
    }
  }
}
```

Restart Copilot. Sessions land in the same canvas as Claude, Cursor, and Windsurf — one unified view.

---

### ChatGPT, Gemini, Perplexity — browser extension

For tools that don't support MCP, use the browser extension:

1. Open `chrome://extensions` → enable Developer mode
2. Click **Load unpacked** → select the `browser-extension/` folder
3. Click the ⬡ icon on any AI tab → pick a project → **Capture**

See [`browser-extension/INSTALL.md`](browser-extension/INSTALL.md) for full instructions.

---

### How it all connects

```
Claude Desktop  ──┐
Cursor          ──┤
Windsurf        ──┤  MCP (auto)    ┐
Copilot         ──┘                ├── blocks-data.json ── dashboard ── Seed New Chat
                                   │
ChatGPT         ──┐                │
Gemini          ──┤  Extension     ┘
Perplexity      ──┘  (one click)
```

One canvas. Every AI tool. No re-explaining.

---

## Built with

- Single-file HTML/CSS/JS dashboard (no build tools, no npm for the UI)
- Node.js MCP server (stdio + HTTP on ports 3847/3848)
- localStorage for ideas/decisions persistence
- GitHub Pages for hosting

---

## Sprint

This is a 10-day MVP sprint. Day 1: Apr 17, 2026.

**Shipped — Day 1:**
- [x] Dashboard v5 — canvas, feed, skills, decisions, ideas, Context Hub views
- [x] Search overlay (⌘K)
- [x] FAB speed-dial (idea / decision / block)
- [x] North Star per-project display
- [x] Skills health scoring + category intents + suggest-by-task
- [x] Dynamic Seed New Chat + Context Hub (per-project, staleness tracking)
- [x] Landing page (context window hero, before/after, moat section)
- [x] GitHub Pages hosting
- [x] First-visit onboarding (3 paths: import / fresh start / explore)
- [x] Browser extension v0.1 (Claude, ChatGPT, Gemini, Cursor, Perplexity)
- [x] MCP: Claude Desktop + Cursor + Windsurf + Copilot config
- [x] Retroactive git importer (import_project.py)

**Coming — Days 2–10:**
- [ ] Browser extension: smarter DOM adapters per AI tool
- [ ] Timeline view (year/week/day zoom)
- [ ] Block detail overlay with edit
- [ ] Team storyboards (shared canvas)
- [ ] AI velocity metrics per project

---

Built with [Claude](https://claude.ai) in [Cowork mode](https://claude.ai).
