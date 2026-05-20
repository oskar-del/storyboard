#!/usr/bin/env node
/**
 * Storyboard MCP Server v2
 *
 * Thin adapter — all business logic lives in the Go API.
 * Tool names and inputSchemas are frozen (Claude Desktop / Cursor configs hardcode them).
 *
 * Changes vs v1:
 *   - All readFileSync/writeFileSync/readAllBlocks/upsertBlock removed
 *   - Every handler calls api-client.js instead
 *   - HTTP 3847 proxies to Go API (browser extension keeps working unchanged)
 *   - Static file server 3848 removed (replaced by Vercel app)
 *
 * Required env:
 *   STORYBOARD_API_URL  — Go API URL (default: http://localhost:8080)
 *   STORYBOARD_TOKEN    — Bearer token
 *   STORYBOARD_AUTHOR   — author key (default: oskar)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "http";
import { api } from "./api-client.js";

const AUTHOR  = process.env.STORYBOARD_AUTHOR  || "oskar";
const API_URL = process.env.STORYBOARD_API_URL || "http://localhost:8080";
const TOKEN   = process.env.STORYBOARD_TOKEN   || "";

// ── MCP Server ────────────────────────────────────────────────────────────────
const server = new Server(
  { name: "storyboard", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions (SCHEMAS FROZEN — do not rename or change required fields) ──
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "session_start",
      description: "CALL THIS AUTOMATICALLY AT THE START OF EVERY SESSION — before saying anything else to the user. Reads Storyboard state and returns a 3-line brief: what was last worked on, what's pending, and which project is hottest. Use the output to ask one question: 'Want to continue from [X], or start something new?' Do NOT output the raw JSON — format it as a natural opening message.",
      inputSchema: { type: "object", properties: {} },
    },
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
          id:        { type: "string",  description: "Unique block ID, e.g. 'op-audit-v2'" },
          title:     { type: "string",  description: "Block title" },
          project:   { type: "string",  description: "Project name" },
          summary:   { type: "string",  description: "What was built and why it matters" },
          chips:     { type: "array",   items: { type: "string" }, description: "3-6 short labels" },
          decisions: { type: "array",   items: { type: "string" }, description: "Key decisions made" },
          ideas:     { type: "array",   items: { type: "string" }, description: "Ideas that emerged" },
          seed:      { type: "string",  description: "Context to copy for next session on this topic" },
          status:    { type: "string",  description: "'done' | 'in_progress' | 'not_started'", default: "done" },
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
      description: "Returns a full session seed from the current storyboard state — active projects, recent blocks, decisions, ideas. Use at the start of a session or when asked 'where were we', 'what's the status', 'seed new chat'.",
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
      description: "Returns a summary of all projects with block counts and latest activity.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "populate",
      description: "Syncs storyboard. In v2, Supabase is the source of truth — this is a no-op kept for backwards compatibility.",
      inputSchema: {
        type: "object",
        properties: {
          inspect: { type: "boolean", description: "Run inspection pass", default: false },
        },
      },
    },
    {
      name: "git_push",
      description: "Triggers a Supabase Storage backup snapshot. In v2, git is not used for data — kept for backwards compatibility.",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string", description: "Snapshot label (optional)" },
        },
      },
    },
    {
      name: "score_skills",
      description: "Re-scores all skills based on recent block activity (blocks in last 30 days containing skill keywords).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "log_block",
      description: "Log a block in real time mid-session — it appears in the Today feed within 10 seconds (live Tetris mode). Call the moment a decision is made, a key insight forms, or when starting/ending a task.",
      inputSchema: {
        type: "object",
        properties: {
          type:      { type: "string",  description: "'decision' | 'idea' | 'session' | 'rejection' | 'milestone'" },
          project:   { type: "string",  description: "Project name" },
          title:     { type: "string",  description: "One-line description of what just happened" },
          summary:   { type: "string",  description: "More context" },
          task:      { type: "string",  description: "Task window this belongs to" },
          decisions: { type: "array",   items: { type: "string" } },
          ideas:     { type: "array",   items: { type: "string" } },
          chips:     { type: "array",   items: { type: "string" } },
        },
        required: ["type", "project", "title"],
      },
    },
  ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "session_start") {
      const brief = await api.sessionStart();
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
      const lines = [];
      lines.push(`${greeting}, ${cap(AUTHOR)}. Sprint Day ${brief.sprintDay ?? "?"}/10.`);
      if (brief.lastSession) lines.push(`Last session: "${brief.lastSession.title}" (${brief.lastSession.project}).`);
      if (brief.lastDecisions?.length) lines.push(`Key decisions: ${brief.lastDecisions.slice(0,2).join(" · ")}.`);
      if (brief.inProgress?.length) lines.push(`In progress: ${brief.inProgress.map(b=>`"${b.title}" (${b.project})`).join(", ")}.`);
      if (brief.pendingIdeas?.length) lines.push(`${brief.pendingIdeas.length} idea${brief.pendingIdeas.length>1?"s":""} waiting: ${brief.pendingIdeas.map(b=>b.title).join(", ")}.`);
      if (brief.hottestProject) lines.push(`Hottest project: ${brief.hottestProject}.`);
      if (brief.todayCount) lines.push(`${brief.todayCount} block${brief.todayCount>1?"s":""} captured today.`);
      lines.push("", `Continue from ${brief.hottestProject||brief.lastSession?.project||"your last session"}, or start something new?`);
      process.stderr.write(`🌅 Session start: ${AUTHOR}, ${brief.totalBlocks} blocks\n`);
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    if (name === "capture_idea") {
      const block = await api.createBlock({
        type: "idea", project: args.project,
        title: `💡 ${args.title}`, summary: args.details || "Captured idea.",
        chips: ["💡 Idea", args.project, "Not started"], status: "not_started", _live: true,
      });
      return { content: [{ type: "text", text: `💡 Captured: "${args.title}" → ${args.project}\nBlock id: ${block.id}` }] };
    }

    if (name === "capture_block") {
      const block = await api.createBlock({
        id: args.id, type: "session", project: args.project, title: args.title,
        summary: args.summary, chips: args.chips||[], decisions: args.decisions||[],
        ideas: args.ideas||[], seed: args.seed||"", status: args.status||"done", _live: true,
      });
      return { content: [{ type: "text", text: `✅ Block captured: "${args.title}" → ${args.project}\nStatus: ${block.status}` }] };
    }

    if (name === "update_block") {
      const block = await api.updateBlock(args.id, { status: args.status, note: args.note });
      return { content: [{ type: "text", text: `Updated block "${args.id}": status=${block.status}` }] };
    }

    if (name === "get_context_seed") {
      const { seed } = await api.sessionSeed({ project: args.project||"", format: args.format||"full" });
      return { content: [{ type: "text", text: seed }] };
    }

    if (name === "list_projects") {
      const projects = await api.listProjects();
      const lines = projects.map(p => `• ${p.name}: ${p.total_blocks} blocks`).join("\n");
      return { content: [{ type: "text", text: `Projects:\n${lines}` }] };
    }

    if (name === "populate") {
      await api.syncPush({});
      return { content: [{ type: "text", text: "✅ Sync complete. Supabase is the source of truth — no file sync needed." }] };
    }

    if (name === "git_push") {
      await api.syncPush({ message: args.message||"" });
      return { content: [{ type: "text", text: "✅ Snapshot triggered. Download a full backup from the Settings page." }] };
    }

    if (name === "score_skills") {
      const result = await api.scoreSkills();
      return { content: [{ type: "text", text: `✅ Skills scored. ${result.updated} skills updated.` }] };
    }

    if (name === "log_block") {
      if (!args.title || !args.type) return { content: [{ type: "text", text: "Error: title and type required" }] };
      const block = await api.createBlock({
        type: args.type, project: args.project||"Storyboard",
        title: args.title.substring(0,120), summary: args.summary, task: args.task,
        decisions: args.decisions, ideas: args.ideas, chips: args.chips, _live: true,
      });
      process.stderr.write(`⚡ Live block: [${args.type}] "${args.title}"\n`);
      return { content: [{ type: "text", text: `⚡ Logged: "${args.title}" (id: ${block.id})` }] };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };

  } catch (err) {
    const msg = err?.message || String(err);
    process.stderr.write(`❌ [${name}]: ${msg}\n`);
    return { content: [{ type: "text", text: `Error: ${msg}` }] };
  }
});

// ── HTTP proxy on 3847 (keeps browser extension working during transition) ────
const PATH_MAP = {
  "/ping":               "/ping",
  "/blocks":             "/api/v1/blocks",
  "/log-block":          "/api/v1/blocks",
  "/log-session":        "/api/v1/blocks",
  "/capture-web":        "/api/v1/capture/web",
  "/session-start":      "/api/v1/session/start",
  "/session-bootstrap":  "/api/v1/session/bootstrap",
  "/process-transcript": "/api/v1/capture/process",
  "/confirm-candidates": "/api/v1/capture/confirm",
  "/raw-capture":        "/api/v1/capture/raw",
  "/raw-captures":       "/api/v1/capture/raw",
  "/export":             "/api/v1/export",
  "/seed-by-category":   "/api/v1/session/seed",
  "/waitlist":           "/api/v1/waitlist",
  "/preview":            "/api/v1/capture/preview",
  "/screenshot":         "/api/v1/capture/screenshot",
  "/git-push":           "/api/v1/sync/push",
  "/git-status":         "/api/v1/sync/status",
};

const proxyServer = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const rawPath = req.url?.split("?")[0] || "/";
  const target  = PATH_MAP[rawPath];
  if (!target) { res.writeHead(404); res.end(JSON.stringify({ error: "unknown" })); return; }

  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", async () => {
    try {
      const r = await fetch(`${API_URL}${target}`, {
        method:  req.method,
        headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json", "X-Storyboard-Author": AUTHOR },
        body:    req.method !== "GET" && body ? body : undefined,
      });
      const text = await r.text();
      res.writeHead(r.status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(text);
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ ok: false, error: `Proxy: ${err.message}` }));
    }
  });
});

proxyServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") process.stderr.write("⚠️  Port 3847 in use — proxy skipped\n");
  else process.stderr.write("Proxy error: " + err.message + "\n");
});

proxyServer.listen(3847, "127.0.0.1", () => {
  process.stderr.write(`🔌 Proxy on http://127.0.0.1:3847 → ${API_URL}\n`);
});

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// ── Start MCP ─────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("Storyboard MCP server v2 running\n");
