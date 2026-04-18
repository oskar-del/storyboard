# Storyboard: Feature Inventory (Days 1–4)

**Document Date:** April 18, 2026  
**Sprint:** 10-day sprint, Days 1–4 complete  
**Purpose:** Internal tracking and marketing narrative development

---

## Executive Summary

**Total Features Built:** 41  
**Core Features:** 24  
**Supporting Features:** 17  

### What Storyboard Actually Is

Storyboard is an AI-native memory layer that transforms fleeting insights into persistent context. Every time you work with Claude—whether you're shipping features, testing ideas, or exploring dead-ends—the browser extension auto-captures your conversation and processes it into structured decision records, ideas, rejections, and intent statements. You never lose a thought. More importantly, you never repeat a mistake. When you start a new AI session, Storyboard seeds your context with exactly what Claude needs to know: what you've already decided, what you've already tried (and ruled out), and what you're actually building. The product compresses scattered AI conversations into a coherent narrative, making the invisible work visible, turning AI iteration loops into actionable memory, and turning memory into multiplying returns on every new session.

---

## CAPTURE LAYER
*Automatic and frictionless collection of raw AI conversation data*

**Browser Extension Auto-Capture** — Every time Claude responds, the extension captures 60 turns without requiring any action from you. Runs in background, zero clicks needed.  
*Campaign angle: "60 turns of memory, zero friction"* — Core

**Rejection Detection** — 14 regex patterns detect explicit rejections ("scratch that," "that doesn't work," "never mind") and automatically save the rejected path separately for later analysis.  
*Campaign angle: "The 'dead ends' you forgot matter more than the wins"* — Core

**Compaction Detection** — Detects when Claude's context was compressed mid-session (visible as turn count drop) and flags these invisible memory boundaries for later review.  
*Campaign angle: "Surfaces where AI context breaks—before you hit that wall again"* — Supporting

**Quick Thought Capture** — FAB button, one text field, five seconds—rapid-fire note capture that goes directly to the inbox for later processing.  
*Campaign angle: "Capture in real-time, process when it matters"* — Supporting

**Raw Capture Store** — Every single conversation is stored in raw transcript format before processing, preserving full fidelity for later re-extraction.  
*Campaign angle: "Nothing is ever lost"* — Core

**/capture-web Endpoint** — Receive conversation blocks from any AI tool tab through a simple HTTP endpoint—not just Claude, extensible to other AI systems.  
*Campaign angle: "Works with your whole AI stack"* — Supporting

---

## PROCESSING LAYER
*Intelligent extraction and structured storage of decision signals*

**Review Inbox** — Unprocessed captures surface as candidates in a review interface. Approve or dismiss each one in batch—the gating function before anything becomes permanent.  
*Campaign angle: "One-click approval turns ephemeral chat into permanent record"* — Core

**AI Extraction (Claude Haiku)** — Raw transcripts are sent to Claude Haiku API for semantic analysis—extracts decisions, ideas, rejections (with context), intent statements, and key moments automatically.  
*Campaign angle: "AI reads your work. You read what matters."* — Core

**Local Pattern Extraction** — When no API key is configured, client-side regex extraction finds decisions, ideas, and rejections entirely offline. Full functionality, no server dependency.  
*Campaign angle: "Works offline. Privacy by default."* — Core

**Confirm Candidates** — Approved items become permanent blocks and auto-generate a Discussion doc entry, creating the narrative instantly.  
*Campaign angle: "Approval = permanence + narrative"* — Supporting

---

## MEMORY LAYER—BLOCKS
*Persistent, visual record of thinking across all states*

**Decision Blocks** — Green check mark. The anchor points: what was decided and why. The north star of your work.  
*Campaign angle: "Green=decided. Red=tried&ruled out. Amber=might matter."* — Core

**Idea Blocks** — Amber color. The half-formed thoughts, speculative angles, and "what-if" territory. Captured for later refinement.  
*Campaign angle: "Every 'what if' survives to be refined, not forgotten"* — Core

**Rejection Blocks** — Red strikethrough text. The fourth invisible layer that most tools never capture—what was tried and ruled out, with the reasoning intact.  
*Campaign angle: "Your 'nos' are as valuable as your yeses"* — Core

**Intent Blocks** — Rose gradient. The north star statement—what this project is actually for, preserved and visible from every angle.  
*Campaign angle: "Intent stays centered while everything else evolves"* — Core

**Compaction Blocks** — Grey divider line. Surfaces the invisible memory compression events—where context was reset and why.  
*Campaign angle: "See the seams in your thinking. Don't cross them blind."* — Supporting

**Session Blocks / Context Fault Lines** — Full-width timeline dividers showing where each context window ended. Visible architecture of your work's continuity.  
*Campaign angle: "The shape of your work, made visible"* — Supporting

**Seed Quality Rating** — After using a seed in a new session, rate it 🟢/🟡/🔴. Tracks whether context seeding actually worked, feeding data back to the system.  
*Campaign angle: "Learn which memories accelerate and which ones slow you down"* — Supporting

---

## CONTEXT / SEEDING
*Carry structured context forward into new AI sessions*

**Seed Modal** — Structured context brief. Intent leads, decisions, ideas, rejections (with strikethrough), raw text toggle. Clean, scannable format for AI consumption.  
*Campaign angle: "Context made readable. For humans and for Claude."* — Core

**"Do NOT Re-Suggest" Section** — Rejected ideas surface explicitly in the seed prompt so Claude doesn't circle back to already-ruled-out territory.  
*Campaign angle: "Never repeat a 'no' you've already made"* — Core

**Carry Forward →** — One-click seed the current project context into a new AI session. The entire working memory transfers.  
*Campaign angle: "Start tomorrow where you ended today"* — Core

**Seed by Category** — Cross-project context seeding by work type (SEO, Dev, Marketing, etc.). Reuse decisions and rejections across similar work.  
*Campaign angle: "Your patterns compound across projects"* — Supporting

**Context Fill Meter** — Topbar bar that estimates how full the current context window is, turns red at 85% capacity. Visual indicator before you hit the wall.  
*Campaign angle: "See context overflow before it breaks your work"* — Supporting

**Context Windows View** — All sessions displayed as numbered chapters—the visible architecture of your work's continuity and scope.  
*Campaign angle: "Your work told as chapters, not isolated chat boxes"* — Supporting

---

## DASHBOARD / UI
*Visual interface for navigating and understanding memory*

**Dark Mode Default** — Dark is the baseline, light is opt-in. Designed for people who live in AI tools and terminals.  
*Campaign angle: "Built for the tools you actually use"* — Supporting

**Category View** — Cross-project blocks grouped by work type (SEO, Dev, Marketing, Content). See patterns across your entire work landscape.  
*Campaign angle: "See what you're building across everything, all at once"* — Supporting

**Files View** — Discussion and Trail docs presented in a reading overlay—the narrative behind every block, preserved and searchable.  
*Campaign angle: "The story your blocks tell, told back to you"* — Supporting

**Velocity Chart** — Weekly block count with green/red delta. Are you building faster or slower? Trend line visible over 8-week rolling window.  
*Campaign angle: "See if your AI work is actually accelerating"* — Supporting

**Overview Strip** — Topbar at-a-glance: today's block count, velocity delta, sprint progress, context window status.  
*Campaign angle: "Your productivity in 4 numbers"* — Supporting

**Block Scroll Animations** — Blocks slide in as you scroll. The feed feels alive, not static.  
*Campaign angle: "Even your memory feels responsive"* — Supporting

**Search** — Full-text search across all blocks, projects, types. Find any decision, idea, or rejection in milliseconds.  
*Campaign angle: "Never lose a thought again. Find it in seconds."* — Core

**Light/Dark Toggle** — Simple topbar toggle between dark and light modes.  
*Campaign angle: "Match your environment"* — Supporting

**Journey Selector** — On first load, pick your context: Running a business / Starting / Selling / Side project / Power user / Track chats. Customizes onboarding and default views.  
*Campaign angle: "We remember what you're building from day one"* — Supporting

---

## SETTINGS / INFRASTRUCTURE
*Plumbing and configuration that makes the system reliable*

**Settings Overlay** — Paste Anthropic API key for semantic extraction. Stored in localStorage. Never leaves your machine.  
*Campaign angle: "Your keys stay yours"* — Supporting

**API Key Priority Chain** — Environment variable → client-side key → local extraction fallback. Always works, always private.  
*Campaign angle: "Works online or offline. Your choice."* — Core

**Server Auto-Start** — launchd plist + install script. Server starts automatically on Mac login.  
*Campaign angle: "Set it once, runs forever"* — Supporting

**/blocks Endpoint** — Dashboard polls MCP directly, works from GitHub Pages or file:// URLs. Pure HTTP, no auth required for local use.  
*Campaign angle: "Your memory is accessible everywhere"* — Core

**Status Indicator** — Topbar dot showing live/idle/server-off status based on direct MCP ping.  
*Campaign angle: "Always know if your memory is listening"* — Supporting

**Claude Design Export** — On any Discussion doc, formats content as a Claude Design prompt and copies to clipboard. One-click prep for sharing context.  
*Campaign angle: "Share your reasoning as shareable prompts"* — Supporting

---

## PITCH / MARKETING ASSETS
*Narrative and presentation materials*

**pitch.html** — 11-slide investor deck. Core narrative: memory compounds when it persists; traditional note-taking doesn't scale with AI velocity; Storyboard is the memory layer for AI-native work.  
*Campaign angle: "The 100x AI multiplier only compounds if the memory holds"* — Core

**index.html** — Landing page with journey track selector, waitlist signup, live sprint log (Days 1–4 visible).  
*Campaign angle: "Built in public. Launching in public."* — Core

**11 Discussion Docs** — The product's story told in its own format. Each doc captures a phase, a decision, a rejection, or an intent. Marketing artifacts that are also design records.  
*Campaign angle: "We use what we built to tell you what we built"* — Core

**Velocity Framing** — Messaging pillar: "The 100x AI multiplier only compounds if the memory holds."  
*Campaign angle: "Memory × Velocity = Multiplying Returns"* — Core

---

## FEATURE TAXONOMY

### By Type

| Type | Count |
|------|-------|
| Capture | 6 |
| Processing | 4 |
| Memory/Blocks | 7 |
| Seeding/Context | 6 |
| UI/Dashboard | 9 |
| Settings/Infra | 6 |
| Pitch/Assets | 4 |
| **Total** | **41** |

### By Classification

| Classification | Count |
|---|---|
| Core Features | 24 |
| Supporting Features | 17 |

---

## Core Features (Product Narrative)

These 24 features form the product story:

1. Browser Extension Auto-Capture
2. Rejection Detection
3. Raw Capture Store
4. Review Inbox
5. AI Extraction (Claude Haiku)
6. Local Pattern Extraction
7. Decision Blocks
8. Idea Blocks
9. Rejection Blocks
10. Intent Blocks
11. Seed Modal
12. "Do NOT Re-Suggest" Section
13. Carry Forward →
14. Search
15. API Key Priority Chain
16. /blocks Endpoint
17. pitch.html
18. index.html
19. 11 Discussion Docs
20. Velocity Framing
21. Confirm Candidates
22. Quick Thought Capture
23. /capture-web Endpoint
24. Dark Mode Default

---

## Supporting Features (Real, Not Headline)

These 17 features enable the core, improve UX, or extend capability:

1. Compaction Detection
2. Compaction Blocks
3. Session Blocks / Context Fault Lines
4. Seed Quality Rating
5. Seed by Category
6. Context Fill Meter
7. Context Windows View
8. Category View
9. Files View
10. Velocity Chart
11. Overview Strip
12. Block Scroll Animations
13. Light/Dark Toggle
14. Journey Selector
15. Settings Overlay
16. Server Auto-Start
17. Status Indicator
18. Claude Design Export

---

## Notes on Feature Status

**Complete and Shipped (Days 1–4):**
- All capture and processing features operational
- All memory block types live and rendering
- Seeding modal, carry-forward mechanism, and seed category filtering complete
- Dashboard core UI (dark mode, category view, search) operational
- Settings overlay and API infrastructure in place
- Landing page and pitch deck live
- 11 Discussion docs published

**Next Phase (Day 5–10):**
- Velocity chart refinement and rolling trend analysis
- Context fill meter calibration
- Seed quality rating feedback loop
- Category-based seeding refinement
- Light mode polish and theme transitions
- Advanced search filters and saved searches

---

## Marketing Priority Order

1. **Memory compounding** (pitch.html + velocity framing) — Why this exists
2. **Rejection as value** (rejection blocks + "Do NOT Re-Suggest") — What makes it different
3. **Carry forward context** (carry forward → + seed modal) — What it feels like to use
4. **Never lose a thought** (search + raw capture store) — Safety/reliability promise
5. **Works offline** (local pattern extraction + API priority chain) — Privacy + availability

---

**Document Version:** 1.0  
**Last Updated:** April 18, 2026  
**Authored by:** Storyboard Team (Sprint Day 4)
