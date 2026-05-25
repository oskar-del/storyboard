#!/usr/bin/env node

import { createServer } from "http";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { extname, join, normalize } from "path";
import { homedir } from "os";

const HOST = "127.0.0.1";
const PORT = 3849;
const ROOT = normalize(process.cwd());

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
};

function resolveVaultDir() {
  const candidates = [
    join(homedir(), "Dropbox", "Storyboard-Vault"),
    join(homedir(), "Library", "CloudStorage", "Dropbox", "Storyboard-Vault"),
  ];
  return candidates.find((dir) => existsSync(dir)) || candidates[0];
}

const VAULT_DIR = resolveVaultDir();
const RAW_CAPTURES_FILE = join(ROOT, "raw-captures.json");

function readJSON(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function vaultBlockFiles() {
  if (!existsSync(VAULT_DIR)) return [];
  return readdirSync(VAULT_DIR)
    .filter((name) => /^blocks-.*\.json$/i.test(name))
    .map((name) => join(VAULT_DIR, name));
}

function readMergedBlocks() {
  const files = vaultBlockFiles();
  const merged = [];
  const seen = new Set();

  for (const file of files) {
    const blocks = readJSON(file, []);
    if (!Array.isArray(blocks)) continue;
    for (const block of blocks) {
      if (!block || typeof block !== "object") continue;
      const id = block.id || `${file}:${merged.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(block);
    }
  }

  merged.sort((a, b) => {
    const tsA = Number(a.ts || 0);
    const tsB = Number(b.ts || 0);
    if (tsB !== tsA) return tsB - tsA;
    const logA = Date.parse(a._logged || a.date || 0) || 0;
    const logB = Date.parse(b._logged || b.date || 0) || 0;
    return logB - logA;
  });

  return merged;
}

function sprintDay() {
  const start = new Date("2026-04-12T00:00:00");
  const diff = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(10, diff));
}

function buildSessionStart(blocks) {
  const sessions = blocks.filter((b) => b.type === "session");
  const lastSession = sessions[0] || null;
  const lastDecisions = blocks.flatMap((b) => Array.isArray(b.decisions) ? b.decisions : []).filter(Boolean).slice(0, 3);
  const inProgress = blocks.filter((b) => b.status === "in_progress").slice(0, 4);
  const pendingIdeas = blocks.filter((b) => b.type === "idea").slice(0, 6);

  const recentCounts = new Map();
  for (const block of blocks) {
    if (!block.project) continue;
    recentCounts.set(block.project, (recentCounts.get(block.project) || 0) + 1);
  }
  const hottestProject = [...recentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    lastSession,
    lastDecisions,
    inProgress,
    pendingIdeas,
    hottestProject,
    sprintDay: sprintDay(),
    totalBlocks: blocks.length,
  };
}

function buildSeedPrompt(blocks) {
  const recent = blocks.slice(0, 12);
  const sessions = recent.filter((b) => b.type === "session").slice(0, 4);
  const decisions = recent.flatMap((b) => Array.isArray(b.decisions) ? b.decisions : []).filter(Boolean).slice(0, 6);
  const ideas = recent.filter((b) => b.type === "idea").slice(0, 6).map((b) => b.title).filter(Boolean);
  const activeProject = recent[0]?.project || "Storyboard";

  return [
    `# Session Seed — ${activeProject}`,
    "",
    "## What we just touched",
    ...sessions.map((b) => `- ${b.title}`),
    "",
    "## Decisions to carry forward",
    ...(decisions.length ? decisions.map((d, i) => `${i + 1}. ${d}`) : ["1. No explicit decisions captured yet."]),
    "",
    "## Floating ideas",
    ...(ideas.length ? ideas.map((idea) => `- ${idea}`) : ["- No fresh ideas captured yet."]),
    "",
    "## Immediate next steps",
    "1. Review the latest Storyboard blocks in the dashboard.",
    "2. Continue the highest-momentum Storyboard task.",
    "3. Capture any new decisions or ideas back into the shared flow.",
  ].join("\n");
}

function buildSessionBootstrap(blocks) {
  const activeProject = blocks[0]?.project || "Storyboard";
  const lastSession = blocks.find((b) => b.type === "session");
  return {
    activeProject,
    blockCounts: { total: blocks.length },
    rawCapturesPending: readJSON(RAW_CAPTURES_FILE, []).filter((c) => !c.processed).length,
    lastSessionDate: lastSession?.date || lastSession?._logged || "—",
    seedPrompt: buildSeedPrompt(blocks),
  };
}

function readRawCaptures() {
  const data = readJSON(RAW_CAPTURES_FILE, []);
  return Array.isArray(data) ? data : [];
}

function sendJSON(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function serveFile(reqPath, res) {
  const relativePath = reqPath === "/" ? "/app.html" : reqPath;
  const filePath = normalize(join(ROOT, relativePath));
  if (!filePath.startsWith(ROOT)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    sendText(res, 404, "Not found");
    return;
  }
  const ext = extname(filePath).toLowerCase();
  sendText(res, 200, readFileSync(filePath), MIME[ext] || "application/octet-stream");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && path === "/health") {
    sendJSON(res, 200, { ok: true, port: PORT, vault: VAULT_DIR, vaultFound: existsSync(VAULT_DIR) });
    return;
  }

  if (req.method === "GET" && path === "/blocks") {
    sendJSON(res, 200, readMergedBlocks());
    return;
  }

  if (req.method === "GET" && path === "/session-start") {
    sendJSON(res, 200, buildSessionStart(readMergedBlocks()));
    return;
  }

  if (req.method === "GET" && path === "/session-bootstrap") {
    sendJSON(res, 200, buildSessionBootstrap(readMergedBlocks()));
    return;
  }

  if (req.method === "GET" && path === "/raw-captures") {
    const captures = readRawCaptures().filter((capture) => !capture.processed);
    sendJSON(res, 200, { count: captures.length, captures });
    return;
  }

  if (req.method === "GET" && path === "/export") {
    sendJSON(res, 200, {
      _meta: {
        exportedAt: new Date().toISOString(),
        vault: VAULT_DIR,
        blockCount: readMergedBlocks().length,
      },
      blocks: readMergedBlocks(),
    });
    return;
  }

  if (req.method === "POST" && ["/raw-capture", "/capture-web", "/process-transcript", "/confirm-candidates"].includes(path)) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (path === "/raw-capture") {
        const captures = readRawCaptures();
        const payload = body ? JSON.parse(body) : {};
        captures.unshift({
          id: payload.id || `raw-${Date.now()}`,
          title: payload.title || "Untitled capture",
          transcript: payload.transcript || "",
          source: payload.source || "dashboard",
          url: payload.url || "",
          turnCount: payload.turnCount || 0,
          processed: false,
          capturedAt: new Date().toISOString(),
        });
        sendJSON(res, 200, { ok: true, stored: true, note: "Raw capture storage is available after adding persistence." });
        return;
      }
      if (path === "/process-transcript") {
        sendJSON(res, 200, { ok: false, fallback: true, error: "Transcript processing is not configured in this local viewer." });
        return;
      }
      if (path === "/confirm-candidates") {
        sendJSON(res, 200, { ok: true, saved: 0, discussionFile: null });
        return;
      }
      sendJSON(res, 200, { ok: true });
    });
    return;
  }

  serveFile(path, res);
});

server.listen(PORT, HOST, () => {
  const vaultOk = existsSync(VAULT_DIR);
  const authors = vaultBlockFiles()
    .map((file) => file.split("/").pop()?.replace(/^blocks-/, "").replace(/\.json$/i, ""))
    .filter(Boolean)
    .sort();

  process.stdout.write(`Dashboard: http://${HOST}:${PORT}/app.html\n`);
  process.stdout.write(`Vault:     ${VAULT_DIR}  ${vaultOk ? "[OK]" : "[not found]"}\n`);
  for (const author of authors) {
    process.stdout.write(`  ${author}: OK\n`);
  }
});
