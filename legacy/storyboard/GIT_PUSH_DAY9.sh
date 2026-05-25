#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock .git/refs/remotes/origin/main.lock
git add app.html index.html
git commit -m "Day 9 — Fix T7 Story view: board-level stats + single story chip

=== T7 Story view corrections ===
1. Stats strip card 1 — now shows BOARD-level stats (totalSess, totalDec,
   totalIdeas, totalComp, totalDisc, totalBoardDesigns) not story-level.
   Board·Story eyebrow kept. This matches the reference screenshot.
2. Stats strip card 2 — replaced Context fill % with Velocity card
   (same as T1 board profile: ↑/→ + totalSess× + 'sessions total')
3. Stats strip card 3 — replaced 'Board total' mini-grid with North Star
   card showing PROJECT_META[boardName].northStar (falls back to 'No goal set')
4. Ticker chip row — removed taskMapT loop that was building chips for ALL
   board stories (making the story view look like a board view). Replaced
   with a single chip for the CURRENT story only (storyName + fillPct%).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
echo "✅ Done — https://oskar-del.github.io/storyboard"
echo ""
echo "IMPORTANT: Hard reload Chrome with Cmd+Shift+R to clear cached JS"
