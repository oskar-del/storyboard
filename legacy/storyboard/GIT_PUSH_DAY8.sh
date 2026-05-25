#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock .git/refs/remotes/origin/main.lock
git add app.html index.html
git commit -m "Day 8 — Overnight sweep: 22 bugs fixed

=== T7 Story view ===
1. storyCompactions ReferenceError — moved const before statsStripHtml
   and storyTapeSegs (both used it before definition)
2. Story stats strip — 3 → 6 stats per T7 spec (added Compactions/Discuss./Designs at 18px)
3. Carry forward — added 🔄 button to story ticker per T7 spec

=== Navigation & state machine ===
4. navClick → buildNav() — sidebar STORIES section now rebuilds on board click
5. navClick('All') — clears activeStoryName + always resets to grid view
6. setFilter('All') — belt-and-suspenders clear of activeStoryName
7. Breadcrumb 'All work' — all 8 locations now call navClick('All') not setFilter
   (was: clicking breadcrumb left toolbar hidden, view state wrong)
8. openStoryWindow — breadcrumb shows All / Board / story path
   + nav .active syncs to correct board row on open
9. openStory fallback — legacy path now updates breadcrumb + calls buildNav()

=== Performance ===
10. Dead journeyHtml removed from renderProfileView — was iterating all
    sessions+compactions on every profile render, output never used (~50 LOC)
11. Duplicate overviewStrip logic in renderFeed consolidated — was showing
    strip for profile/story then hiding it immediately (wasted CPU + flash)

=== Crash prevention ===
12. pipeline-item-title: b.title.replace() → (b.title||'').replace()
13. detail panel idea pills: b.title.replace() → (b.title||'').replace()
14. contextual modal open threads: i.title.replace() → (i.title||'').replace()
15. renderProjectHeader idea pills: b.title.replace() → (b.title||'').replace()
16. Context seed export: s.title.substring() → (s.title||'session').substring()
17. Audit finding save toast: f.title.substring() → (f.title||'Finding').substring()
18. setView(): periodTabs DOM access now null-guarded
19. fmtTs() in renderProfileView: month index now safely clamped 0–11
20. fmtTs() in renderStoryView: month index safely clamped 0–11
21. fmtTs() in renderJourneyView: month index safely clamped 0–11

=== UX ===
22. openStory fallback: nav active state syncs to board when opening
    via session ID (same fix as openStoryWindow)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
echo "✅ Done — https://oskar-del.github.io/storyboard"
echo ""
echo "IMPORTANT: Hard reload Chrome with Cmd+Shift+R to clear cached JS"
