#!/bin/bash
# Run this from Terminal to push Day 5 + Day 6 changes
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "Day 5+6 — mobile PWA, timeline day zoom, session bootstrap, Chrome reader, seed trends"
git push
echo "✅ Day 5+6 pushed."
