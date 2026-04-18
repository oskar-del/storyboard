# Day 5 Build Log — Infrastructure Hardening

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Session  
**Status:** Complete  

---

## What was built

### Extension v0.4 — complete capture pipeline
The single most important architectural fix of Day 5.

Auto-capture previously wrote directly to blocks-data.json via `/capture-web`. This bypassed the inbox entirely — no extraction, no review, no structure. Just a raw dump.

Now: auto-capture sends to `/raw-capture`. The transcript goes to the inbox. The user reviews candidates, approves or dismisses them. Only then do blocks get saved.

Rejection and compaction events still go direct to `/capture-web` — those are immediate signals, not "maybe review later" data.

The total capture pipeline is now actually end-to-end:  
`Extension → /raw-capture → inbox → /confirm-candidates → blocks-data.json`

### Timeline view — Day zoom + all block types
Added Day zoom (Year / Month / Week / Day). Heatmap cells in Year view are now clickable — they drill into the selected month. Type pills now cover all 8 block types (intent, compaction, rejection included). Rejection dots get strikethrough styling. Stats bar now shows rejections and ideas count separately.

### Mobile companion — PWA + responsive view
Phase 1 of the mobile spec from `apr18-mobile-companion.md`.

On screens ≤768px:
- Feed goes full width, one column
- Right panel and toolbars hide
- FAB hides (replaced by bottom bar)
- Bottom bar appears: one textarea, one send button → memo goes to inbox via `/raw-capture`
- Offline fallback: memo pushed directly to liveBlocks so user never loses it

Manifest updated: correct start_url for GitHub Pages, dark background (#0e0e14), proper theme color.

### Seed quality trends
SVG sparkline in the right panel. Pulls all `_seedQuality` blocks, plots last 12 ratings as a line. Green = 3, yellow = 2, red = 1. Shows trend arrow (↑↓→) and average score. Only appears when ≥2 seed quality ratings exist.

---

## Day 5 decision

"The phone is a companion, not a second dashboard. Two things only: watch the live feed, drop a thought. Everything else stays on the desktop where you have the context to use it."

---

→ Related: `apr18-mobile-companion.md` — mobile product spec  
→ Related: `apr18-capture-everything.md` — total capture philosophy  
