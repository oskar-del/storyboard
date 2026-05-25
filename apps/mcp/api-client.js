/**
 * Storyboard API client for the MCP server.
 * All communication with the Go backend goes through this module.
 * File I/O has been removed — this replaces readAllBlocks(), upsertBlock(), etc.
 */

const BASE_URL = process.env.STORYBOARD_API_URL || "http://localhost:8080";
const TOKEN    = process.env.STORYBOARD_TOKEN   || "";

if (!TOKEN) {
  process.stderr.write(
    "⚠️  STORYBOARD_TOKEN not set. Run 'node mcp-server.js --setup' to authenticate.\n"
  );
}

/**
 * Make an authenticated request to the Go API.
 * @param {string} method
 * @param {string} path  — must start with /api/v1/
 * @param {object|null} body
 * @returns {Promise<object>}
 */
export async function apiCall(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Storyboard-Author": process.env.STORYBOARD_AUTHOR || "unknown",
    },
  };
  if (body !== null) init.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new Error(`Storyboard API unreachable at ${BASE_URL}: ${err.message}\n` +
      "Is the API server running? Check STORYBOARD_API_URL.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export const api = {
  // Blocks
  listBlocks:   (params = {}) => apiCall("GET",   `/api/v1/blocks?${new URLSearchParams(params)}`),
  createBlock:  (body)        => apiCall("POST",  "/api/v1/blocks", body),
  updateBlock:  (id, body)    => apiCall("PATCH", `/api/v1/blocks/${encodeURIComponent(id)}`, body),

  // Projects
  listProjects: ()            => apiCall("GET",   "/api/v1/projects"),

  // Session
  sessionStart: ()            => apiCall("GET",   "/api/v1/session/start"),
  sessionSeed:  (params = {}) => apiCall("GET",   `/api/v1/session/seed?${new URLSearchParams(params)}`),

  // Skills
  scoreSkills:  ()            => apiCall("POST",  "/api/v1/skills/score", {}),

  // Sync
  syncPush:     (body = {})   => apiCall("POST",  "/api/v1/sync/push", body),
};
