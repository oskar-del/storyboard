#!/usr/bin/env python3
"""
Storyboard Seed Generator
Reads the current Cowork session JSONL, extracts decisions/ideas/files,
generates a seed prompt for a new chat, updates storyboard-data.json
"""

import json
import os
import re
import glob
from datetime import datetime
from pathlib import Path

# ── CONFIG ──────────────────────────────────────────────────────
SESSIONS_DIR = "/sessions/wonderful-intelligent-pasteur/mnt/.claude/projects/-sessions-wonderful-intelligent-pasteur"
STORYBOARD_DIR = "/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard"
MEMORY_FILE = "/sessions/wonderful-intelligent-pasteur/mnt/.auto-memory/MEMORY.md"
OUTPUT_FILE = os.path.join(STORYBOARD_DIR, "seed_output.md")
DATA_FILE = os.path.join(STORYBOARD_DIR, "storyboard-data.json")

# Keywords that signal an idea was captured
IDEA_KEYWORDS = ["idea:", "what if", "we should", "wouldn't it be", "we could", "imagine if", "💡"]

# Keywords that signal a decision was made
DECISION_KEYWORDS = ["decided", "decision:", "we'll use", "going with", "confirmed:", "locked in", "✅"]

# ── FIND LATEST SESSION ──────────────────────────────────────────
def find_latest_session():
    jsonl_files = glob.glob(os.path.join(SESSIONS_DIR, "*.jsonl"))
    if not jsonl_files:
        print(f"No JSONL files found in {SESSIONS_DIR}")
        return None
    # Sort by file size (largest = most activity = main session)
    return max(jsonl_files, key=os.path.getsize)

# ── PARSE SESSION ────────────────────────────────────────────────
def parse_session(filepath, max_lines=5000):
    """Parse JSONL session file, return structured data"""
    messages = []
    tool_uses = []
    files_written = set()

    print(f"Parsing: {os.path.basename(filepath)}")

    with open(filepath, 'r', errors='ignore') as f:
        for i, line in enumerate(f):
            if i > max_lines:
                break
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                msg_type = obj.get('type', '')

                if msg_type == 'user':
                    content = obj.get('message', {}).get('content', '')
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get('type') == 'text':
                                messages.append({'role': 'user', 'text': block.get('text', '')[:500]})
                    elif isinstance(content, str) and content.strip():
                        messages.append({'role': 'user', 'text': content[:500]})

                elif msg_type == 'assistant':
                    content = obj.get('message', {}).get('content', '')
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict):
                                if block.get('type') == 'text':
                                    messages.append({'role': 'assistant', 'text': block.get('text', '')[:300]})
                                elif block.get('type') == 'tool_use':
                                    tool_name = block.get('name', '')
                                    tool_input = block.get('input', {})
                                    tool_uses.append({'tool': tool_name, 'input': tool_input})

                                    # Detect file writes
                                    if tool_name in ['Write', 'Edit'] and 'file_path' in tool_input:
                                        fp = tool_input['file_path']
                                        # Only count files in user's workspace
                                        if 'AGENCY' in fp or 'mnt' in fp:
                                            files_written.add(os.path.basename(fp))
                    elif isinstance(content, str):
                        messages.append({'role': 'assistant', 'text': content[:300]})

            except (json.JSONDecodeError, KeyError):
                continue

    return messages, tool_uses, list(files_written)

# ── EXTRACT INSIGHTS ─────────────────────────────────────────────
def extract_ideas(messages):
    ideas = []
    for msg in messages:
        if msg['role'] in ('user', 'assistant'):
            text = msg['text'].lower()
            for kw in IDEA_KEYWORDS:
                if kw.lower() in text:
                    # Get the sentence containing the keyword
                    sentences = msg['text'].split('.')
                    for s in sentences:
                        if kw.lower() in s.lower() and len(s.strip()) > 20:
                            clean = s.strip()[:150]
                            if clean not in [i['text'] for i in ideas]:
                                ideas.append({'text': clean, 'ts': datetime.now().strftime('%b %d')})
                    break
    return ideas[:10]

def extract_decisions(messages):
    decisions = []
    for msg in messages:
        if msg['role'] == 'assistant':
            text = msg['text']
            for kw in DECISION_KEYWORDS:
                if kw.lower() in text.lower():
                    sentences = text.split('.')
                    for s in sentences:
                        if kw.lower() in s.lower() and len(s.strip()) > 15:
                            clean = s.strip()[:150]
                            if clean not in [d['text'] for d in decisions]:
                                decisions.append({'text': clean, 'ts': datetime.now().strftime('%b %d')})
                    break
    return decisions[:8]

def extract_projects(messages):
    """Identify which projects were active"""
    project_keywords = {
        "New Build Homes": ["newbuild", "new build", "costa blanca", "property", "xml feed", "remotion", "netlify"],
        "Storyboard": ["storyboard", "context stitcher", "seed", "session memory", "idea capture"],
        "Opero Agency": ["opero", "agency", "audit", "client", "linkedin", "pitch deck"],
        "Curated Estate": ["curated", "audit.py", "aeo", "journal", "100/100"],
        "PropertyOS": ["propertyos", "valuation", "catastro", "flask", "pisos.com"],
        "Skills & Memory": ["skill", "memory", "claude.md", "memory.md"],
    }

    all_text = ' '.join([m['text'].lower() for m in messages])
    active = []
    for project, keywords in project_keywords.items():
        if any(kw in all_text for kw in keywords):
            active.append(project)
    return active

# ── LOAD MEMORY ──────────────────────────────────────────────────
def load_memory():
    try:
        with open(MEMORY_FILE, 'r') as f:
            return f.read()
    except FileNotFoundError:
        return ""

# ── GENERATE SEED PROMPT ─────────────────────────────────────────
def generate_seed(messages, tool_uses, files_written, ideas, decisions, active_projects):
    today = datetime.now().strftime('%B %d, %Y')

    # Count stats
    user_msgs = len([m for m in messages if m['role'] == 'user'])
    tool_count = len(tool_uses)

    # Determine current focus from recent messages
    recent = messages[-20:] if len(messages) > 20 else messages
    recent_text = ' '.join([m['text'] for m in recent if m['role'] == 'user'])

    # Build the seed
    seed = f"""# Storyboard Session Seed — {today}

## Context
You are continuing work with **Oskar** (oskar@hanssonhertzell.com), a serial entrepreneur and AI-first builder based in Spain.

- **Model:** Use Sonnet 4.6 for building/coding. Use Opus 4.6 in a fresh window for hard architecture decisions only.
- **Sprint:** 10-day Storyboard MVP build (Day started Apr 17, 2026)
- **Session stats:** ~{user_msgs} messages, {tool_count} tool uses, {len(files_written)} files written

---

## Active Projects

"""

    project_summaries = {
        "New Build Homes": "Next.js 14 real estate site — 9 languages, 1,124 commits, live. newbuildhomescostablanca.com",
        "Storyboard": "Visual memory layer for AI work. MVP = visual dashboard + context stitcher. Building now.",
        "Opero Agency": "AI growth agency. opero.ai. Audit-as-wedge model.",
        "Curated Estate": "AEO content audit tool. 46 checks. All 20 articles at 100/100.",
        "PropertyOS": "Property valuation engine + map. Catastro API. SaaS play.",
        "Skills & Memory": "Auto-memory system, Cowork skills, session continuity.",
    }

    for proj in (active_projects if active_projects else list(project_summaries.keys())):
        if proj in project_summaries:
            seed += f"- **{proj}:** {project_summaries[proj]}\n"

    seed += "\n---\n\n## Key Decisions (carry these forward)\n\n"

    # Always include the core Storyboard decisions
    core_decisions = [
        "Build Storyboard Cowork-native first — hook infrastructure exists, no Chrome extension needed for v1",
        "Storyboard MVP = visual board + context stitcher. Two features. Ship fast.",
        "Sonnet 4.6 for the sprint. Opus only for hard architecture, in a separate window.",
        "New Build Homes: 1,124 commits, Dec 28 2025 → Apr 9 2026, 15,417 tracked files",
        "Curated Estate: 100/100 for all 20 journal articles — non-negotiable",
    ]

    for i, d in enumerate(core_decisions, 1):
        seed += f"{i}. {d}\n"

    if decisions:
        seed += "\n**From this session:**\n"
        for d in decisions[:4]:
            seed += f"- {d['text']}\n"

    seed += "\n---\n\n## Files Built This Session\n\n"

    if files_written:
        for f in sorted(files_written)[:15]:
            seed += f"- `{f}`\n"
    else:
        seed += "- storyboard/index.html (full dashboard v2 — light theme, drill-down navigation)\n"
        seed += "- storyboard/SKILL.md (context stitcher Cowork skill)\n"
        seed += "- storyboard/generate_seed.py (this script)\n"

    seed += "\n---\n\n## Floating Ideas (don't lose these)\n\n"

    core_ideas = [
        "Bidirectional context bridge — board feeds context BACK into the AI, not just captures from it",
        "Model Advisor — dashboard recommends Haiku/Sonnet/Opus based on actual task type",
        "Pinterest/masonry view as a third view mode — visual, free-floating cards",
        "Persona-based themes — designer gets different aesthetic than Fortune 500 enterprise",
        "Thumbnail screenshots for shared storyboards — local files → screenshots → shareable previews",
        "Company Brain — 1000 employees' AI work → single intelligent organism",
    ]

    for idea in core_ideas:
        seed += f"- {idea}\n"

    if ideas:
        for idea in ideas[:3]:
            seed += f"- {idea['text']}\n"

    seed += "\n---\n\n## Immediate Next Steps\n\n"
    seed += """1. **Build `capture_idea.py`** — idea capture script (saves to storyboard-data.json)
2. **Wire dashboard to storyboard-data.json** — make it live instead of hardcoded
3. **Create .skill file** — package the context stitcher for Cowork installation
4. **Build the idea-capture skill** — auto-detect idea keywords, save silently
5. **Session: New Build Homes** — Remotion video reels are next after Storyboard MVP

---

*Generated by Storyboard Seed Generator · {today}*
""".format(today=today)

    return seed

# ── UPDATE STORYBOARD DATA ────────────────────────────────────────
def update_storyboard_data(active_projects, ideas, decisions, files_written, messages):
    """Update the live JSON data file that the dashboard reads"""

    # Load existing data if available
    existing = {}
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                existing = json.load(f)
        except:
            pass

    data = {
        "last_updated": datetime.now().isoformat(),
        "session_stats": {
            "messages": len([m for m in messages if m['role'] == 'user']),
            "tool_uses": len(messages),  # approximate
            "files_built": len(files_written),
            "ideas_captured": len(ideas),
        },
        "active_projects": active_projects,
        "recent_ideas": ideas[:6],
        "recent_decisions": decisions[:5],
        "recent_files": sorted(files_written)[:10],
    }

    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Updated storyboard-data.json")
    return data

# ── MAIN ─────────────────────────────────────────────────────────
def main():
    print("\n🎬 Storyboard Seed Generator\n")

    # Find session
    session_file = find_latest_session()
    if not session_file:
        print("❌ No session file found")
        return

    file_size_mb = os.path.getsize(session_file) / (1024 * 1024)
    print(f"📄 Session: {os.path.basename(session_file)} ({file_size_mb:.1f} MB)")

    # Parse (limit to last 5000 lines for speed)
    messages, tool_uses, files_written = parse_session(session_file, max_lines=5000)
    print(f"💬 Messages: {len(messages)}, Tools: {len(tool_uses)}, Files: {len(files_written)}")

    # Extract insights
    ideas = extract_ideas(messages)
    decisions = extract_decisions(messages)
    active_projects = extract_projects(messages)

    print(f"💡 Ideas found: {len(ideas)}")
    print(f"✅ Decisions found: {len(decisions)}")
    print(f"🗂️  Active projects: {', '.join(active_projects) if active_projects else 'All'}")

    # Generate seed
    seed = generate_seed(messages, tool_uses, files_written, ideas, decisions, active_projects)

    # Write seed output
    with open(OUTPUT_FILE, 'w') as f:
        f.write(seed)
    print(f"\n✅ Seed written to: {OUTPUT_FILE}")

    # Update live data
    update_storyboard_data(active_projects, ideas, decisions, files_written, messages)

    # Print the seed
    print("\n" + "="*60)
    print("SEED PROMPT (copy this into your next chat):")
    print("="*60)
    print(seed)
    print("="*60)

if __name__ == "__main__":
    main()
