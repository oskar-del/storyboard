// Minimal dashboard server — port 3849
// Reads collaborative blocks from the shared Dropbox vault, with local fallback.
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { homedir } from "os";

const DIR  = dirname(fileURLToPath(import.meta.url));
const PORT = 3849;

// Shared Dropbox vault — source of truth for collab mode
const VAULT_DIR        = join(homedir(), "Dropbox", "Storyboard-Vault");
const VAULT_OSKAR      = join(VAULT_DIR, "blocks-oskar.json");
const VAULT_COLLEAGUE  = join(VAULT_DIR, "blocks-colleague.json");

// Legacy local files — used as backfill so existing flow keeps working
const LEGACY_BLOCKS    = join(DIR, "blocks-data.json");
const SESSION_LOG      = join(DIR, "session-log.json");

const MIME = {
  ".html": "text/html", ".js": "application/javascript",
  ".json": "application/json", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml",
};

function readJSONSafe(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { return []; }
}

function dedupeById(arr) {
  const seen = new Set();
  const out  = [];
  for (const b of arr) {
    if (!b) continue;
    const id = b.id || b._id;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    out.push(b);
  }
  return out;
}

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const url = req.url.split("?")[0];

  if (url === "/blocks") {
    try {
      // Vault — primary source of truth (gets priority on dedupe)
      const oskarVault     = existsSync(VAULT_OSKAR)     ? readJSONSafe(VAULT_OSKAR)     : [];
      const colleagueVault = existsSync(VAULT_COLLEAGUE) ? readJSONSafe(VAULT_COLLEAGUE) : [];

      // Legacy local — backfill so any new captures during transition still surface
      const legacy = existsSync(LEGACY_BLOCKS)
        ? readJSONSafe(LEGACY_BLOCKS).map(b => (b && !b._author ? { ...b, _author: "oskar" } : b))
        : [];

      // Cross-session bridge — unchanged
      const sessions = existsSync(SESSION_LOG) ? readJSONSafe(SESSION_LOG) : [];

      // Merge order matters: first occurrence wins in dedupeById.
      // Vault first (so vault values win), then legacy fills in anything vault doesn't have.
      const merged = dedupeById([
        ...sessions,
        ...oskarVault,
        ...colleagueVault,
        ...legacy,
      ]);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(merged));
    } catch (e) {
      res.writeHead(500); res.end(e.message);
    }
    return;
  }

  const file = url === "/" ? "/app.html" : url;
  try {
    const data = readFileSync(join(DIR, file));
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "text/plain" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Dashboard: http://127.0.0.1:" + PORT + "/app.html");
  console.log("Vault:     " + VAULT_DIR + (existsSync(VAULT_DIR) ? "  [OK]" : "  [not found - using legacy local file]"));
  console.log("  oskar:     " + (existsSync(VAULT_OSKAR)     ? "OK" : "missing"));
  console.log("  colleague: " + (existsSync(VAULT_COLLEAGUE) ? "OK" : "missing"));
});
