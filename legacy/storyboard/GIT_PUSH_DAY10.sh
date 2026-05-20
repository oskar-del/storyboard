#!/bin/bash
# Day 10 push — run from Terminal:
# cd ~/Documents/AI/AGENCY\ /storyboard && bash GIT_PUSH_DAY10.sh

set -e
cd "$(dirname "$0")"

echo "→ Staging Day 10 changes..."
git add app.html

echo "→ Committing..."
git commit -m "Day 10: Visual diff fixes — Sprint card, toggle pill container, T7 right panel 260px + Decisions"

echo "→ Pushing to GitHub..."
git push

echo ""
echo "✅ Day 10 live at: https://oskar-del.github.io/storyboard/app.html"
