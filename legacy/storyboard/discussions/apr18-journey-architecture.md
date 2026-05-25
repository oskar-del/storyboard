# Journey Architecture — Two Tracks, Six Entry Paths

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Discussion  
**Status:** Architecture locked — build when landing page ships  
**Produced:** Journey selector concept · Two-track onboarding model

---

## The insight

Storyboard means different things to different people. A running business connecting MCPs is not the same person as someone who just wants to stop losing their Claude conversations. Sending them both to the same dashboard is the wrong move. The first screen should ask: *who are you and what are you trying to do?*

Two tracks. Six journeys. One product.

---

## BUSINESS TRACK

For teams and founders operating with AI at a business level.

### 🏢 Running business
*"I have a business. I want to connect AI to it properly."*

Already operational. Wants to: connect MCPs to real workflows, structure memory across teams, automate repeatable processes, stop losing context between sessions. This is the power-user B2B story.

Setup: connect data sources → map workflows → start capturing decisions.

### 🚀 New business
*"I'm starting something. I need AI as my co-founder."*

The "Founder from zero" journey. Charles Protocol territory. Daily briefing, company setup checklist, step-by-step from idea to operating business. First 90 days fully scaffolded.

Setup: pick your idea → get a Genesis prompt → daily plan from day one.

### 💰 Selling / exiting
*"I'm preparing to sell. I need everything documented."*

Due diligence is a paper trail problem. Storyboard captures every decision, every context window, every automation built. By the time you're in a sale process, you have a complete provenance record of how the business was run.

Setup: audit view → decision log → export-ready documentation.

---

## INDIVIDUAL TRACK

For people using AI as a personal tool — not necessarily running a business.

### 💡 Side project
*"I'm building something. I want to track it."*

A developer, designer, or creator working on a project alongside a day job. Context windows end. Projects span months. Storyboard keeps the thread alive between sessions.

Setup: create project → start capturing → seed the next session.

### 🧠 Power user
*"I use AI constantly. I want a proper operating system for it."*

Someone who already has a system — multiple tools, multiple contexts, multiple workflows. Wants to pull it all together into one memory layer.

Setup: connect all sources → map your stack → full MCP integration.

### 💬 Just tracking chats
*"I don't want to lose my conversations. That's it."*

The lowest-friction entry point. Browser extension captures every chat. Nothing is lost. No setup. Start here, grow into more when it clicks.

Setup: install extension → it works → nothing to configure.

---

## Why this matters for the product

The "just tracking chats" journey is the acquisition hook. It's the easiest yes. Someone installs the extension, loses nothing, and eventually opens the dashboard to see what got captured — and discovers the rest.

The "running business" journey is the revenue story. MCPs, team workflows, structured memory at an organizational level. That's where pricing scales.

The "new business" journey is the narrative story. It's what you show investors. A person going from idea to operating business with AI — and Storyboard is the operating system underneath it.

---

## Landing page structure

First screen: **Business** or **Individual**?

Second screen: pick your specific journey (3 cards per track).

Third screen: one-sentence setup for that path — what you'll have in 5 minutes.

Then: the dashboard, pre-configured for that journey. Not a blank slate.

The current dashboard with the "Your Journey" tab strip is the prototype of this. The full version should start *before* the dashboard — it's the onboarding that shapes what you see when you get there.

---

## Not building now

The landing page journey selector is a Day 5-7 build — after core features are solid. What we're capturing here is:

1. The two-track model is the right architecture
2. "Just tracking chats" is the entry hook
3. "New business / Charles" is the narrative hook  
4. "Running business" is the revenue hook
5. These three are the pitch trifecta

→ Related: apr18-charles-journey.md — the "Founder from zero" journey in depth  
→ Related: pitch.html — the investor deck that needs this framework built in
