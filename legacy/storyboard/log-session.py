#!/usr/bin/env python3
"""
log-session.py — log any session to the Storyboard dashboard.

Works from ANY Cowork session (Opero, Storyboard, anything).
Posts a block to the MCP server which merges it into the dashboard live.

Usage:
  python3 log-session.py \
    --project "Opero" \
    --task "valuation-engine" \
    --title "PropertyOS valuation PDF — v6 with Casafari data" \
    --summary "Built 6 iterations of the valuation PDF..." \
    --decisions "Use ReportLab for PDF generation" "Casafari data is the source" \
    --ideas "Add mortgage calculator section" \
    --type session

Falls back to writing session-log.json directly if MCP server is offline.
"""

import json, argparse, os, sys, datetime, hashlib, urllib.request, urllib.error

MCP_URL      = "http://localhost:3847/log-session"
LOG_FILE     = os.path.join(os.path.dirname(__file__), "session-log.json")

def main():
    parser = argparse.ArgumentParser(description="Log a session to Storyboard")
    parser.add_argument("--project",   required=True,  help="Board name, e.g. 'Opero'")
    parser.add_argument("--task",      default="",     help="Story/task name, e.g. 'valuation-engine'")
    parser.add_argument("--title",     required=True,  help="Session title")
    parser.add_argument("--summary",   default="",     help="What happened / what was built")
    parser.add_argument("--decisions", nargs="*", default=[], help="Key decisions made")
    parser.add_argument("--ideas",     nargs="*", default=[], help="Ideas captured")
    parser.add_argument("--chips",     nargs="*", default=[], help="Tags/chips")
    parser.add_argument("--type",      default="session",
                        choices=["session","idea","decision","compaction","design","discussion"],
                        help="Block type")
    args = parser.parse_args()

    now = datetime.datetime.now()
    ts  = int(now.strftime("%Y%m%d"))
    uid = hashlib.md5(f"{args.project}{args.title}{now.isoformat()}".encode()).hexdigest()[:8]

    block = {
        "id":        f"log-{args.project.lower().replace(' ','-')}-{uid}",
        "type":      args.type,
        "project":   args.project,
        "task":      args.task,
        "title":     args.title[:120],
        "summary":   args.summary,
        "decisions": args.decisions,
        "ideas":     args.ideas,
        "chips":     args.chips,
        "date":      now.strftime("%-d %b"),
        "ts":        ts,
        "_source":   "session-log",
        "_logged":   now.isoformat(),
    }

    # Try MCP server first (live update in dashboard)
    try:
        data = json.dumps(block).encode("utf-8")
        req  = urllib.request.Request(MCP_URL, data=data,
                                      headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            result = json.loads(resp.read())
            print(f"✓ Logged live → {args.project} / {args.title[:60]}")
            print(f"  Block ID: {result.get('id', block['id'])}")
            return
    except urllib.error.URLError:
        pass  # MCP offline — fall through to file write

    # Fallback: write directly to session-log.json
    try:
        with open(LOG_FILE, "r") as f:
            existing = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing = []

    existing = [b for b in existing if b["id"] != block["id"]]
    existing.append(block)

    with open(LOG_FILE, "w") as f:
        json.dump(existing, f, indent=2)

    print(f"✓ Logged to file → {args.project} / {args.title[:60]}")
    print(f"  (MCP offline — will appear in dashboard next time server is live)")

if __name__ == "__main__":
    main()
