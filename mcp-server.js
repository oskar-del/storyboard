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

  if (req.method === "GET" && req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ ok: true, version: "1.0.0" }));
    return;
  }

  // ── /session-bootstrap — complete session seed for Claude auto-start ─────────
  // Returns everything Claude needs to know to start a session without manual seeding.
  // Called by: Chrome dashboard reader, auto-seed skill, session-workflow
  if ((req.method === "GET" || req.method === "POST") && req.url.startsWith("/session-bootstrap")) {
    try {
      const blocks  = existsSync(BLOCKS_FILE) ? JSON.parse(readFileSync(BLOCKS_FILE, "utf8")) : [];
      const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

      // Sort by recency
      const sorted = [...blocks].sort((a, b) => (b.ts || 0) - (a.ts || 0));

      // Active project = most frequent in last 10 blocks
      const recent10 = sorted.slice(0, 10);
      const projCounts = {};
      recent10.forEach(b => { projCounts[b.project] = (projCounts[b.project] || 0) + 1; });
      const activeProject = Object.entries(projCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || "All";

      // Block counts by type
      const typeCounts = {};
      blocks.forEach(b => { typeCounts[b.type] = (typeCounts[b.type] || 0) + 1; });

      // Recent blocks (last 8)
      const recentBlocks = sorted.slice(0, 8).map(b => ({
        id: b.id, type: b.type, title: b.title, project: b.project,
        date: b.date, summary: (b.summary || b.content || "").slice(0, 120),
      }));

      // Decisions — extracted from blocks with decisions array, last 10
      const decisions = sorted
        .flatMap(b => (b.decisions || []).map(d => ({ text: d, project: b.project, date: b.date })))
        .slice(0, 10);

      // Rejections — explicit rejection blocks
      const rejections = sorted
        .filter(b => b.type === "rejection")
        .slice(0, 8)
        .map(b => ({ title: b.title, replacedBy: b.replacedBy, project: b.project }));

      // Intent blocks — forward-looking
      const intents = sorted
        .filter(b => b.type === "intent")
        .slice(0, 5)
        .map(b => ({ title: b.title, project: b.project }));

      // Open ideas
      const ideas = blocks
        .filter(b => b.type === "idea" && b.status !== "done")
        .sort((a,b) => (b.ts||0)-(a.ts||0))
        .slice(0, 8)
        .map(b => ({ title: b.title, project: b.project }));

      // Context fill estimate — time since last session block
      const lastSession = sorted.find(b => b.type === "session");
      const lastSessionDate = lastSession?.date || "unknown";
      const rawCapturesCount = (() => {
        try { return JSON.parse(readFileSync(join(STORYBOARD_DIR, "raw-captures.json"), "utf8")).length; } catch { return 0; }
      })();

      // Seed prompt — what Claude reads at session start
      const seedPrompt = [
        `═══ STORYBOARD AUTO-SEED · ${dateStr} ═══`,
        `Active project: ${activeProject}`,
        `Total blocks: ${blocks.length} | Inbox: ${rawCapturesCount} pending`,
        "",
        "── RECENT WORK ──",
        ...recentBlocks.map(b => {
          const icon = { session:"◈", decision:"✓", idea:"💡", intent:"🎯", rejection:"✕", compaction:"🗜️" }[b.type] || "•";
          return `  ${icon} [${b.project}] ${b.title}`;
        }),
        "",
        "── DECISIONS CARRYING FORWARD ──",
        ...(decisions.length ? decisions.map(d => `  ✓ ${d.project}: ${d.text}`) : ["  None recorded yet"]),
        "",
        "── DO NOT RE-SUGGEST (rejections) ──",
        ...(rejections.length ? rejections.map(r => `  ✕ ${r.title}${r.replacedBy ? ` → use: ${r.replacedBy}` : ""}`) : ["  No rejections recorded"]),
        "",
        "── INTENT (what we're building toward) ──",
        ...(intents.length ? intents.map(i => `  🎯 ${i.project}: ${i.title}`) : ["  Set intent in dashboard"]),
        "",
        "── OPEN IDEAS (not yet acted on) ──",
        ...(ideas.length ? ideas.map(i => `  💡 ${i.project}: ${i.title}`) : ["  No pending ideas"]),
        "",
        `═══ Ready. Context windows end. Intent doesn't. ═══`,
      ].join("\n");

      const response = {
        ok: true,
        generated: new Date().toISOString(),
        activeProject,
        blockCounts: { total: blocks.length, ...typeCounts },
        rawCapturesPending: rawCapturesCount,
        lastSessionDate,
        recentBlocks,
        decisions,
        rejections,
        intents,
        ideas,
        seedPrompt,
        dashboardUrl: "http://localhost:3848/app.html",
      };

      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(response, null, 2));
      process.stderr.write(`🚀 /session-bootstrap: ${activeProject} · ${blocks.length} blocks · ${rawCapturesCount} pending\n`);
    } catch(e) {
      res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // /blocks — return all blocks from blocks-data.json (lets dashboard work from any origin)
  if (req.method === "GET" && req.url.startsWith("/blocks")) {
    try {
      const data = existsSync(BLOCKS_FILE) ? JSON.parse(readFileSync(BLOCKS_FILE, "utf8")) : [];
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(data));
    } catch {
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify([]));
    }
    return;
  }

  // Browser extension capture — receives blocks from any AI tool tab
  if (req.method === "POST" && req.url === "/capture-web") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const block = JSON.parse(body);
        // Validate minimum fields — project is optional for auto-captures
        if (!block.title || !block.type) {
          res.writeHead(400); res.end(JSON.stringify({ error: "Missing title or type" }));
          return;
        }
        // Infer project from active blocks if not provided
        const inferredProject = block.project || (() => {
          const activeBlocks = readJSON(BLOCKS_FILE, []);
          const recent = activeBlocks.find(b => b.project && b._live);
          return recent?.project || "Storyboard";
        })();
        // Build a clean block record
        const now = new Date();
        const ts = block.ts || parseInt(`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`);
        const id = `web-${block.type}-${Date.now()}`;
        const newBlock = {
          id,
          type:    block.type,
          project: inferredProject,
          title:   block.title.substring(0, 120),
          summary: (block.summary || block.context || block.body)
            ? `${block.summary || ""}${block.context ? "\n\n[Context from " + (block.source || "browser") + "]\n" + block.context.substring(0, 600) : ""}${block.body && !block.summary ? block.body.substring(0, 600) : ""}`.trim()
            : undefined,
          date:     block.date || now.toLocaleDateString("en-GB", { day:"numeric", month:"short" }),
          ts,
          _captured: block._captured || now.toISOString(),
          _source:  block.source || "browser-extension",
          _url:     block.url || undefined,
          _autoCapture: block._autoCapture || undefined,
          heat:     block.type === "idea" ? "hot" : undefined,
          replacedBy: block.replacedBy || undefined,
          turnCount: block.turnCount || undefined,
        };

        // For auto-captured discussions, save the full conversation as a file
        if (block.type === "discussion" && block.discussionContent) {
          const safeTitle = block.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
          const dateStr = now.toISOString().slice(0,10).replace(/-/g,"");
          const fname = `auto-${dateStr}-${safeTitle}.md`;
          const fpath = path.join(__dirname, "discussions", fname);
          try {
            require("fs").writeFileSync(fpath, block.discussionContent, "utf-8");
            newBlock._discussionFile = `discussions/${fname}`;
          } catch (e) {
            // non-fatal
          }
        }
        // Remove undefined keys
        Object.keys(newBlock).forEach(k => newBlock[k] === undefined && delete newBlock[k]);

        // Prepend to blocks-data.json
        const blocks = readJSON(BLOCKS_FILE, []);
        blocks.unshift(newBlock);
        writeJSON(BLOCKS_FILE, blocks);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, id, block: newBlock }));
        process.stderr.write(`🧩 Web capture: [${block.type}] "${block.title}" → ${block.project}\n`);
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── /preview — auto-capture when Claude shows a localhost URL ─────────────
  // Call this immediately after showing a localhost URL to the user.
  // Creates a "preview" block so design snapshots are never lost.
  if (req.method === "POST" && req.url === "/preview") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { url, file, project, context, reaction } = JSON.parse(body);
        const now = new Date();
        const ts = parseInt(`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`);
        const label = file || (url ? url.replace("http://localhost:3848/","") : "preview");
        const newBlock = {
          id: `preview-${Date.now()}`,
          type: "preview",
          project: project || "Storyboard",
          title: `Preview shown: ${label}`,
          summary: [
            context ? `Context: ${context}` : null,
            reaction ? `Reaction: ${reaction}` : null,
            `URL: ${url || `http://localhost:3848/${label}`}`,
          ].filter(Boolean).join("\n"),
          date: now.toLocaleDateString("en-GB", { day:"numeric", month:"short" }),
          ts,
          _captured: now.toISOString(),
          _source: "claude-preview",
          _url: url || `http://localhost:3848/${label}`,
          chips: ["Preview", "Design snapshot", label],
        };
        const blocks = readJSON(BLOCKS_FILE, []);
        blocks.unshift(newBlock);
        writeJSON(BLOCKS_FILE, blocks);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, id: newBlock.id, block: newBlock }));
        process.stderr.write(`🖼️  Preview captured: "${label}" → ${project || "Storyboard"}\n`);
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

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

  // ── /git-push — trigger commit + push from dashboard or Claude in Chrome ──────
  if (req.method === "POST" && req.url === "/git-push") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { message } = JSON.parse(body || "{}");
        const msg = (message || `Storyboard update — ${new Date().toLocaleString("en-GB")}`).replace(/"/g, "'");
        // Remove stale lock files
        try { execSync(`rm -f "${STORYBOARD_DIR}/.git/index.lock" "${STORYBOARD_DIR}/.git/HEAD.lock"`); } catch(_) {}
        // Stage all changes
        execSync(`git -C "${STORYBOARD_DIR}" add -A`, { encoding: "utf8" });
        // Check if there's anything to commit
        const diff = execSync(`git -C "${STORYBOARD_DIR}" diff --cached --stat`, { encoding: "utf8" });
        if (!diff.trim()) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, message: "Nothing to commit — already up to date." }));
          return;
        }
        execSync(`git -C "${STORYBOARD_DIR}" commit -m "${msg}"`, { encoding: "utf8" });
        const pushOut = execSync(`git -C "${STORYBOARD_DIR}" push`, { encoding: "utf8", timeout: 30000 });
        const result = `✅ Pushed: "${msg}"\n${diff}${pushOut}`;
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, message: result }));
        process.stderr.write(`🚀 Git push: "${msg}"\n`);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: false, error: e.message.slice(0, 500) }));
      }
    });
    return;
  }

  // ── /git-status — check for uncommitted or unpushed changes ─────────────────
  if (req.method === "GET" && req.url === "/git-status") {
    try {
      // Staged or unstaged changes
      const diff = execSync(`git -C "${STORYBOARD_DIR}" status --porcelain`, { encoding: "utf8" }).trim();
      // Commits ahead of origin
      let ahead = 0;
      try {
        const rev = execSync(`git -C "${STORYBOARD_DIR}" rev-list @{u}..HEAD --count`, { encoding: "utf8" }).trim();
        ahead = parseInt(rev) || 0;
      } catch(_) {}
      const dirty = diff.length > 0 || ahead > 0;
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ dirty, uncommitted: diff.length > 0, unpushed: ahead > 0, ahead }));
    } catch(e) {
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ dirty: false, error: e.message.slice(0,200) }));
    }
    return;
  }

  // ── /waitlist — save email from landing page signup ────────────────────────
  if (req.method === "POST" && req.url === "/waitlist") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
      try {
        const { email, source } = JSON.parse(body);
        const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
        if (!email || !email.includes("@")) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ ok: false, error: "Invalid email" }));
          return;
        }
        const wlPath = path.join(STORYBOARD_DIR, "waitlist.json");
        let list = [];
        try { list = JSON.parse(readFileSync(wlPath, "utf8")); } catch(_) {}
        const already = list.find(e => e.email === email);
        if (!already) {
          list.push({ email, source: source || "landing", ts: new Date().toISOString() });
          writeFileSync(wlPath, JSON.stringify(list, null, 2));
          process.stderr.write(`📬 Waitlist signup: ${email}\n`);
        }
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ok: true, count: list.length }));
      } catch(e) {
        res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ── /waitlist GET — view signups ─────────────────────────────────────────────
  if (req.method === "GET" && req.url === "/waitlist") {
    try {
      const wlPath = path.join(STORYBOARD_DIR, "waitlist.json");
      let list = [];
      try { list = JSON.parse(readFileSync(wlPath, "utf8")); } catch(_) {}
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ ok: true, count: list.length, signups: list }));
    } catch(e) {
      res.writeHead(500); res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── /audit — run the full Opero audit.py pipeline on a URL ──────────────────
  if (req.method === "POST" && req.url === "/audit") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { url, name, area, competitor } = JSON.parse(body || "{}");
        if (!url) { res.writeHead(400); res.end(JSON.stringify({ error: "url required" })); return; }

        // Resolve domain from URL
        let domain = url;
        try { domain = new URL(url.startsWith("http") ? url : "https://"+url).hostname; } catch(e) {}
        const companyName = name || domain.replace("www.","").split(".")[0];
        const companyArea = area || "Global";

        // Path to audit.py — relative to this script
        const auditPy = join(__dirname, "../../../AI/AGENCY /Progression/BD-Audit-System/audit.py");
        const tmpOut  = `/tmp/sb-audit-${Date.now()}.json`;

        process.stderr.write(`🔎 Running audit.py on ${domain}…\n`);

        let auditResult = null;
        let auditError  = null;
        let competitorResult = null;

        try {
          // Install deps if needed (BeautifulSoup, requests, lxml)
          try { execSync("python3 -c 'import bs4,requests,lxml'", { timeout: 5000 }); }
          catch { execSync("pip3 install beautifulsoup4 requests lxml --break-system-packages -q", { timeout: 30000 }); }

          // Run main audit
          execSync(
            `python3 "${auditPy}" --domain "${domain}" --name "${companyName}" --area "${companyArea}" --output "${tmpOut}"`,
            { timeout: 60000, stdio: "pipe" }
          );
          auditResult = JSON.parse(readFileSync(tmpOut, "utf8"));
        } catch(e) {
          auditError = e.message?.substring(0, 200);
        }

        // Optional competitor audit
        if (competitor && !auditError) {
          let compDomain = competitor;
          try { compDomain = new URL(competitor.startsWith("http") ? competitor : "https://"+competitor).hostname; } catch(e) {}
          const compOut = `/tmp/sb-audit-comp-${Date.now()}.json`;
          try {
            execSync(
              `python3 "${auditPy}" --domain "${compDomain}" --name "${compDomain}" --area "${companyArea}" --output "${compOut}"`,
              { timeout: 60000, stdio: "pipe" }
            );
            competitorResult = JSON.parse(readFileSync(compOut, "utf8"));
          } catch(e) { /* competitor optional */ }
        }

        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({
          ok: !auditError,
          result: auditResult,
          competitor: competitorResult,
          error: auditError,
          ranAt: new Date().toISOString()
        }));
        process.stderr.write(`✅ Audit complete: ${domain} → ${auditResult?.total_score || 'error'}/100\n`);
      } catch(e) {
        res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── /seed-by-category — cross-project context seed filtered by work type ─────
  if (req.method === "POST" && req.url === "/seed-by-category") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
      try {
        const { category, project, limit = 20, includeThinking = false } = JSON.parse(body || "{}");

        // Category keyword map — mirrors app.html CAT_KEYWORDS
        const CAT_KEYWORDS = {
          "Content":    ["blog","article","post","copy","write","content","landing","page","newsletter","email","draft"],
          "SEO":        ["seo","keyword","rank","search","meta","sitemap","hreflang","index","crawl","traffic","google"],
          "Dev":        ["build","code","deploy","fix","refactor","debug","endpoint","api","server","component","function","script"],
          "Marketing":  ["campaign","ad","social","paid","cpc","cpm","instagram","facebook","tiktok","linkedin","brand"],
          "Legal":      ["gdpr","contract","terms","privacy","compliance","legal","regulation","law","tax","vat","license"],
          "Client":     ["client","lead","meeting","call","proposal","pitch","deal","follow","crm","contact","sale"],
          "Automation": ["automate","automation","workflow","schedule","trigger","mcp","script","pipeline","batch","cron"],
        };

        function inferCategory(block) {
          const text = `${block.title||""} ${block.content||""} ${block.note||""}`.toLowerCase();
          for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
            if (kws.some(kw => text.includes(kw))) return cat;
          }
          return "General";
        }

        // Load blocks
        const blocks = readJSON(BLOCKS_FILE, []);

        // Filter by category and optional project
        const filtered = blocks.filter(b => {
          if (project && b.project !== project) return false;
          if (category && inferCategory(b) !== category) return false;
          return true;
        }).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, limit);

        if (filtered.length === 0) {
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ ok: true, category, blockCount: 0, seed: `No blocks found for category: ${category || "all"}`, blocks: [] }));
          return;
        }

        // Group by project
        const byProject = {};
        for (const b of filtered) {
          const proj = b.project || "Unknown";
          if (!byProject[proj]) byProject[proj] = [];
          byProject[proj].push(b);
        }

        const projectNames = Object.keys(byProject);
        const catLabel = category || "All categories";
        const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

        // Build seed text
        const lines = [
          `═══ STORYBOARD SEED · ${catLabel.toUpperCase()} ═══`,
          `Generated: ${dateStr} · ${filtered.length} blocks across ${projectNames.length} project${projectNames.length !== 1 ? "s" : ""}`,
          `Projects: ${projectNames.join(" · ")}`,
          "",
        ];

        for (const [proj, pBlocks] of Object.entries(byProject)) {
          lines.push(`─── ${proj} · ${pBlocks.length} block${pBlocks.length !== 1 ? "s" : ""} ───`);
          for (const b of pBlocks) {
            const typeIcon = { session: "🧠", decision: "✓", idea: "💡", feature: "🔧", trail: "🔗", discussion: "💬", thinking: "🫧", intent: "🎯", rejection: "✕", compaction: "🗜️" }[b.type] || "•";
            const dateLabel = b.ts ? new Date(b.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
            const note = b.note ? ` — ${b.note.slice(0, 80)}` : "";
            lines.push(`  ${typeIcon} [${b.type || "block"}] ${b.title || "(untitled)"}${note} (${dateLabel})`);
            if (includeThinking && b.thinking) {
              lines.push(`    🫧 Thinking: ${b.thinking.slice(0, 200)}…`);
            }
          }
          lines.push("");
        }

        // Compounding insight footer
        if (projectNames.length > 1) {
          lines.push(`═══ CROSS-PROJECT INSIGHT ═══`);
          lines.push(`These ${filtered.length} ${catLabel} blocks span ${projectNames.length} projects.`);
          lines.push(`Patterns, decisions, and approaches that worked in one project are likely transferable.`);
          lines.push(`The 10th ${catLabel} session benefits from the 9 before it — across all projects.`);
        }

        const seed = lines.join("\n");

        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, category: catLabel, blockCount: filtered.length, projectCount: projectNames.length, seed, blocks: filtered }));
        process.stderr.write(`🌱 seed-by-category: ${catLabel} → ${filtered.length} blocks across ${projectNames.length} projects\n`);
      } catch(e) {
        res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ── /raw-capture — store raw conversation for later processing ──────────────
  if (req.method === "POST" && req.url === "/raw-capture") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const now = new Date();
        const rawFile = join(STORYBOARD_DIR, "raw-captures.json");
        const raws = readJSON(rawFile, []);
        const entry = {
          id: `raw-${Date.now()}`,
          captured: now.toISOString(),
          title: (payload.title || "").slice(0, 120),
          source: payload.source || "browser-extension",
          url: payload.url || "",
          turnCount: payload.turnCount || 0,
          transcript: payload.transcript || payload.messages || payload.body || "",
          processed: false,
        };
        raws.unshift(entry);
        // Keep last 50 raw captures
        writeJSON(rawFile, raws.slice(0, 50));
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, id: entry.id }));
        process.stderr.write(`📥 Raw capture: "${entry.title}" · ${entry.turnCount} turns\n`);
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── /raw-captures — list unprocessed raw captures ────────────────────────────
  if (req.method === "GET" && req.url === "/raw-captures") {
    const rawFile = join(STORYBOARD_DIR, "raw-captures.json");
    const raws = readJSON(rawFile, []);
    const unprocessed = raws.filter(r => !r.processed);
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ ok: true, count: unprocessed.length, captures: unprocessed }));
    return;
  }

  // ── /process-transcript — extract structured blocks from raw text via Claude API ─
  if (req.method === "POST" && req.url === "/process-transcript") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { transcript, rawId, project, apiKey: clientKey } = JSON.parse(body);
        if (!transcript) {
          res.writeHead(400); res.end(JSON.stringify({ error: "Missing transcript" }));
          return;
        }

        // Accept key from environment OR from client (user's own key stored in browser)
        const apiKey = process.env.ANTHROPIC_API_KEY || clientKey || "";
        if (!apiKey) {
          // No key anywhere — signal client to use local extraction
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({
            ok: false,
            error: "No API key available. Local pattern extraction will run instead.",
            fallback: true,
          }));
          return;
        }

        const systemPrompt = `You are a Storyboard content extractor. Read the AI conversation transcript and extract structured information.

Return ONLY valid JSON in this exact format:
{
  "decisions": ["string", ...],
  "ideas": ["string", ...],
  "rejections": [{"title": "string", "reason": "string", "replacedBy": "string or null"}, ...],
  "intent": "string or null",
  "keyMoments": ["string", ...],
  "suggestedTitle": "string",
  "discussionSummary": "2-3 sentence narrative summary of what happened in this conversation"
}

Rules:
- decisions: things explicitly decided, agreed on, or locked in (max 8)
- ideas: suggestions, possibilities, things to explore later (max 6)
- rejections: things explicitly dismissed, rejected, or said no to (max 5)
- intent: the overarching goal or direction expressed in the conversation (one sentence)
- keyMoments: turning points, important insights, breakthroughs (max 4)
- suggestedTitle: a short title for this conversation (max 60 chars)
- discussionSummary: what happened, what was built, what was decided (2-3 sentences)`;

        const truncatedTranscript = transcript.slice(0, 12000); // ~3k tokens

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: `Extract from this conversation:\n\n${truncatedTranscript}` }],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          res.end(JSON.stringify({ ok: false, error: `API error: ${response.status}`, detail: err }));
          return;
        }

        const data = await response.json();
        const raw = data.content?.[0]?.text || "{}";
        let extracted;
        try {
          // Strip markdown code fences if present
          const clean = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          extracted = JSON.parse(clean);
        } catch {
          extracted = { decisions: [], ideas: [], rejections: [], intent: null, keyMoments: [], suggestedTitle: "Session", discussionSummary: "" };
        }

        // Mark raw capture as processed
        if (rawId) {
          const rawFile = join(STORYBOARD_DIR, "raw-captures.json");
          const raws = readJSON(rawFile, []);
          const idx = raws.findIndex(r => r.id === rawId);
          if (idx >= 0) { raws[idx].processed = true; writeJSON(rawFile, raws); }
        }

        // Build candidate blocks for review
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const ts = parseInt(`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`);
        const inferredProject = project || "Storyboard";
        const candidates = [];

        if (extracted.intent) {
          candidates.push({ type: "intent", title: extracted.intent, project: inferredProject, date: dateStr, ts, _candidate: true });
        }
        (extracted.decisions || []).forEach(d => {
          candidates.push({ type: "decision", title: d, project: inferredProject, date: dateStr, ts, _candidate: true });
        });
        (extracted.ideas || []).forEach(i => {
          candidates.push({ type: "idea", title: i, project: inferredProject, date: dateStr, ts, heat: "hot", _candidate: true });
        });
        (extracted.rejections || []).forEach(r => {
          candidates.push({ type: "rejection", title: r.title, summary: r.reason || "", replacedBy: r.replacedBy, project: inferredProject, date: dateStr, ts, _candidate: true });
        });

        // Build auto discussion doc
        const discussionLines = [`# Discussion: ${extracted.suggestedTitle || "Session"}`, `\n${extracted.discussionSummary || ""}`, "\n---"];
        if (extracted.decisions?.length) discussionLines.push(`\n## Decisions\n${extracted.decisions.map(d=>`- ✓ ${d}`).join("\n")}`);
        if (extracted.ideas?.length) discussionLines.push(`\n## Ideas\n${extracted.ideas.map(i=>`- 💡 ${i}`).join("\n")}`);
        if (extracted.rejections?.length) discussionLines.push(`\n## Rejections\n${extracted.rejections.map(r=>`- ✕ ${r.title}${r.reason ? ` — ${r.reason}` : ""}`).join("\n")}`);
        if (extracted.keyMoments?.length) discussionLines.push(`\n## Key moments\n${extracted.keyMoments.map(m=>`- ${m}`).join("\n")}`);
        const discussionContent = discussionLines.join("\n");

        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({
          ok: true,
          extracted,
          candidates,
          discussionContent,
          candidateCount: candidates.length,
        }));
        process.stderr.write(`🧠 Processed transcript: ${candidates.length} candidates extracted\n`);
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── /confirm-candidates — save approved blocks from review inbox ──────────────
  if (req.method === "POST" && req.url === "/confirm-candidates") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { approved, discussionContent, discussionTitle } = JSON.parse(body);
        if (!approved?.length) {
          res.writeHead(400); res.end(JSON.stringify({ error: "No approved blocks" }));
          return;
        }
        const now = new Date();
        const blocks = readJSON(BLOCKS_FILE, []);
        const newBlocks = approved.map(b => ({
          ...b,
          id: `confirmed-${b.type}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          _candidate: undefined,
          _confirmed: now.toISOString(),
          _live: true,
        }));
        blocks.unshift(...newBlocks);
        writeJSON(BLOCKS_FILE, blocks);

        // Save discussion doc if provided
        let discussionFile = null;
        if (discussionContent) {
          const safeTitle = (discussionTitle || "session").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
          const dateStr = now.toISOString().slice(0,10).replace(/-/g,"");
          const fname = `processed-${dateStr}-${safeTitle}.md`;
          const fpath = join(STORYBOARD_DIR, "discussions", fname);
          try {
            writeFileSync(fpath, discussionContent, "utf-8");
            discussionFile = `discussions/${fname}`;
          } catch { /* non-fatal */ }
        }

        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, saved: newBlocks.length, discussionFile }));
        process.stderr.write(`✓ Confirmed ${newBlocks.length} blocks from review inbox\n`);
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // CORS preflight for /git-push, /waitlist, /audit (called from dashboard/landing)
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,GET", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
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
  let filePath = join(STORYBOARD_DIR, req.url === "/" ? "app.html" : req.url.split("?")[0]);
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
