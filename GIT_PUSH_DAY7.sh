#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock .git/refs/remotes/origin/main.lock
git add app.html index.html
git commit -m "Day 7 — Match design spec T1 + T7 exactly

T1 Board Profile:
- Restored 4-card stats strip (Storyboard/Velocity/Context/Recent Sessions)
- Removed Board Journey spine (does NOT belong on board profile per spec)
- Board profile = stats + ticker + project header + Latest Activity + Latest Designs

T7 Story View:
- Compressed 4-card stats strip with 'Storyboard · dashboard' eyebrow
- Ticker with story chips + carry forward
- Compressed .ph header card: context tape + icon + story name + intent
- Two-column: LEFT = chronological film strip spine, RIGHT = ideas + designs

navClick: clicking any board ALWAYS goes to profile (no stayViews exception)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
echo "✅ Done — https://oskar-del.github.io/storyboard"
echo ""
echo "IMPORTANT: Hard reload Chrome with Cmd+Shift+R to clear cached JS"
