---
name: storyboard
description: Context stitcher and idea capture for Storyboard. Use when the user says /storyboard, "seed new chat", "flag this moment", "save my context", "I'm losing context", "start fresh chat", "what have we built", "capture this idea", or when the context window is filling up. Also triggers when the user says an idea keyword like "idea:", "what if", "we should", "wouldn't it be cool if". This skill reads real session data and generates a complete seed prompt so the next chat starts with full memory.
---

# Storyboard — Context Stitcher Skill

This skill does two things:
1. **Context Stitcher** — generates a full seed prompt from real session data when a chat is ending or context is full
2. **Idea Capture** — saves ideas to the storyboard JSON so they appear on the dashboard

---

## When to activate

- User says `/storyboard`, "seed new chat", "flag this moment"
- User says "I'm losing context", "start fresh", "new chat"  
- Context window is filling up (> 80% through long session)
- User expresses an idea: "idea:", "what if we", "wouldn't it be great", "we should build"
- User asks "what have we done", "where are we", "summarize progress"

---

## Step 1 — Read current state

```bash
# Read persistent memory
cat /sessions/wonderful-intelligent-pasteur/mnt/.auto-memory/MEMORY.md

# Read live storyboard data if it exists
cat /sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/storyboard-data.json 2>/dev/null || echo "No live data yet"
```

Then read any memory files relevant to the current conversation's projects.

---

## Step 2 — Run the seed generator

```bash
cd /sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard
python3 generate_seed.py
```

This will:
- Find the most recent session JSONL file
- Parse it for decisions, ideas, files built, and current focus
- Generate a structured seed prompt
- Save the seed to `seed_output.md`
- Update `storyboard-data.json` with new data

---

## Step 3 — Output the seed prompt

Read `seed_output.md` and present it to the user in a clean code block:

```
Here's your session seed — paste this at the start of your next chat:

[SEED PROMPT CONTENT]
```

Tell the user: "Copy this → open a new chat → paste it. Your next Claude will start with full context."

---

## Idea Capture Protocol

When an idea is detected mid-session:

1. Extract the idea text (clean it up, make it one punchy sentence)
2. Determine which project it belongs to
3. Run:
```bash
python3 /sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/capture_idea.py \
  --project "PROJECT_NAME" \
  --idea "THE IDEA TEXT" \
  --ts "$(date +'%b %d')"
```
4. Confirm to user: "💡 Captured: [idea text]"

Do NOT interrupt the flow of work to capture ideas — do it silently and confirm in one line.

---

## Flag This Moment

When user says "flag this moment" or clicks the flag button:

1. Capture the current moment as a decision checkpoint:
   - What was just decided or completed
   - Why it matters
   - What's next
2. Append to `storyboard-data.json` under the active project's decision_list
3. Confirm: "🚩 Flagged — this moment is saved to your storyboard."

---

## Seed Prompt Format

The generated seed prompt should follow this structure:

```markdown
# Session Seed — [Project Name] — [Date]

## Who I am / What we're building
[1-2 sentences on the user and their work]

## Active Projects
[bullet list with status and key facts for each project]

## What we just completed
[bullet list of the last session's key outputs]

## Decisions that must carry forward
[numbered list of the most important decisions]

## Floating ideas (don't lose these)
[bullet list of captured ideas]

## Immediate next steps
[numbered list, in priority order]

## Context
- Model: Sonnet 4.6 (use Opus for hard architecture decisions only)
- Sprint: 10-day Storyboard build — Day X of 10
- Files to check: [key files relevant to next task]
```

---

## Rules

- Never summarize vaguely. Be specific: file names, commit counts, exact decisions.
- Keep the seed under 800 words — it needs to fit cleanly at the top of a new chat.
- Always end with "Immediate next steps" — the user needs to be able to pick up without re-explaining anything.
- If this is an idea capture, don't disrupt the work. One line confirmation only.
