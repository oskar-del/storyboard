#!/bin/bash
# Run this from Terminal to push Day 5 changes
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock
git add app.html browser-extension/content.js browser-extension/manifest.json browser-extension/popup.html index.html manifest.json pitch.html discussions/apr18-day5-build-log.md
git commit -m "Day 5 — extension v0.4, timeline day zoom, mobile PWA, seed quality trends"
git push
echo "✅ Day 5 pushed."
