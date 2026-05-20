#!/usr/bin/env python3
"""
Storyboard Idea Capture
Saves a single idea to storyboard-data.json mid-session.
Usage: python3 capture_idea.py --project "Storyboard" --idea "The idea text" --ts "Apr 17"
"""

import json
import os
import sys
import argparse
from datetime import datetime

DATA_FILE = "/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/storyboard-data.json"
IDEAS_LOG = "/sessions/wonderful-intelligent-pasteur/mnt/AGENCY /storyboard/ideas.jsonl"

def capture(project, idea_text, ts=None):
    ts = ts or datetime.now().strftime("%b %d")

    # Append to the rolling ideas log (never lost)
    idea = {"ts": ts, "project": project, "text": idea_text, "captured_at": datetime.now().isoformat()}

    with open(IDEAS_LOG, 'a') as f:
        f.write(json.dumps(idea) + "\n")

    # Update storyboard-data.json
    data = {}
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)
        except:
            pass

    if "recent_ideas" not in data:
        data["recent_ideas"] = []

    # Prepend new idea (most recent first)
    data["recent_ideas"].insert(0, {"ts": ts, "text": idea_text, "project": project})
    data["recent_ideas"] = data["recent_ideas"][:20]  # keep last 20
    data["last_idea_capture"] = datetime.now().isoformat()

    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"💡 Captured: {idea_text[:80]}{'...' if len(idea_text) > 80 else ''}")
    return idea

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Capture an idea to the Storyboard')
    parser.add_argument('--project', required=True, help='Project name')
    parser.add_argument('--idea', required=True, help='Idea text')
    parser.add_argument('--ts', help='Timestamp (e.g. "Apr 17")')
    args = parser.parse_args()

    capture(args.project, args.idea, args.ts)
