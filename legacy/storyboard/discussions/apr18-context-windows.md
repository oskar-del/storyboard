# Context Windows — Making the Invisible Visible

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Discussion  
**Produced:** Context fault lines · Fill meter · Last-in-context badge · Seed trail · Gap warning

---

## The conversation

The context window problem had been talked about in abstract — "context windows end, your project doesn't" — but it wasn't actually *visible* anywhere in the dashboard. You'd come back to Storyboard and see blocks, but nothing told you where one session ended and another began. The breaks were invisible.

The question that kicked it off: *"Can we feel when the context window has run out and visually have like a line... which box was actually working when the context window ran out?"*

That's a design problem, not a data problem. The data was already there — every session block has a timestamp. The question was how to make the boundary a physical thing you can see.

---

## What we decided

**Context fault lines.** Session blocks don't render as cards anymore. They render as full-width horizontal dividers — a timeline with a fill bar that shows how full the context was when it ended. The endpoint pulses red. You can literally see the pressure that was building.

**Five features that unlock:**

1. **Context fill meter in the topbar** — a progress bar showing roughly how full the current session is. Time-based (75min = full) plus a block count boost. Turns amber at 60%, red at 85%.

2. **📍 Last-in-context badge** — the final block captured before a context window ended gets a small purple pill: "last in context." You can see exactly what was alive when the window ran out.

3. **Seed trail** — the fault line shows which blocks were used to resume the next session. A connector: "seeded with → [Dashboard v4 snapshot] [App shell] → thread continues." The chain of survival is visible.

4. **Depth markers** — every block before a fault line gets a color-coded depth indicator. Green = captured early in the session. Amber = mid-session. Red pip = "near limit." You can see the context filling up as you scroll backward through time.

5. **⚠️ Gap warning** — when a session started with no seed, the fault line shows a red strip: "No seed used — this thread may have drifted." An honest admission that continuity may have broken.

---

## Why it matters

The context window isn't a technical limitation to hide. It's a *fact of the medium* that should be made legible. Every other tool pretends sessions are continuous. Storyboard makes the breaks visible, makes them navigable, and makes the cost of not seeding visible too.

When you look at the feed now and see the fault lines, you understand something about how this product was built that you couldn't see before. That's the whole point.

---

## What this opened up

Making context windows visible led directly to a bigger question: what actually gets *lost* at those fault lines? Not just "the context" in the abstract — but specifically: the discussion that produced the ideas, the execution trail that followed them, and the reasoning that was happening inside the model. Those three layers became the next conversation.

→ See: `apr18-three-layers.md`
