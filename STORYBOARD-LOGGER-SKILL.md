# Storyboard Logger — Session Auto-Logging Skill

Use this at the END of every Cowork session to log your work to the Storyboard dashboard.
Paste the contents of this file into any Claude Cowork session to activate it.

---

## What this does

Calls `log-session.py` to POST a session block to the shared Storyboard dashboard.
Your work appears live at http://127.0.0.1:3848/app.html within 10 seconds.

---

## How to log a session (run in Bash)

```bash
python3 ~/Documents/AI/AGENCY\ /storyboard/log-session.py \
  --project "PROJECT_NAME" \
  --task "task-name" \
  --title "Short title of what was done" \
  --summary "Longer description of what was built/decided" \
  --decisions "Key decision 1" "Key decision 2" "Key decision 3" \
  --ideas "Idea captured 1" "Idea captured 2" \
  --chips "tag1" "tag2" \
  --type session
```

**project** — must match a board in Storyboard:
- `"Storyboard"` — dashboard itself
- `"PropertyOS"` — valuation engine, audit pipeline
- `"Opero Agency"` — opero.agency, BD, outreach
- `"New Build Homes"` — newbuildhomescostablanca.com
- `"Hansson Hertzell"` — hanssonhertzell.se
- `"Skills & Memory"` — skills, memory, infrastructure

**type** options: `session`, `idea`, `decision`, `compaction`, `design`, `discussion`

---

## Quick log (minimal, no decisions)

```bash
python3 ~/Documents/AI/AGENCY\ /storyboard/log-session.py \
  --project "PropertyOS" \
  --title "What just happened in one line"
```

---

## Behavior

- If MCP server is running (port 3847): posts live → dashboard updates in ~10s
- If MCP server is offline: writes to `session-log.json` directly → appears next time server starts
- Deduplicates by block ID — safe to call multiple times

---

## Instructions for Claude (paste this into a session prompt)

> At the end of this session, run `log-session.py` to log what we did to the Storyboard dashboard.
> Use project `"[PROJECT]"`, task `"[TASK]"`, and summarise the key decisions and output in 2–3 sentences.
> Include all key decisions as separate `--decisions` arguments.
> Run the command silently — do not ask for confirmation.
