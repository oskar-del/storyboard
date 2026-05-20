#!/usr/bin/env python3
"""
Storyboard Populate Script
Reads actual files from the AGENCY folder and generates storyboard-data.json + blocks-data.json
Run this at the end of any session to keep the storyboard accurate.

Usage:
  python3 populate_storyboard.py
  python3 populate_storyboard.py --inspect   # also run AI inspection pass
"""

import os
import json
import re
import argparse
from datetime import datetime
from pathlib import Path

# ── PATHS ────────────────────────────────────────────────────────────────────
AGENCY = Path("/sessions/wonderful-intelligent-pasteur/mnt/AGENCY ")
STORYBOARD = AGENCY / "storyboard"
OUT_DATA   = STORYBOARD / "storyboard-data.json"
OUT_BLOCKS = STORYBOARD / "blocks-data.json"
PROGRESSION = AGENCY / "Progression"
AUDIT_PROTO = AGENCY / "audit-protocol"
PRESENTATIONS = AGENCY / "Presentations"

# ── HELPERS ──────────────────────────────────────────────────────────────────
def read_file(path, max_lines=60):
    try:
        lines = Path(path).read_text(encoding="utf-8", errors="ignore").splitlines()
        return "\n".join(lines[:max_lines])
    except:
        return ""

def count_files(folder, exts=None):
    if not Path(folder).exists():
        return 0
    total = 0
    for f in Path(folder).rglob("*"):
        if f.is_file():
            if exts is None or f.suffix.lower() in exts:
                total += 1
    return total

def list_files(folder, exts=None, exclude=None):
    if not Path(folder).exists():
        return []
    results = []
    for f in sorted(Path(folder).glob("*")):
        if f.is_file():
            if exclude and any(x in f.name for x in exclude):
                continue
            if exts is None or f.suffix.lower() in exts:
                results.append(f.name)
    return results

def extract_status(progress_text):
    """Extract task status from PROGRESS.md content."""
    if "✅" in progress_text or "Complete" in progress_text:
        return "done"
    if "🟡" in progress_text or "In Progress" in progress_text or "in progress" in progress_text.lower():
        return "in_progress"
    return "not_started"

def extract_dates(progress_text):
    """Find dates mentioned in progress text."""
    dates = re.findall(r'April \d+[,\s]*\d{4}|Apr \d+|March \d+|Feb \d+|Jan \d+', progress_text)
    return dates[:3]

def extract_bullets(text, max=6):
    """Pull bullet point lines from markdown text."""
    lines = text.splitlines()
    bullets = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- ") or stripped.startswith("* "):
            bullets.append(stripped[2:].strip())
        if len(bullets) >= max:
            break
    return bullets

# ── SCAN PROGRESSION FOLDERS ─────────────────────────────────────────────────
def scan_progression():
    """Walk each Progression/N-Name/ folder and extract block data."""
    blocks = []
    if not PROGRESSION.exists():
        print("  ⚠️  No Progression folder found")
        return blocks

    for folder in sorted(PROGRESSION.iterdir()):
        if not folder.is_dir():
            continue

        name = folder.name  # e.g. "2-Opero-Landing-Page"
        num  = name.split("-")[0] if name[0].isdigit() else "?"
        label = " ".join(name.split("-")[1:])  # "Opero Landing Page"

        progress_text = read_file(folder / "PROGRESS.md")
        setup_text    = read_file(folder / "SETUP.md", max_lines=30)
        status = extract_status(progress_text)
        dates  = extract_dates(progress_text)
        files  = list_files(folder, exts={".html",".js",".py",".json",".md",".css"})
        bullets = extract_bullets(progress_text)

        # Determine project
        project = "Opero Agency"
        if "NBHCB" in label or "NewBuild" in label or "Costa" in label:
            project = "New Build Homes"
        elif "HH" in label or "Hansson" in label:
            project = "Hansson Hertzell"

        status_emoji = {"done":"✅","in_progress":"🟡","not_started":"🔴"}[status]

        block = {
            "id": f"prog-{num}",
            "type": "session",
            "source": "progression",
            "project": project,
            "track": num,
            "label": label,
            "date": dates[0] if dates else "Apr 2026",
            "ts": 20260400 + int(num) if num.isdigit() else 20260400,
            "title": f"Task {num} — {label}",
            "summary": bullets[0] if bullets else setup_text[:120],
            "status": status,
            "status_emoji": status_emoji,
            "chips": [f"Task {num}", status_emoji + " " + status.replace("_"," ").title()] + ([f"{len(files)} files"] if files else []),
            "decisions": bullets[:4],
            "files_in_folder": files,
            "raw_progress": progress_text[:500],
        }
        blocks.append(block)
        print(f"  {'✅' if status=='done' else '🔴'} Task {num}: {label} ({status})")

    return blocks

# ── SCAN AUDIT PROTOCOL ───────────────────────────────────────────────────────
def scan_audit_protocol():
    """Count client audit decks and extract the audit pipeline block."""
    if not AUDIT_PROTO.exists():
        return None

    decks = list_files(AUDIT_PROTO, exts={".pptx",".key"}, exclude=["TEMPLATE"])
    template = list_files(AUDIT_PROTO, exts={".pptx"})
    scripts = list_files(AUDIT_PROTO / "scripts", exts={".js",".py"}) if (AUDIT_PROTO/"scripts").exists() else []
    clients = [d.replace("Opero-Audit-","").replace("Opero-AgencyAudit-","").replace(".pptx","").replace(".key","") for d in decks]
    clients = [c for c in clients if c]

    print(f"  📋 Audit protocol: {len(clients)} client decks, {len(scripts)} scripts")
    return {
        "id": "op-audit-protocol",
        "type": "session",
        "source": "scan",
        "project": "Opero Agency",
        "date": "Apr 2026",
        "ts": 20260413,
        "title": f"Audit Pipeline — {len(clients)} clients · Template · Generator",
        "summary": f"Universal audit protocol. Template deck + scripts ({', '.join(scripts[:2])}). {len(clients)} client audits: {', '.join(clients[:6])}{'...' if len(clients)>6 else ''}.",
        "chips": [f"{len(clients)} clients", "Template", "Generator", "Audit protocol"],
        "decisions": [
            "Audit score on the cover — undeniable before the meeting starts",
            "Same template per client — repeatable and scalable",
            "Audit is the wedge — give it away to earn the retainer",
        ],
        "ideas": [
            "Universal audit: any website, any industry",
            f"Currently: {len(clients)} real estate agencies audited",
        ],
        "clients": clients,
        "scripts": scripts,
    }

# ── SCAN PRESENTATIONS FOLDER ─────────────────────────────────────────────────
def scan_presentations():
    """Categorise decks in the Presentations folder."""
    if not PRESENTATIONS.exists():
        return []

    all_decks = list_files(PRESENTATIONS, exts={".pptx",".key"})
    bd_decks  = [d for d in all_decks if "BD-Pitch" in d or "Pitch" in d]
    cs_decks  = [d for d in all_decks if "Case-Study" in d]
    audit_decks = [d for d in all_decks if "Audit" in d]
    other = [d for d in all_decks if d not in bd_decks + cs_decks + audit_decks]

    print(f"  🗂️  Presentations: {len(bd_decks)} BD pitches, {len(cs_decks)} case studies, {len(audit_decks)} audits, {len(other)} other")
    return {
        "total": len(all_decks),
        "bd_decks": bd_decks,
        "case_studies": cs_decks,
        "audit_decks": audit_decks,
        "other": other,
    }

# ── SCAN ROOT AGENCY FOLDER ───────────────────────────────────────────────────
def scan_agency_root():
    """Pick up key files in the AGENCY root that aren't in subfolders."""
    key_files = {}
    categories = {
        "brand":      ["logo","brand","linkedin-banner"],
        "concept":    ["concept","playbook","build-plan","OPERO-BUILD"],
        "outreach":   ["outreach","linkedin-copy"],
        "web":        [".html"],
        "decks":      [".pptx",".key"],
        "docs":       [".md"],
    }

    root_files = list_files(AGENCY, exts={".pptx",".key",".html",".md",".png",".svg",".pdf"})
    for cat, keywords in categories.items():
        matched = [f for f in root_files if any(k.lower() in f.lower() for k in keywords)]
        key_files[cat] = matched

    print(f"  📁 Root AGENCY: {len(root_files)} key files")
    return key_files

# ── INSPECT PASS ──────────────────────────────────────────────────────────────
def run_inspect(progression_blocks, audit_block, presentations):
    """Generate AI-utilization suggestions based on what's built vs. what's planned."""
    suggestions = []
    score = 100

    # Check unstarted tasks
    not_started = [b for b in progression_blocks if b["status"] == "not_started"]
    in_progress  = [b for b in progression_blocks if b["status"] == "in_progress"]
    done         = [b for b in progression_blocks if b["status"] == "done"]

    if not_started:
        score -= len(not_started) * 8
        for b in not_started:
            suggestions.append({
                "type": "gap",
                "severity": "high",
                "title": f"Task {b['track']} not started: {b['label']}",
                "text": f"This was planned but never executed. It could unlock significant value.",
                "action": f"Open the {b['label']} task window and reference SETUP.md to start.",
            })

    if in_progress:
        for b in in_progress:
            suggestions.append({
                "type": "warning",
                "severity": "medium",
                "title": f"Task {b['track']} in progress: {b['label']}",
                "text": "Started but not completed. Risk of context loss.",
                "action": "Finish this task before starting new ones.",
            })

    # Check audit count
    if audit_block and len(audit_block.get("clients",[])) < 5:
        score -= 10
        suggestions.append({
            "type": "opportunity",
            "severity": "medium",
            "title": "Audit pipeline underused",
            "text": f"Only {len(audit_block.get('clients',[]))} clients audited. The pipeline can generate audits for any agency in minutes.",
            "action": "Run the universal-audit-generator.js on 5 more target agencies this week.",
        })

    # Check for missing automation
    if not (AGENCY / "audit-protocol" / "scripts" / "universal-audit-generator.js").exists():
        score -= 15
        suggestions.append({
            "type": "gap",
            "severity": "high",
            "title": "Audit generator script missing",
            "text": "The universal audit generator was planned but not found.",
            "action": "Rebuild universal-audit-generator.js from the SKILL.md spec.",
        })

    # Check for missing web presence
    deployed = any("deploy" in str(b.get("raw_progress","")).lower() for b in progression_blocks)
    if not deployed:
        score -= 12
        suggestions.append({
            "type": "opportunity",
            "severity": "high",
            "title": "Nothing deployed publicly yet",
            "text": "opero.ai has no live public URL. The landing page and tools exist locally but no one can reach them.",
            "action": "Deploy opero-landing-mvp.html to Railway or Vercel. Takes 10 minutes.",
        })

    # Positive signals
    if len(done) > 0:
        suggestions.append({
            "type": "strength",
            "severity": "low",
            "title": f"{len(done)} of {len(progression_blocks)} tasks complete",
            "text": f"Completed: {', '.join(b['label'] for b in done)}.",
            "action": None,
        })

    if audit_block and len(audit_block.get("clients",[])) >= 8:
        suggestions.append({
            "type": "strength",
            "severity": "low",
            "title": f"Strong audit pipeline — {len(audit_block['clients'])} clients",
            "text": "This is a real competitive moat. Most agencies have zero systematic audit capability.",
            "action": "Deploy as a web tool — prospects could run it themselves.",
        })

    score = max(10, min(100, score))
    return {"score": score, "suggestions": suggestions}

# ── WRITE OUTPUT ──────────────────────────────────────────────────────────────
def write_outputs(progression_blocks, audit_block, presentations, root_files, inspect_result=None):
    now = datetime.now().isoformat()

    # storyboard-data.json (stats + ideas, dashboard reads this)
    existing = {}
    if OUT_DATA.exists():
        try:
            existing = json.loads(OUT_DATA.read_text())
        except:
            pass

    done_count = len([b for b in progression_blocks if b["status"] == "done"])
    total_count = len(progression_blocks)
    total_decks = presentations.get("total", 0) if isinstance(presentations, dict) else 0
    audit_clients = len(audit_block.get("clients", [])) if audit_block else 0

    data = {
        "last_updated": now,
        "generated_by": "populate_storyboard.py",
        "session_stats": {
            "progression_tasks_done": done_count,
            "progression_tasks_total": total_count,
            "audit_clients": audit_clients,
            "total_decks": total_decks,
            "files_built": existing.get("session_stats", {}).get("files_built", 0),
            "messages": existing.get("session_stats", {}).get("messages", 0),
        },
        "active_projects": list({b["project"] for b in progression_blocks}),
        "progression_summary": [
            {"track": b["track"], "label": b["label"], "status": b["status"], "project": b["project"]}
            for b in progression_blocks
        ],
        "recent_ideas": existing.get("recent_ideas", []),
        "recent_decisions": existing.get("recent_decisions", []),
        "recent_files": existing.get("recent_files", []),
        "inspect": inspect_result,
    }

    OUT_DATA.write_text(json.dumps(data, indent=2))
    print(f"\n✅ Written: {OUT_DATA}")

    # blocks-data.json (the actual block definitions for the dashboard)
    all_blocks = progression_blocks[:]
    if audit_block:
        all_blocks.append(audit_block)

    OUT_BLOCKS.write_text(json.dumps(all_blocks, indent=2))
    print(f"✅ Written: {OUT_BLOCKS}")

    return data

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Populate Storyboard from real files")
    parser.add_argument("--inspect", action="store_true", help="Run AI utilization inspection pass")
    parser.add_argument("--no-write", action="store_true", help="Dry run — don't write files")
    args = parser.parse_args()

    print("\n🎬 Storyboard Populate\n" + "─"*40)

    print("\n📂 Scanning Progression folders...")
    progression_blocks = scan_progression()

    print("\n📋 Scanning Audit Protocol...")
    audit_block = scan_audit_protocol()

    print("\n🗂️  Scanning Presentations...")
    presentations = scan_presentations()

    print("\n📁 Scanning AGENCY root...")
    root_files = scan_agency_root()

    inspect_result = None
    if args.inspect:
        print("\n🔍 Running Inspect pass...")
        inspect_result = run_inspect(progression_blocks, audit_block, presentations)
        score = inspect_result["score"]
        print(f"\n   AI Utilization Score: {score}/100")
        for s in inspect_result["suggestions"]:
            icon = {"gap":"❌","warning":"⚠️","opportunity":"💡","strength":"✅"}.get(s["type"],"•")
            print(f"   {icon} {s['title']}")

    if not args.no_write:
        data = write_outputs(progression_blocks, audit_block, presentations, root_files, inspect_result)

    # Print summary
    done = [b for b in progression_blocks if b["status"]=="done"]
    waiting = [b for b in progression_blocks if b["status"]=="not_started"]
    print(f"\n📊 Summary")
    print(f"   Tasks done:        {len(done)}/{len(progression_blocks)}")
    print(f"   Tasks not started: {len(waiting)}")
    if audit_block:
        print(f"   Audit clients:     {len(audit_block.get('clients',[]))}")
    if isinstance(presentations, dict):
        print(f"   Total decks:       {presentations.get('total',0)}")
    print(f"\n✅ Done. Open storyboard/index.html to see the updated dashboard.")
    print(f"   Run with --inspect to get AI utilization suggestions.\n")

if __name__ == "__main__":
    main()
