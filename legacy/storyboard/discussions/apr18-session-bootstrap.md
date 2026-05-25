# Session Bootstrap — Claude Auto-Seeds from Storyboard

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Decision + Architecture  
**Status:** Locked — shapes all future session workflows  

---

## The problem we solved

Every new Cowork session starts blank. Claude doesn't know what project is active, what decisions were made, what got rejected, or what's being built toward. The user has to either copy-paste a seed manually, or spend the first few minutes re-explaining context.

This is exactly what Storyboard was built to fix — but the connection between Storyboard and the session wasn't wired up. Day 6 wires it up.

---

## The architecture

```
New session starts
       ↓
Claude calls GET localhost:3847/session-bootstrap
       ↓
Returns: active project, recent blocks, decisions,
         rejections, intents, open ideas, seed prompt
       ↓
Claude reads the seed — session starts fully loaded
```

No copy-paste. No "where were we." The session just knows.

---

## What /session-bootstrap returns

```json
{
  "activeProject": "Storyboard",
  "blockCounts": { "total": 45, "decision": 12, "rejection": 3, "intent": 1 },
  "rawCapturesPending": 2,
  "lastSessionDate": "18 Apr 2026",
  "recentBlocks": [...],
  "decisions": ["Use /raw-capture for auto-capture", "BYOK model for API keys", ...],
  "rejections": [{ "title": "Morning brief", "replacedBy": "Carry forward →" }],
  "intents": [{ "title": "Build the visual intent layer for AI work" }],
  "ideas": [...],
  "seedPrompt": "═══ STORYBOARD AUTO-SEED ... ═══"
}
```

The `seedPrompt` field is the formatted text Claude reads at session start.

---

## The 🚀 New session button

In the dashboard topbar, the 🚀 button opens a full-screen overlay that:

1. Calls `/session-bootstrap` in real time
2. Shows stats: active project, block count, pending inbox items
3. Shows the full formatted seed prompt
4. Has a "Copy seed to clipboard" button — one click, paste into new session

**Fallback when server is offline:** generates the same seed from the dashboard's local data (liveBlocks). The seed is slightly less complete but immediately available.

---

## The Chrome integration

Claude in Chrome can now:

1. Open the Storyboard dashboard at localhost:3848
2. Navigate to localhost:3847/session-bootstrap via JavaScript
3. Read the response directly from the page context
4. Extract the seed without the user doing anything

This is how "auto-bootstrap on session start" works: Claude doesn't need the user to click anything. It opens Chrome, reads the state, and primes itself.

**Claude's session-start sequence (when Storyboard is installed):**
```
1. Fetch localhost:3847/session-bootstrap
2. Parse: active project, decisions, rejections, intent
3. Report: "Storyboard says we're on Day 6. Active: Storyboard.
            Last decision: route auto-capture through inbox.
            3 rejections not to repeat. 1 pending inbox item."
4. Ask: "Ready to continue, or start something new?"
```

---

## Why this matters for the product

This is Storyboard's moat made real.

Every other AI tool resets. Claude in Cursor, Claude in ChatGPT, Claude in Cowork — all blank slates. Storyboard is the layer above them all. It holds the intent across every tool, every session, every context window.

The bootstrap is the proof: you start a session, and it just *knows*. Not because it memorized everything — because the context was intentional enough to carry forward.

**"Context windows end. Intent doesn't."**

---

## What this enables next

- **Session-end capture:** when a session ends, auto-generate a block from the conversation and send to Storyboard
- **Claude MCP native connection:** connect the stdio server to Cowork directly — Claude has Storyboard tools natively
- **Multi-model context sync:** GPT session → Storyboard → Claude session, with full context transfer
- **Team shared intent:** multiple people, same Storyboard, same context carried forward

---

→ Related: `apr18-capture-everything.md` — why we capture first, decide later  
→ Related: `apr18-mobile-companion.md` — same "always available" philosophy  
→ Related: `apr18-three-layers.md` — the four invisible layers this feeds into  
