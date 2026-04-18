# Trail: Dark Mode Fix — Full Execution Log

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Trail  
**Linked discussion:** Design system conversation  
**Outcome:** Root CSS dark by default · ideaBg/projBg getter functions · All light bleeds fixed

---

## What was wrong

The app looked right in isolation but broke as a system. The root CSS had light colors as defaults — `--bg: #f0f2f8`, `--white: #ffffff` — and dark mode was patched on top via `body.ai-mode`. Anything without explicit dark coverage showed through as light.

The visible leaks:
- **Topbar:** hardcoded `rgba(255,255,255,0.96)` — the biggest visible bleed, a white bar across the top of a dark UI
- **IDEA_BG / IDEA_BD:** static arrays of light pastels (`#fef9c3`, `#dbeafe`, `#dcfce7`) applied inline as JS strings — no CSS override could touch them
- **PROJ.bg colors:** light backgrounds (`#f0fdf4`, `#f5f3ff`) injected as CSS custom properties — same problem
- **jfp-* pills:** `.jfp-decision { background: #f0fdf4 }` — green blobs on dark cards
- **Score ring:** `conic-gradient(..., #f0f0f8 0)` — light gray track visible
- **Board column count:** `rgba(255,255,255,.7)` — 70% white blob

---

## The fix — architectural, not cosmetic

**Step 1: Flip the root.**  
Changed `:root` to dark values. Added `body.light-mode` as the opt-in override. Dark is now the default state of the CSS, not a patch.

```css
:root {
  --bg:     #0d1117;
  --white:  #161b27;
  --border: rgba(255,255,255,.08);
  --text:   #e8eaf6;
}
body.light-mode {
  --bg:     #f0f2f8;
  --white:  #ffffff;
  --border: #e2e6f0;
  --text:   #0f1120;
}
```

**Step 2: Replace IDEA_BG/BD with getter functions.**  
Static arrays can't respond to mode. Getter functions can.

```javascript
const IDEA_BG_DARK  = ['rgba(245,158,11,.09)', 'rgba(59,130,246,.09)', ...];
const IDEA_BG_LIGHT = ['#fef9c3', '#dbeafe', ...];
function ideaBg(i) {
  return lightMode ? IDEA_BG_LIGHT[i % 6] : IDEA_BG_DARK[i % 6];
}
```

**Step 3: Same pattern for project block backgrounds.**  
Added `PROJ_DARK_BG` map and `projBg(name)` function. Every block background now responds to mode at render time.

**Step 4: Fix every hardcoded light value.**  
Went through every visible bleed and replaced with dark-first rgba + `body.light-mode` overrides:
- Topbar: `rgba(13,17,23,0.96)` default
- `jfp-decision`: `rgba(16,185,129,.1)` with green text
- `jfp-idea`: `rgba(245,158,11,.1)` with amber text
- Score ring track: `rgba(255,255,255,.08)`
- Board column count: `rgba(255,255,255,.1)`
- `pd-rm-badge.next/soon/later`: rgba tints with matching text colors
- Live badge, canvas deploy badge, "needs work" button: all converted

---

## What didn't work first

The `body.ai-mode` patch approach. Adding dark values to `body.ai-mode` only covered elements that were explicitly targeted — anything missed (and there were many) defaulted to light. The fix had to be architectural: make dark the root state, not a patch.

---

## Files changed

- `app.html` — root CSS, JS mode toggle, all inline color strings in blockHTML() and renderJournalView()
- Git commit: `01de2ce` — "Day 2 end: full dark-mode fix + 5 context window features"

---

## Result

No light bleeds on dark background. Every component responds correctly to mode toggle. Light mode works as opt-in and restores cleanly. The architecture is now correct: dark by default, light as override.
