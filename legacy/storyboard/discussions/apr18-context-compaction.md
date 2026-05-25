# Context Compaction — The Problem We're Solving, Live

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Discussion  
**Status:** Product insight — captured mid-sprint  
**Produced:** Compaction anatomy · What's lost · Storyboard's answer · Feature spec for compaction events

---

## What just happened

Day 3 of the Storyboard sprint. Midway through the session, the context window filled and Claude automatically compacted the conversation into a summary. The user noticed and asked: "What is actually happening? What are we losing?"

This is Storyboard's origin story, happening in real time.

---

## What compaction is

When an AI session reaches its context limit, the model summarizes everything before a cutoff point and discards the raw conversation. From that point on, Claude works from the summary, not the original.

The summary is good. It captures the decisions, the features built, the files changed. But it is output-level — a condensed log of what happened, not a record of how or why.

---

## What's lost in compaction

**1. The texture of decisions**
A decision that took 30 minutes of back-and-forth appears in the summary as one sentence. The rejected alternatives, the "no not that" corrections, the exact moment a direction clicked — gone.

Example from this session: "Carry forward →" as the seed button label came from a long thread through "Morning brief" (rejected immediately), "Seed", "Continue", before landing on "Carry forward." The summary records the decision. It doesn't record the rejection of three alternatives, or why "Carry" resonated.

**2. Wrong turns that shaped the right answer**
The most important learning in a session is often "we tried X, it broke because Y, so we did Z instead." Summaries flatten this. The wrong turn disappears. Future sessions lose the context for why Z exists.

**3. The emotional and intentional arc**
"I just got back from the gym and I've been thinking about the core product..." vs "Intent was identified as a core concept." Both are true. Only one captures the moment of arrival that made it matter.

**4. The compaction point itself**
There's no marker. No event. No "fault line." The conversation just continues as if nothing happened. But something happened — the entire raw session before that point is no longer reachable.

**5. Meta-session events**
The conversation about building Storyboard, inside Storyboard, is itself disappearing into summaries. The recursion is real.

---

## Why this is more than a problem

Compaction events are exactly what Storyboard should make visible. The context fault line we built for Claude's context window filling — that's the same idea. Compaction is a fault line inside the project's memory, not just inside a single session.

If Storyboard could detect or mark compaction events, users would see:
- When it happened
- What session was being compacted
- What was captured before compaction vs. what was summarized
- A prompt: "Was anything important lost? Capture it now."

---

## Feature spec: Compaction Events

**Block type:** `compaction` (alongside session, decision, idea, intent)

**What triggers it:** Manually flagged by user, or detected via session length + timestamp patterns

**What it stores:**
- Session length at compaction (approx. block count / time)
- User-written note: "What we lost that mattered"
- Link to the Discussion document that preceded it
- Carry-forward context: what should seed the next session to compensate

**Visual:** Similar to the context fault line — a horizontal marker in the feed — but styled differently. Grey not red. "Memory compressed" instead of "Context filled." With a "What was lost?" note field inline.

**Why it matters for seeding:**
A seed that includes "the conversation was compacted at [time] — the main things lost were [note]" is dramatically better than a seed that pretends nothing happened.

---

## The pitch angle

Every investor who uses Claude has experienced compaction. Most of them don't have a name for it. The moment you show them a compaction event on a fault line — visible, named, time-stamped — they recognize it immediately.

"We didn't just solve context windows ending. We also solved the memory loss that happens inside long sessions."

---

## What this means for the sprint

1. Add `compaction` as a block type in `capturedIdeas`
2. Show a compaction event marker in the feed when manually flagged
3. Add "What was lost?" note field to compaction blocks
4. Include compaction notes in seed output as a special section
5. The Discussion + Trail layer is the insurance against compaction

---

→ Related: apr18-day3-build-log.md (fault line design)  
→ Related: apr18-journey-architecture.md (Three Invisible Layers)
