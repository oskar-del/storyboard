# Capture Everything — The Right Architecture

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Decision  
**Status:** Locked — shapes Day 4 build  
**Produced:** Total capture architecture · Processing layer spec · Review inbox concept

---

## The decision

Don't ask users to categorize at capture time. Capture everything raw. Process it afterward. Let the user decide what to keep.

This is the right architecture because:
- Categorization friction at capture time kills capture rate
- The most important things (rejections, passing ideas, nuanced decisions) are exactly the things you don't stop to document
- AI is good at extraction — give it the raw material and it finds the structure
- "Decide what to keep" is a much lighter cognitive task than "decide what to capture"

---

## The four-step flow

**Step 1 — Capture everything**  
Extension grabs the full conversation stream continuously. No friction. No choosing a type. 60+ turns captured on every new AI response. Raw text goes to Storyboard via `/raw-capture` endpoint.

**Step 2 — Process**  
MCP server sends raw transcript to Claude API with an extraction prompt. 3-second call. Returns structured blocks: decisions, ideas, rejections, intent, key moments.

**Step 3 — Review inbox**  
Dashboard shows unprocessed captures: "12 items extracted from your session." User scrolls through, approves or dismisses each with one click. Approved items become permanent blocks.

**Step 4 — Story assembly**  
Approved blocks auto-assemble into a Discussion document. The narrative of what happened builds itself. User edits if needed but doesn't have to write from scratch.

---

## What this means for the product

The current model: Storyboard is a structured note-taking tool that happens to be AI-assisted.

The new model: Storyboard is a total capture layer that builds the story from raw material.

These are fundamentally different value propositions. The second one is 10x more powerful because it requires zero discipline to use. You just keep talking. The product does the rest.

---

## The extraction prompt structure

When processing a raw transcript, Claude is asked to return:

```json
{
  "decisions": ["We decided to use 'Carry forward →' instead of 'Seed'", ...],
  "ideas": ["What if we had a morning brief view that shows yesterday's blocks", ...],
  "rejections": [{"title": "Morning brief", "reason": "Doesn't communicate the action", "replacedBy": "Carry forward →"}],
  "intent": "Build the visual intent layer for AI work — context windows end, intent doesn't",
  "keyMoments": ["User returned from gym with the Memory/Canvas/Intent framing", ...]
}
```

Each extracted item becomes a candidate block in the review inbox.

---

## The review inbox UX

- Appears as a badge count in the topbar: "📥 8 unreviewed"
- Clicking opens a review overlay
- Each item shows: type (decision/idea/rejection), extracted text, source context
- Actions: ✓ Keep (becomes a block) · ✕ Dismiss · ✏ Edit before keeping
- "Keep all" button for quick approval
- "Build discussion" button assembles approved items into a narrative doc

---

## What's already built vs. what's missing

**Already there:**
- Extension captures 60 turns on each message
- `/capture-web` endpoint stores raw discussions
- Block types: decision, idea, rejection, session, intent, compaction

**Needs building (Day 4):**
- `/process-transcript` endpoint — takes raw text, calls Claude API, returns extracted blocks
- Raw capture store — `raw-captures.json` separate from blocks-data.json
- Review inbox UI in dashboard — badge, overlay, approve/dismiss flow
- Story assembly — auto-generate Discussion doc from approved blocks
- API key handling — ANTHROPIC_API_KEY in mcp-server.js environment

---

## The pitch line

"You keep talking. Storyboard keeps score."

Or: "Total capture. AI-assembled story. You just approve what matters."

---

→ Related: apr18-gap-analysis.md (conversation auto-capture was the biggest gap)  
→ Related: apr18-three-layers.md (Discussion layer is now auto-generated)
