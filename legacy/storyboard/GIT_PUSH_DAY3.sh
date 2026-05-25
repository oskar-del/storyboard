#!/bin/bash
# Run this from Terminal to push Day 3 changes
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock
git add app.html browser-extension/content.js mcp-server.js index.html manifest.json pitch.html discussions/ blocks-data.json raw-captures.json
git commit -m "Day 3 — session bootstrap, Chrome reader API, total capture pipeline, mobile PWA, seed quality trends"
git push
echo "✅ Day 3 pushed."
