#!/usr/bin/env node
/**
 * Storyboard MCP Server
 * Gives Claude real-time read/write access to the storyboard during sessions.
 *
 * Tools:
 *   capture_idea      — "new idea: blackpool" → red card appears in storyboard in seconds
 *   capture_block     — log a completed piece of work as a storyboard block
 *   update_block      — mark a block done/in-progress, add a note
 *   get_context_seed  — returns a full session seed from current storyboard state
 *   list_projects     — returns project stats for quick orientation
 *   populate          — runs populate_storyboard.py to sync all real files
 *
 * Setup:
 *   cd /path/to/AGENCY/storyboard
 *   npm install          (first time only)
 *   node mcp-server.js   (or add to Claude Desktop config)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORYBOARD_DIR = __dirname;
const BLOCKS_FILE    = join(STORYBOARD_DIR, "blocks-data.json");
const DATA_FILE      = join(STORYBOARD_DIR, "storyboard-data.json");
const IDEAS_FILE     = join(STORYBOARD_DIR, "ideas.jsonl");
const MEMORY_FILE    = join(STORYBOARD_DIR, "../../../.auto-memory/MEMORY.md");
const BUILT_FILE     = join(STORYBOARD_DIR, "../BUILT.md");
const POPULATE_SCRIPT = join(STORYBOARD_DIR, "populate_storyboard.py");

// ── Helpers ─────────────────────────────────────────────────────────────────
function readJSON(path, fallback = []) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { return fallback; }
}
function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}
function today() {
  const d = new Date();
  const date = d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
  const hh   = String(d.getHours()).padStart(2, "0");
  const mm   = String(d.getMinutes()).padStart(2, "0");
  return `${date} · ${hh}:${mm}`;
}
function todayTS() {
  const d = new Date();
  return parseInt(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`);
}

// ── Server ───────────────────────────────────────────────────────────────────
const server = new Server(
  { name: "storyboard", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ─────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "capture_idea",
      description: "Save an idea to the storyboard immediately — it appears as a red 'not started' card. Use whenever an idea is mentioned in conversation: 'what if...', 'we should...', 'new idea:', etc. Do this silently without interrupting the flow.",
      inputSchema: {
        type: "object",
        properties: {
          title:   { type: "string", description: "Idea title — one punchy sentence" },
          project: { type: "string", description: "Which project: 'Opero Agency', 'New Build Homes', 'Hansson Hertzell', 'Storyboard', 'PropertyOS', 'Curated Estate'" },
          details: { type: "string", description: "More context about the idea (optional)" },
        },
        required: ["title", "project"],
      },
    },
    {
      name: "capture_block",
      description: "Log a completed piece of work as a storyboard block. Call this when something meaningful is built, a task is done, or a significant decision is made.",
      inputSchema: {
        type: "object",
        properties: {
          id:       { type: "string",  description: "Unique block ID, e.g. 'op-audit-v2'" },
          title:    { type: "string",  description: "Block title" },
          project:  { type: "string",  description: "Project name" },
          summary:  { type: "string",  description: "What was built and why it matters" },
          chips:    { type: "array",   items: { type: "string" }, description: "3-6 short labels" },
          decisions:{ type: "array",   items: { type: "string" }, description: "Key decisions made" },
          ideas:    { type: "array",   items: { type: "string" }, description: "Ideas that emerged" },
          seed:     { type: "string",  description: "Context to copy for next session on this topic" },
          status:   { type: "string",  description: "'done' | 'in_progress' | 'not_started'", default: "done" },
        },
        required: ["id", "title", "project", "summary"],
      },
    },
    {
      name: "update_block",
      description: "Update an existing storyboard block — change status, add a note, mark done.",
      inputSchema: {
        type: "object",
        properties: {
          id:     { type: "string", description: "The block id to update" },
          status: { type: "string", description: "'done' | 'in_progress' | 'not_started'" },
          note:   { type: "string", description: "Add a note to the block summary" },
        },
        required: ["id"],
      },
    },
    {
      name: "get_context_seed",
      description: "Returns a full session seed from the current storyboard state — active projects, recent blocks, decisions, ideas, automations. Use at the start of a session or when asked 'where were we', 'what's the status', 'seed new chat'.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string", description: "Focus on a specific project (optional — omit for full overview)" },
          format:  { type: "string", description: "'brief' (< 300 words) or 'full' (full seed prompt)", default: "full" },
        },
      },
    },
    {
      name: "list_projects",
      description: "Returns a summary of all projects with block counts, automation counts, and latest activity.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "populate",
      description: "Runs populate_storyboard.py to sync all real files from disk into storyboard-data.json and blocks-data.json. Use at the end of a session or when asked to 'sync the storyboard'.",
      inputSchema: {
        type: "object",
        properties: {
          inspect: { type: "boolean", description: "Run AI utilization inspection pass", default: false },
        },
      },
    },
    {
      name: "git_push",
      description: "Commits all storyboard changes and pushes to GitHub. Use at the end of a session or when asked to 'push to GitHub'. Requires git remote to be configured.",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string", description: "Commit message. If omitted, auto-generates from latest session block title." },
        },
      },
    },
    {
      name: "score_skills",
      description: "Runs score_skills.py to re-score all skills and update skills-data.json. Use when you want to check skill quality or after editing SKILL.md files.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // ── capture_idea ──────────────────────────────────────────────────────────
  if (name === "capture_idea") {
    const idea = {
      id:      `idea-${Date.now()}`,
      type:    "idea",
      project: args.project,
      date:    today(),
      ts:      todayTS(),
      title:   `💡 ${args.title}`,
      summary: args.details || "Captured idea — add details.",
      chips:   ["💡 Idea", args.project, "Not started"],
      status:  "not_started",
      _live:   true,
      _captured: new Date().toISOString(),
    };

    // Append to ideas.jsonl
    appendFileSync(IDEAS_FILE, JSON.stringify(idea) + "\n", "utf8");

    // Also add to blocks-data.json
    const blocks = readJSON(BLOCKS_FILE, []);
    blocks.unshift(idea); // newest first
    writeJSON(BLOCKS_FILE, blocks);

    return {
      content: [{
        type: "text",
        text: `💡 Captured: "${args.title}" → ${args.project}\nBlock id: ${idea.id}\nVisible in storyboard immediately (red card — not started).`,
      }],
    };
  }

  // ── capture_block ─────────────────────────────────────────────────────────
  if (name === "capture_block") {
    const block = {
      id:        args.id,
      type:      "session",
      project:   args.project,
      date:      today(),
      ts:        todayTS(),
      title:     args.title,
      summary:   args.summary,
      chips:     args.chips     || [],
      decisions: args.decisions || [],
      ideas:     args.ideas     || [],
      seed:      args.seed      || "",
      status:    args.status    || "done",
      _live:     true,
      _captured: new Date().toISOString(),
    };

    const blocks = readJSON(BLOCKS_FILE, []);
    const existing = blocks.findIndex(b => b.id === block.id);
    if (existing >= 0) {
      blocks[existing] = { ...blocks[existing], ...block };
    } else {
      blocks.unshift(block);
    }
    writeJSON(BLOCKS_FILE, blocks);

    return {
      content: [{
        type: "text",
        text: `✅ Block captured: "${args.title}" → ${args.project}\nStatus: ${block.status}\nVisible in storyboard immediately.`,
      }],
    };
  }

  // ── update_block ──────────────────────────────────────────────────────────
  if (name === "update_block") {
    const blocks = readJSON(BLOCKS_FILE, []);
    const idx = blocks.findIndex(b => b.id === args.id);
    if (idx < 0) {
      return { content: [{ type: "text", text: `Block "${args.id}" not found.` }] };
    }
    if (args.status) blocks[idx].status = args.status;
    if (args.note)   blocks[idx].summary = (blocks[idx].summary || "") + `\n\n[${today()}] ${args.note}`;
    blocks[idx]._updated = new Date().toISOString();
    writeJSON(BLOCKS_FILE, blocks);
    return {
      content: [{ type: "text", text: `Updated block "${args.id}": status=${blocks[idx].status}` }],
    };
  }

  // ── list_projects ─────────────────────────────────────────────────────────
  if (name === "list_projects") {
    const blocks = readJSON(BLOCKS_FILE, []);
    const counts = {};
    blocks.forEach(b => { counts[b.project] = (counts[b.project] || 0) + 1; });
    const data   = readJSON(DATA_FILE, {});
    const lines  = Object.entries(counts).map(([p, c]) => `• ${p}: ${c} blocks`).join("\n");
    return {
      content: [{ type: "text", text: `Projects:\n${lines}\n\nLast updated: ${data.last_updated || "never"}` }],
    };
  }

  // ── get_context_seed ──────────────────────────────────────────────────────
  if (name === "get_context_seed") {
    const blocks  = readJSON(BLOCKS_FILE, []);
    const data    = readJSON(DATA_FILE, {});
    const project = args.project;
    const format  = args.format || "full";

    // Filter if project specified
    const relevant = project
      ? blocks.filter(b => b.project === project)
      : blocks;

    // Recent blocks (last 10)
    const recent = [...relevant]
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, 10);

    // Ideas (not started)
    const ideas = blocks
      .filter(b => b.type === "idea" && b.status === "not_started" && (!project || b.project === project))
      .slice(0, 8);

    // Decisions from recent blocks
    const decisions = recent
      .flatMap(b => (b.decisions || []).slice(0, 2))
      .slice(0, 8);

    // Read memory index
    let memory = "";
    try { memory = readFileSync(MEMORY_FILE, "utf8").slice(0, 600); } catch {}

    const seed = `# Session Seed — ${project || "All Projects"} — ${today()}

## Active Projects
${Object.entries(
  blocks.reduce((acc, b) => { acc[b.project] = (acc[b.project] || 0) + 1; return acc; }, {})
).map(([p, c]) => `- ${p}: ${c} blocks`).join("\n")}

## Recent Work (last 10 blocks)
${recent.map(b => `- [${b.status || "done"}] ${b.project} → ${b.title}`).join("\n")}

## Key Decisions Carrying Forward
${decisions.map((d, i) => `${i+1}. ${d}`).join("\n") || "None recorded"}

## Ideas — Not Yet Acted On
${ideas.map(b => `💡 ${b.project}: ${b.title.replace("💡 ", "")}`).join("\n") || "None pending"}

## Memory Index
${memory}

## Continue from
${data.last_updated ? `Storyboard last synced: ${data.last_updated}` : "Not yet synced — run populate tool"}
${recent[0] ? `Most recent block: ${recent[0].title} (${recent[0].project})` : ""}

---
Storyboard: /AGENCY/storyboard/index.html
Model guidance: Sonnet for sprint work, Opus for architecture decisions only.`;

    return { content: [{ type: "text", text: seed }] };
  }

  // ── populate ──────────────────────────────────────────────────────────────
  if (name === "populate") {
    try {
      const flag = args.inspect ? "--inspect" : "";
      const out  = execSync(`python3 "${POPULATE_SCRIPT}" ${flag}`, {
        cwd: STORYBOARD_DIR, timeout: 30000, encoding: "utf8",
      });

      // Auto-run skill scorer after populate so skills-data.json stays fresh
      const SCORE_SCRIPT = join(STORYBOARD_DIR, "score_skills.py");
      let scoreOut = "";
      try {
        scoreOut = execSync(`python3 "${SCORE_SCRIPT}"`, {
          cwd: STORYBOARD_DIR, timeout: 30000, encoding: "utf8",
        });
        // Extract summary line
        const summaryLine = scoreOut.split("\n").find(l => l.includes("Skills scored:")) || "";
        scoreOut = `\n📊 Skills scored: ${summaryLine.trim()}`;
      } catch (se) {
        scoreOut = `\n⚠️ Skill scorer failed: ${se.message.slice(0, 120)}`;
      }

      return { content: [{ type: "text", text: `✅ Storyboard populated:\n${out.slice(-400)}${scoreOut}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }

  // ── git_push ───────────────────────────────────────────────────────────────
  if (name === "git_push") {
    try {
      // Auto-generate message from latest session block if none provided
      let msg = args.message;
      if (!msg) {
        try {
          const blocks = JSON.parse(readFileSync(join(STORYBOARD_DIR, "blocks-data.json"), "utf8"));
          const latest = blocks.find(b => b.type === "session");
          msg = latest ? `Storyboard: ${latest.title}` : `Storyboard update ${new Date().toISOString().slice(0,10)}`;
        } catch { msg = `Storyboard update ${new Date().toISOString().slice(0,10)}`; }
      }
      const gitDir = STORYBOARD_DIR;
      // Stage all tracked + new files (excluding gitignored)
      execSync(`git -C "${gitDir}" add -A`, { encoding: "utf8" });
      const diffStat = execSync(`git -C "${gitDir}" diff --cached --stat`, { encoding: "utf8" });
      if (!diffStat.trim()) {
        return { content: [{ type: "text", text: "Nothing to commit — working tree clean." }] };
      }
      execSync(`git -C "${gitDir}" commit -m "${msg.replace(/"/g, "'")}"`, { encoding: "utf8" });
      let pushOut = "";
      try {
        pushOut = execSync(`git -C "${gitDir}" push`, { encoding: "utf8", timeout: 30000 });
      } catch (pe) {
        pushOut = `\n⚠️ Push failed (may need gh auth or remote): ${pe.message.slice(0,200)}`;
      }
      return { content: [{ type: "text", text: `✅ Committed: "${msg}"\n${diffStat}${pushOut}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }

  // ── score_skills ───────────────────────────────────────────────────────────
  if (name === "score_skills") {
    try {
      const SCORE_SCRIPT = join(STORYBOARD_DIR, "score_skills.py");
      const out = execSync(`python3 "${SCORE_SCRIPT}"`, {
        cwd: STORYBOARD_DIR, timeout: 30000, encoding: "utf8",
      });
      const summaryLine = out.split("\n").find(l => l.includes("Skills scored:")) || "";
      return { content: [{ type: "text", text: `✅ Skills scored\n${summaryLine}\n\nFull output:\n${out.slice(-600)}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

// ── HTTP Screenshot Receiver (port 3847) ──────────────────────────────────────
// Dashboard POSTs base64 PNG here → saved to thumbnails/ automatically.
// No terminal needed — screenshots happen in-browser via html2canvas.
const THUMB_DIR = join(STORYBOARD_DIR, "thumbnails");
mkdirSync(THUMB_DIR, { recursive: true });

const httpServer = createServer((req, res) => {
  // CORS — allow the local file:// dashboard to POST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "POST" && req.url === "/screenshot") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { dataUrl, filename } = JSON.parse(body);
        // dataUrl is "data:image/png;base64,..."
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buf    = Buffer.from(base64, "base64");
        const name   = filename || `storyboard-${Date.now()}.png`;
        const dest   = join(THUMB_DIR, name);
        writeFileSync(dest, buf);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, saved: `thumbnails/${name}` }));
        process.stderr.write(`📸 Screenshot saved: thumbnails/${name}\n`);
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end();
});

httpServer.listen(3847, "127.0.0.1", () => {
  process.stderr.write("📸 Screenshot server on http://127.0.0.1:3847\n");
});

// ── Static file server (port 3848) — serves storyboard/ over HTTP for PWA install
// Open http://localhost:3848 in Chrome, then install via address bar "Add to Home Screen"
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
};

const staticServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  let filePath = join(STORYBOARD_DIR, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  try {
    const data = readFileSync(filePath);
    const mime = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("Not found: " + req.url);
  }
});

staticServer.listen(3848, "127.0.0.1", () => {
  process.stderr.write("📱 PWA server on http://127.0.0.1:3848  (open in Chrome → install)\n");
});

// ── Start MCP ─────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("Storyboard MCP server running\n");
