#!/bin/bash
# One-time setup: initialise git + push storyboard to GitHub
# Run this from Terminal: cd ~/Documents/AI/AGENCY\ /storyboard && bash push-to-github.sh

set -e

cd "$(dirname "$0")"

echo "→ Initialising git repo..."
git init
git add -A
git commit -m "Storyboard v3 — visual AI memory dashboard

- App shell: left nav, masonry grid, board/canvas/list views
- Canvas view: project card grid with live Blocks/Decisions/Ideas/Autos counts
- OS/AI mode toggle (white vs dark theme, localStorage persist)
- Period tab filtering + time lanes (Today/This week/Older)
- FOCUS card in nav (most active project, pulsing live dot)
- Right panel: Seed Next Chat, Flag This Moment, Today's work, Recent Decisions, Ideas
- Decisions nav item with live count + decisions filter view
- Roadmap overlay: fullscreen iframe per project (Map → button)
- MCP server: stdio tools + HTTP screenshot receiver (port 3847) + PWA static server (port 3848)
- PWA manifest + icons (192/512/180px) — installable to home screen
- blocks-data.json polled every 10s for real-time MCP updates
- Auto-screenshot via html2canvas on every new live block

Built in Cowork mode during a 10-day sprint."

echo ""
echo "→ Creating GitHub repo and pushing..."
# Requires GitHub CLI (gh) — install with: brew install gh
gh repo create storyboard --public --description "Visual AI work memory dashboard — blocks, decisions, ideas, automations" --source=. --remote=origin --push

echo ""
echo "✅ Done! Repo live at: https://github.com/oskar-del/storyboard"
