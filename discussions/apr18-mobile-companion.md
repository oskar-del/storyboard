# Mobile — Companion, Not Dashboard

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Decision  
**Status:** Locked — shapes mobile product spec  
**Produced:** Mobile product definition · Two-screen app spec · Feed architecture

---

## The decision

Mobile is not a second dashboard. It's a companion to the desktop.

Two things only:
1. **Live feed** — a read view of what's happening in your AI sessions. Blocks appear as they're captured. You see the project unfolding in real time even when you're not at your desk.
2. **Quick memo** — drop a thought in 5 seconds. Because you always have your phone with you.

That's the whole product. Anything more than that is scope creep.

---

## Why this framing is right

The desktop dashboard is where you work. The phone is where you live.

You're at lunch and an insight hits you. You're walking between meetings and you realize why the product architecture was wrong. You're in the gym and you suddenly understand the positioning.

None of those moments happen at a desk. But all of them are exactly the kind of thing Storyboard is built to capture.

The phone solves the between-session gap. Not by giving you the full product — by giving you the minimum viable surface to stay connected and drop a thought before it's gone.

---

## The live feed

The feed is essentially a read-only version of the dashboard's block stream. Blocks appear as the MCP server writes them — decisions, ideas, session markers, context fault lines. You see the project building in real time.

This is actually a powerful thing: you can watch your AI session from your phone while it's running on your desktop. See decisions get logged. See when context compaction happens. Stay aware without switching windows.

**Technical path:** Mobile polls `/blocks` endpoint on the MCP server (already built on Day 4). If MCP server is local, it requires the phone to be on the same WiFi network. Cloud sync (future) removes that constraint.

---

## The memo capture

One text field. One button. That's it.

No project selection (infer from last active project). No type selection (let the inbox sort it out). No formatting. Just: what's on your mind right now?

Memo goes to the review inbox via `/raw-capture`. Processed with everything else when you sit back down.

---

## What the mobile app is NOT

- Not a block editor
- Not a seed generator
- Not a settings panel
- Not a search interface
- Not a project manager

All of that lives on the desktop where you have the context and the keyboard to use it properly.

---

## Build order

Phase 1 (PWA — fastest path): 
- Add a mobile-optimized view to the existing dashboard (responsive breakpoint)
- `/blocks` endpoint already serves the feed
- Quick capture already built as in-session widget
- PWA manifest already exists (manifest.json)

Phase 2 (native app):
- iOS/Android with push notifications
- "Your session is running" notification when MCP server detects active capture
- Background sync when on same WiFi

---

## The pitch line

"The desktop is where you build. The phone is where you watch it happen."

Or: "Your AI sessions, in your pocket. Drop a thought. Keep building."

---

→ Related: apr18-capture-everything.md (same "capture everything, decide later" principle)  
→ Related: apr18-gap-analysis.md (between-session capture was a gap)
