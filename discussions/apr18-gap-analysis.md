# Gap Analysis — What Storyboard Is Not Capturing

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Discussion  
**Status:** Critical — shapes Day 4+ build priorities  
**Produced:** Full gap inventory · Four invisible layers (updated) · Auto-capture architecture · Build order

---

## The core finding

Storyboard captures the skeleton but not the connective tissue. The three invisible layers were named correctly on Day 2. The gap: none of them are auto-captured yet. Every Discussion doc in this project was written manually. The compaction event was flagged manually, after the fact, only because the user noticed it.

A product built to prevent invisible memory loss has invisible memory loss.

---

## The four invisible layers (updated)

Day 2 named three: Discussion, Trail, Thinking. There's a fourth.

**Discussion 💬 — The WHY**  
The conversation that produced a decision. The back-and-forth, the corrections, the moment something clicked. Currently: written manually as markdown files after the session.

**Trail 🔗 — The HOW**  
Execution sequence. What was tried first, what broke, what worked. Currently: written manually.

**Thinking 🫧 — The AI's reasoning**  
Extended thinking tokens — the internal reasoning before the response. The moat. Currently: not captured at all.

**Rejection ❌ — The path not taken**  
What was explicitly considered and discarded, and why. This is the dark matter of decision-making. Every decision has a shadow of rejected alternatives. Without it, future sessions don't know why the current path was chosen — they might re-suggest what was already dismissed.

Example: "Carry forward →" as the seed button label went through "Morning brief" (rejected immediately — user: "that makes no sense"), "Seed" (too technical), "Continue" (too generic) before landing. The summary recorded "Carry forward" as the decision. The rejections are gone.

The rejections ARE part of the Discussion layer but important enough to track explicitly. A Rejection block has: what was proposed, who rejected it, why, and what replaced it.

---

## The full gap inventory

### Events not detected
- **Compaction events** — context is summarized mid-session, raw conversation replaced. Invisible until the user notices. (Just proved this.)
- **Context approaching limit** — we show the fill meter visually but don't auto-capture "session approaching limit" as a block event
- **Significant time gaps** — user was at the gym for 90 minutes. That gap has meaning: thinking happened offline, energy state changed. Storyboard doesn't know it happened.
- **Mode shifts** — user transitions from building → brainstorming → deciding. Each mode produces different output. Not tracked.

### Content not captured
- **The conversation itself** — every message the user types is an intent signal. "Don't ask me, just build." "The messaging will be easier when the product is more complete." These are the clearest expressions of intent in the whole system. Currently invisible.
- **Rejections** — paths not taken, ideas dismissed, corrections given. The negative space of decisions.
- **Thinking tokens** — AI's internal reasoning before responses. The moat. Requires Anthropic API extended thinking parameter.
- **Between-session thoughts** — "when I went to sleep I was thinking about Charles Protocol." This thinking shaped the next session. Storyboard has no channel for it.

### Metadata not tracked
- **Seed quality** — when a session starts with a seed, did it work? Did the AI reconstruct context correctly, or did it drift? No feedback loop.
- **Decision confidence** — was this settled or tentative? A decision made at 2am in 30 seconds is different from one that took 3 days of iteration.
- **Block dependencies** — this decision blocks that feature. This idea depends on that infrastructure. Currently flat, no dependency graph.
- **What was explicitly NOT done** — "we're not building the onboarding flow this sprint" is as important as what was built.

### Cross-session continuity
- **Seed history** — what seeds were used to start each session? Were they good? Did they miss anything?
- **Compaction notes** — what was in the conversation when it was compacted? What note was left?
- **Drift detection** — over many sessions, does the AI's understanding of the project drift? Storyboard should surface drift.

---

## Why rejections are the most important gap

Every AI session produces the same failure mode: the AI re-suggests something that was already dismissed, because the dismissal wasn't in the seed. The user has to say "we already tried that" and explain why it didn't work. This is pure wasted context.

A Rejection block in the seed changes the dynamic entirely: "We considered X and explicitly rejected it because Y. Don't re-suggest X." This is a fundamentally different kind of memory than decisions and ideas.

Rejection blocks are also where the product's real intelligence lives. Over 10 sprints, a project accumulates 50 decisions and 200 rejections. The ratio tells you everything about the quality of thinking.

---

## Auto-capture architecture

The path to capturing the conversation automatically:

**Browser extension — DOM capture**  
The extension already runs on claude.ai. It can read the conversation DOM — user messages + AI responses. On each new AI response, it could auto-capture: user prompt → AI response → any visible tool calls. This is the Discussion layer built automatically.

**Rejection trigger**  
When the user sends a message containing "no", "don't", "that doesn't", "we already", "I said" — flag it as a potential rejection. Show a toast: "Capture this as a rejection?" One click → Rejection block saved with the dismissed idea + reason.

**Compaction detection**  
When a conversation resumes after a long gap (>2 hours), show a prompt: "Did this session compact? Add a note about what was lost." Or: detect the summary-start pattern in the DOM and auto-flag it.

**Seed quality loop**  
After each session, a prompt: "How well did the seed reconstruct context?" 1-5 stars. Store with the session block. Over time, surface which seed patterns produce good reconstruction.

**Thinking token capture**  
Requires API access (not UI). When the product moves to API-based capture, pass `thinking: { type: "enabled", budget_tokens: 5000 }`. Store the thinking blocks as separate Thinking layer entries, linked to the response that produced them.

---

## Build order

**Immediate (Day 4):**
1. Browser extension: auto-capture conversation transcript into Discussion blocks
2. Rejection block type + rejection trigger (pattern matching on user messages)
3. Compaction prompt when session resumes after long gap

**Near-term (Day 5-6):**
4. Seed quality rating (post-session prompt)
5. "Between sessions" capture — a simple note field on the project page: "Thought of something offline?"
6. Explicit "not doing" blocks — a way to mark something as deliberately out of scope

**Later:**
7. Thinking token capture via API
8. Drift detection across sessions
9. Dependency graph between blocks

---

## The pitch angle

Every product that works with AI has these gaps. Nobody has named them. Nobody has surfaced them.

"We capture what your AI sessions produce. We also capture what they reject, what they miss, what gets compressed, and what you thought of in the shower. That's the full provenance chain."

The hardcore users — the ones who care about this — are exactly the early adopters who will evangelize it. The gap analysis IS the product roadmap.

---

→ Related: apr18-context-compaction.md  
→ Related: apr18-three-layers.md  
→ Related: apr18-journey-architecture.md
