# The Three Invisible Layers

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Discussion  
**Produced:** Discussion type (💬) · Trail type (🔗) · Thinking type (🫧) · Three-layer provenance architecture

---

## The conversation

It started with a metaphor — the Formula One car. An old person behind the wheel of a Formula One car. The car runs, it moves, but the engine is completely opaque. You see the output, not the machine.

That's what Claude looks like from the outside. You see the response. The reasoning that produced it — the deliberation, the trade-offs considered and rejected, the uncertainty — that disappears the moment the response generates.

The question that followed: *"In the Claude environment, there's nothing that actually shows us the real thinking, the real brain. Maybe there's something to brainstorm."*

---

## What we separated out

Current context seeding saves **outputs**: decisions, code, file paths, block summaries. What it loses is everything that made those outputs make sense. We named three distinct layers that are currently invisible:

---

### 💬 Discussion
The human ↔ AI conversation. The *why*. The back-and-forth that produced the idea before it became an idea.

A Discussion isn't a block — it's a narrative. It has a shape: what was being considered, what direction things went, what was rejected, what landed. It includes the decision that came out of it, and embedded directly in that narrative is the artifact that followed — the code, the config, the file. Not linked separately. Woven in, the way good technical writing works.

Format: diary/blog, not a card. Lives in Files. Beautiful enough to want to read. Dense enough to be useful.

When you feed a Discussion into a new session, the model understands the context. Not just "we used Remotion" but: we tried html2canvas first, it broke on custom fonts in Safari, we switched to Remotion, wrote PropertyReel.tsx as the base composition, and it worked first time. That's a completely different starting point.

---

### 🔗 Trail
The execution sequence. The *how*. What was actually done, in order.

A Trail isn't a summary — it's a log with context. What was tried first. What failed and why. What was adjusted. What the final artifact was. The git commits that followed. The files that changed.

Trails and Discussions reference each other bidirectionally. The Discussion says "this conversation led to these steps." The Trail says "these steps came from this reasoning." Together they give you the complete chain: why → how → what.

---

### 🫧 Thinking
The AI's internal reasoning. Currently completely invisible.

Anthropic's API already supports extended thinking — Claude generates reasoning tokens before responding. Those tokens contain the deliberation: what options were considered, what trade-offs were weighed, what was uncertain. Right now they're turned off or thrown away. Nobody captures them.

If Storyboard captured Thinking blocks — actual reasoning tokens from AI sessions — you'd have something no tool has: preserved deliberation. Not the conversation, not the output, but the *process of reasoning* that connects them.

---

## Why the separation matters

Discussion, Trail, and Thinking feel similar but they're distinct. Mixing them loses something:

- A Discussion without a Trail is philosophy without execution
- A Trail without a Discussion is a log without motivation
- Thinking without either is raw deliberation with no anchor

They're also captured differently. Discussion is compiled from conversation. Trail is compiled from actions and artifacts. Thinking is captured from model reasoning tokens. All three need to exist as linkable, seedable objects.

---

## The provenance stack

What we're building toward:

```
Thinking  →  Discussion  →  Decision  →  Trail  →  Artifact
(why the  →  (what was   →  (what was →  (how it →  (what
 AI went     discussed)     decided)     got done)   resulted)
 that way)
```

Feed that full chain into a new session and the model doesn't just know what was built. It understands it. It can extend it correctly. It can see where the reasoning was uncertain and ask the right questions.

Today we save the Decision and the Artifact. We've named the three layers we're losing. That's the work of Day 3.

---

## On the pitch

This is the real differentiator. Every tool in this space is trying to be a better notepad. Storyboard is building provenance infrastructure for AI work. The argument in one line:

*"Other tools save what you built. Storyboard saves why you built it, how you built it, and what the AI was thinking when you built it. That's a completely different quality of context — and it compounds every time you come back."*

→ See: `apr18-context-windows.md` for the fault line feature that made this visible  
→ See: `apr18-categories.md` for how this extends across projects
