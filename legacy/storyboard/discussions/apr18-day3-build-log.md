# Day 3 Build Log — Fault Lines, Color Cleanup & Pitch Upgrade

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Trail  
**Status:** Complete  
**Produced:** Fault line redesign · p.bg color cleanup · pitch.html v2 · /seed-by-category endpoint · category badge on blocks

---

## What got built today (Day 3)

### 1. Context fault line — full bleed finish line

**The problem:** The fault line card was constrained to the feed column width. It looked like a note card, not a structural marker.

**The insight:** A context window ending is an EVENT — like a finish line, not a Post-it. It should feel like the whole screen is acknowledging the transition.

**The solution:** `width: calc(100% + 32px); margin-left: -16px` — breaks out of the feed padding and spans wall to wall. The Re-seed button lives ON the line itself, right edge, not below it. Session info moves into a `ctx-fault-body` below the line.

**Visual result:** A red-tinged horizontal "finish line" across the full main area. When you see it, you know the context filled. When you click Re-seed, you continue from exactly that point.

This is now the hero visual of the whole product — the moment that makes the problem *visible*.

---

### 2. Light color bleed — systematic cleanup

**The problem:** `p.bg` (project pastel backgrounds like `#eef2ff`) was leaking into dark mode via JS template literals. It appeared in: journal entry icons, board columns, canvas cards, detail overlay chips.

**The fix:** Every `p.bg` in a JS template literal was replaced with either:
- `projBg(projName)` — the dark-aware function that returns `rgba(108,99,255,.07)` in dark mode
- `p.color` with opacity suffix (e.g. `${p.color}12`) for borders and accents

**CSS fallbacks also fixed:** `--card-bg` and `--col-bg` now default to dark rgba values, not light pastels.

**Result:** Zero `p.bg` remaining in JS output. Dark mode is clean end-to-end.

---

### 3. Period filter bug — renderJournalView

**The problem:** Clicking "Today" or "This week" on a project view had no effect — it showed all blocks regardless.

**The fix:** `renderJournalView()` now reads `periodTs()` and filters `projBlocks` against it. Added empty state ("No activity today — project started [date]") and pinned origin block at bottom so the project's start point stays visible even when the filter excludes it.

---

### 4. Category view — cross-project intelligence surface

**What it is:** A new nav view (◈ Categories) that groups all blocks by inferred work type — SEO, Content, Dev, Marketing, Legal, Client, Automation.

**The compounding argument:** The 10th SEO campaign benefits from the 9 before it, even if they're across different projects. The Categories view makes that cross-project pattern visible. It's the Storyboard moat made tangible.

**How it works:** `getBlockCategory(b)` uses `CAT_KEYWORDS` — keyword inference against block title + content + note. No AI call. Fast, works offline.

**What it shows:** Per-category card grids, insight strips ("4 projects · 23 blocks"), ◈ badge count in nav, Seed All button for each category.

---

### 5. Overview strip — Today / Velocity / Sprint

**Three panels shown when viewing All/all-time/grid:**

- **Today card:** Session, decision, idea count for today. Last 4 recent activity rows with type icons.
- **Velocity card:** 7-week bar chart showing weekly block count. Green/red vs. last week.
- **Sprint card:** Day tracker (dots for each sprint day), score (blocks+decisions+sessions formula), next-up items, seed button.

Sprint day calculated from Apr 17 start date.

---

### 6. Pitch deck — v2 (11 slides)

**What changed:**
- S3: Three Invisible Layers — Discussion (WHY), Trail (HOW), Thinking (AI's reasoning). This replaces the generic Capture/Canvas/Seed slide. The moat is now visible.
- S4: Journey Architecture — two tracks, six paths. Business (Running/Starting/Selling) + Individual (Side project/Power/Track chats). The pitch trifecta: acquisition hook / revenue hook / narrative hook.
- S5 (was S4 Moat): Added thinking tokens and cross-project compounding ("10th campaign benefits from 9 before it").
- S6 (was S5 Product): Updated mock to show context fault line, Categories view, blocks with Discussion/Trail/Thinking markers.
- S9 Traction: Updated to Day 3, 24+ features, updated description.
- S10 Roadmap: Days 1-3 now accurately reflects what's built. Days 4-7 includes cross-project seeding and thinking token capture.

---

### 7. /seed-by-category endpoint — mcp-server.js

**What it does:** Cross-project context seeding filtered by work type.

**Request:** `POST /seed-by-category` with `{ category, project, limit, includeThinking }`

**Response:** Formatted seed string grouped by project, with compounding insight footer for multi-project seeds:
```
═══ STORYBOARD SEED · SEO ═══
Generated: 18 Apr 2026 · 23 blocks across 3 projects
...
═══ CROSS-PROJECT INSIGHT ═══
These 23 SEO blocks span 3 projects.
The 10th SEO session benefits from the 9 before it — across all projects.
```

---

### 8. Category badge on block cards

**What:** Subtle `◈ SEO` or `◈ Dev` badge in the block-meta row, next to the project name. Only shown when a block has a non-General category.

**Why:** Makes the cross-project intelligence visible at the block level — you see the work type without opening the block. Reinforces the Categories view.

---

## The narrative arc now

The product tells a clear story:

1. **Problem:** AI session amnesia — re-explain, re-decide, re-discover
2. **Three invisible layers:** The WHY, the HOW, the AI's own reasoning — all captured
3. **Journey architecture:** Who it's for, and the pitch trifecta
4. **Moat:** Cross-model + thinking tokens + cross-project compounding
5. **Product:** Categories view + fault line as hero visual

The fault line is the emotional hook. The three invisible layers is the intellectual hook. The pitch trifecta is the commercial hook.

---

→ Related: apr18-journey-architecture.md  
→ Related: apr18-charles-journey.md  
→ Related: pitch.html (updated today)
