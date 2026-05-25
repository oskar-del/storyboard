#!/bin/bash
# Day 10 final push — run from Terminal:
# cd ~/Documents/AI/AGENCY\ /storyboard && bash GIT_PUSH_DAY10_FINAL.sh

set -e
cd "$(dirname "$0")"

echo "→ Clearing stale lock files..."
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null || true

echo "→ Staging changes..."
git add app.html index.html STORYBOARD-LOGGER-SKILL.md log-session.py

echo "→ Committing..."
git commit -m "Autonomous session: T3 board task-window columns, T5 compaction dividers, dynamic sprint pill, Day 10 landing page complete, Opero logger skill"

echo "→ Pushing..."
git push

echo ""
echo "✅ Sprint complete — live at: https://oskar-del.github.io/storyboard/"
echo "   Dashboard:    https://oskar-del.github.io/storyboard/app.html"
echo "   Landing page: https://oskar-del.github.io/storyboard/index.html"
