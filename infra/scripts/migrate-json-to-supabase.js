#!/usr/bin/env node
/**
 * Storyboard v2 — one-time data migration script
 *
 * Reads all legacy JSON files + Dropbox vault → inserts into Supabase.
 * Idempotent: safe to re-run (skips blocks already in the DB by id).
 *
 * Required env vars:
 *   SUPABASE_URL        — https://xxx.supabase.co
 *   SUPABASE_SERVICE_KEY — service role key (bypasses RLS)
 *   STORYBOARD_AUTHOR   — primary author key (e.g. "oskar")
 *   COLLAB_PROJECTS     — comma-separated list (e.g. "Storyboard")
 *
 * Optional:
 *   LEGACY_BLOCKS_PATH  — path to blocks-data.json
 *                         (default: legacy/storyboard/blocks-data.json relative to this script)
 *   LEGACY_VAULT_DIR    — path to Dropbox vault directory
 *                         (default: ~/Dropbox/Storyboard-Vault)
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL        = env("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = env("SUPABASE_SERVICE_KEY");
const PRIMARY_AUTHOR       = process.env.STORYBOARD_AUTHOR || "oskar";
const COLLAB_PROJECTS      = (process.env.COLLAB_PROJECTS || "Storyboard").split(",").map(s => s.trim());

const LEGACY_BLOCKS_PATH = process.env.LEGACY_BLOCKS_PATH
  || join(__dirname, "../../legacy/storyboard/blocks-data.json");
const LEGACY_VAULT_DIR   = process.env.LEGACY_VAULT_DIR
  || join(homedir(), "Dropbox", "Storyboard-Vault");
const LEGACY_SESSION_LOG  = join(dirname(LEGACY_BLOCKS_PATH), "session-log.json");
const LEGACY_RAW_CAPTURES = join(dirname(LEGACY_BLOCKS_PATH), "raw-captures.json");
const LEGACY_WAITLIST     = join(dirname(LEGACY_BLOCKS_PATH), "waitlist.json");
const LEGACY_DISCUSSIONS  = join(dirname(LEGACY_BLOCKS_PATH), "discussions");

// ── Setup ──────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function env(key) {
  const v = process.env[key];
  if (!v) { console.error(`Missing required env var: ${key}`); process.exit(1); }
  return v;
}

function readJSON(path, fallback = []) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { return fallback; }
}

// ── Phase 1: collect all blocks ────────────────────────────────────────────────
function collectAllBlocks() {
  const seen = new Set();
  const out  = [];

  // Vault first (shared / collab)
  if (existsSync(LEGACY_VAULT_DIR)) {
    const files = readdirSync(LEGACY_VAULT_DIR).filter(f => f.startsWith("blocks-") && f.endsWith(".json"));
    for (const f of files) {
      const arr = readJSON(join(LEGACY_VAULT_DIR, f), []);
      for (const b of (Array.isArray(arr) ? arr : [])) {
        if (!b || !b.id || seen.has(b.id)) continue;
        seen.add(b.id);
        out.push({ ...b, _vaultFile: f });
      }
    }
    console.log(`  Vault blocks: ${seen.size} (from ${files.length} files)`);
  } else {
    console.log(`  Vault dir not found: ${LEGACY_VAULT_DIR}`);
  }

  // Local blocks
  const localBefore = seen.size;
  const localArr = readJSON(LEGACY_BLOCKS_PATH, []);
  for (const b of (Array.isArray(localArr) ? localArr : [])) {
    if (!b || !b.id || seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
  }
  console.log(`  Local blocks: +${seen.size - localBefore} (${localArr.length} total, ${localArr.length - (seen.size - localBefore)} dupes skipped)`);

  // Session log
  const sessionArr = readJSON(LEGACY_SESSION_LOG, []);
  const sessionBefore = seen.size;
  for (const b of (Array.isArray(sessionArr) ? sessionArr : [])) {
    if (!b || !b.id || seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
  }
  console.log(`  Session log: +${seen.size - sessionBefore}`);

  console.log(`  Total unique blocks: ${out.length}`);
  return out;
}

// ── Phase 2: resolve/upsert projects ──────────────────────────────────────────
async function ensureProjects(blocks, ownerID) {
  const projectNames = [...new Set(blocks.map(b => b.project).filter(Boolean))];
  const projectMap   = {}; // name → id

  for (const name of projectNames) {
    const { data, error } = await supabase
      .from("projects")
      .upsert({ owner_id: ownerID, name }, { onConflict: "owner_id,name" })
      .select("id")
      .single();

    if (error) {
      console.warn(`  ⚠️  Could not upsert project "${name}": ${error.message}`);
    } else {
      projectMap[name] = data.id;
    }
  }

  console.log(`  Projects upserted: ${Object.keys(projectMap).length}`);
  return projectMap;
}

// ── Phase 3: insert blocks ─────────────────────────────────────────────────────
async function insertBlocks(blocks, projectMap, authorToUserID) {
  let inserted = 0;
  let skipped  = 0;
  let errored  = 0;

  // Process in batches of 100
  const BATCH = 100;
  for (let i = 0; i < blocks.length; i += BATCH) {
    const batch = blocks.slice(i, i + BATCH);

    const rows = batch.map(b => {
      const authorKey = b._author || PRIMARY_AUTHOR;
      const userID    = authorToUserID[authorKey] || authorToUserID[PRIMARY_AUTHOR];
      if (!userID) return null;

      return {
        id:           b.id,
        user_id:      userID,
        project_id:   projectMap[b.project] || null,
        project_name: b.project || "Unknown",
        type:         sanitizeType(b.type),
        status:       sanitizeStatus(b.status),
        title:        (b.title || "").substring(0, 1000),
        summary:      b.summary || null,
        seed:         b.seed || null,
        task:         b.task || null,
        chips:        Array.isArray(b.chips)     ? b.chips     : null,
        decisions:    Array.isArray(b.decisions) ? b.decisions : null,
        ideas:        Array.isArray(b.ideas)     ? b.ideas     : null,
        tags:         Array.isArray(b.tags)      ? b.tags      : null,
        heat:         b.heat || null,
        replaced_by:  b.replacedBy || null,
        is_live:      b._live || false,
        is_candidate: b._candidate || false,
        source:       b._source || null,
        source_url:   b._url || null,
        turn_count:   b.turnCount || null,
        ts:           b.ts || null,
        date_label:   b.date || null,
        author_key:   authorKey,
        captured_at:  b._captured || new Date().toISOString(),
      };
    }).filter(Boolean);

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from("blocks")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });

    if (error) {
      console.warn(`  Batch ${i}–${i + BATCH}: error: ${error.message}`);
      errored += rows.length;
    } else {
      inserted += rows.length;
    }
  }

  console.log(`  Blocks: ${inserted} upserted, ${skipped} skipped, ${errored} errors`);
}

// ── Phase 4: raw captures, discussions, waitlist ───────────────────────────────
async function insertRawCaptures(ownerID) {
  const raws = readJSON(LEGACY_RAW_CAPTURES, []);
  if (!raws.length) { console.log("  Raw captures: none"); return; }

  const rows = raws.map(r => ({
    id:          r.id || `raw-${Date.now()}`,
    user_id:     ownerID,
    title:       r.title || "",
    source:      r.source || "browser-extension",
    source_url:  r.url || null,
    turn_count:  r.turnCount || 0,
    transcript:  r.transcript || "",
    processed:   r.processed || false,
    captured_at: r.captured || new Date().toISOString(),
  }));

  const { error } = await supabase.from("raw_captures").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) console.warn(`  Raw captures error: ${error.message}`);
  else console.log(`  Raw captures: ${rows.length} upserted`);
}

async function insertDiscussions(ownerID, projectMap) {
  if (!existsSync(LEGACY_DISCUSSIONS)) { console.log("  Discussions: dir not found"); return; }
  const files = readdirSync(LEGACY_DISCUSSIONS).filter(f => f.endsWith(".md"));
  if (!files.length) { console.log("  Discussions: none"); return; }

  const rows = files.map(fname => ({
    user_id:    ownerID,
    project_id: null,
    file_name:  fname,
    content:    readFileSync(join(LEGACY_DISCUSSIONS, fname), "utf8"),
  }));

  const { error } = await supabase.from("discussions").insert(rows);
  if (error) console.warn(`  Discussions error: ${error.message}`);
  else console.log(`  Discussions: ${rows.length} inserted`);
}

async function insertWaitlist() {
  const list = readJSON(LEGACY_WAITLIST, []);
  if (!list.length) { console.log("  Waitlist: none"); return; }

  const rows = list.map(e => ({
    email:        (e.email || "").toLowerCase().trim(),
    source:       e.source || "legacy",
    signed_up_at: e.ts || new Date().toISOString(),
  })).filter(e => e.email.includes("@"));

  const { error } = await supabase.from("waitlist").upsert(rows, { onConflict: "email", ignoreDuplicates: true });
  if (error) console.warn(`  Waitlist error: ${error.message}`);
  else console.log(`  Waitlist: ${rows.length} upserted`);
}

// ── Phase 5: verify ───────────────────────────────────────────────────────────
async function verify(expected) {
  const { count } = await supabase.from("blocks").select("*", { count: "exact", head: true });
  console.log(`\n  Verification: ${count} blocks in Supabase vs ${expected} in local files`);
  if (count < expected * 0.95) {
    console.warn("  ⚠️  Less than 95% of blocks made it in. Check for errors above.");
  } else {
    console.log("  ✅ Migration looks complete.");
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const VALID_TYPES    = new Set(["session","decision","idea","milestone","rejection","intent","preview","discussion","compaction"]);
const VALID_STATUSES = new Set(["done","in_progress","not_started"]);

function sanitizeType(t)   { return VALID_TYPES.has(t)    ? t : "session"; }
function sanitizeStatus(s) { return VALID_STATUSES.has(s) ? s : "done"; }

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Storyboard v2 — data migration\n");

  // Validate Supabase connection
  const { error: pingErr } = await supabase.from("profiles").select("id").limit(1);
  if (pingErr && pingErr.code !== "PGRST116") {
    console.error("❌ Cannot connect to Supabase:", pingErr.message);
    process.exit(1);
  }
  console.log("✅ Supabase connected\n");

  // The primary user must exist in profiles before migration.
  // Look them up by author_key.
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, author_key")
    .eq("author_key", PRIMARY_AUTHOR)
    .single();

  if (profileErr || !profile) {
    console.error(`❌ Profile with author_key="${PRIMARY_AUTHOR}" not found.`);
    console.error("   Create it first: sign up via the web app, then set your author_key in the profile.");
    process.exit(1);
  }

  const primaryUserID = profile.id;
  console.log(`👤 Primary user: ${PRIMARY_AUTHOR} → ${primaryUserID}\n`);

  // Collect all collaborator profiles (for vault blocks)
  const { data: allProfiles } = await supabase.from("profiles").select("id, author_key");
  const authorToUserID = {};
  for (const p of (allProfiles || [])) {
    authorToUserID[p.author_key] = p.id;
  }
  // Fallback: blocks with unknown authors → primary user
  authorToUserID[PRIMARY_AUTHOR] = primaryUserID;

  console.log("Phase 1: collecting blocks…");
  const blocks = collectAllBlocks();

  console.log("\nPhase 2: upserting projects…");
  const projectMap = await ensureProjects(blocks, primaryUserID);

  console.log("\nPhase 3: inserting blocks…");
  await insertBlocks(blocks, projectMap, authorToUserID);

  console.log("\nPhase 4: raw captures, discussions, waitlist…");
  await insertRawCaptures(primaryUserID);
  await insertDiscussions(primaryUserID, projectMap);
  await insertWaitlist();

  console.log("\nPhase 5: verification…");
  await verify(blocks.length);

  console.log("\n✅ Migration complete.");
}

main().catch(err => { console.error("Migration failed:", err); process.exit(1); });
