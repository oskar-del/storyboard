# Trail: Category View — Cross-Project Intelligence Layer

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Trail  
**Linked discussion:** Cross-Project Categories (apr18-categories.md)  
**Outcome:** ◈ Categories nav button · `openCategoryView()` · Block scroll-in animations · Live category badge count

---

## What was built

The category architecture we locked yesterday (cross-project work type taxonomy) needed a surface. Today's build made it visible.

**Three things shipped:**

### 1. ◈ Categories nav button

Added to the Intelligence section of the left nav, below Context. Shows a badge with the count of active categories (those with at least one block). Clicking opens the category view.

```html
<button class="nav-tool-item" id="categoriesBtn" onclick="openCategoryView()">
  <span class="nav-tool-icon">◈</span>
  <span class="nav-tool-label">Categories</span>
  <span class="nav-tool-badge accent" id="categoriesCount">9</span>
</button>
```

### 2. `openCategoryView(filterCat?)`

The main function. Accepts an optional category filter — call with no args for the "all categories" overview, or with a specific category name to drill into it.

**What it does:**
- Runs `getBlockCategory()` on every non-session block to classify it
- Groups blocks into `byCategory` map (all 9 categories)
- Renders filter pills at the top — one per active category with live block counts
- Shows an insight strip: most active category (all view), or cross-project scope (single category view)
- Renders category sections with the 6 most recent blocks per category as cards
- Overflow: "+N more" card that drills into that category

**The insight strip is the key thing.** When you're viewing "Marketing" and it spans 3 projects, the strip says: *"Marketing work spans 3 projects: New Build Homes, Hansson Hertzell, Opero Agency. Decisions made in one are likely relevant to all."* That's the compounding argument made explicit, right in the interface.

```javascript
// The inference stays fast — no AI call, pure keyword matching
function getBlockCategory(b) {
  if (b.category) return b.category; // explicit tag takes priority
  const haystack = [b.title, b.summary, b.body, ...(b.chips||[]), ...].join(' ').toLowerCase();
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    if (kws.some(kw => haystack.includes(kw))) return cat;
  }
  return PROJECT_DEFAULT_CAT[b.project] || 'Product';
}
```

### 3. Block scroll-in animations

Feed blocks now animate in on viewport entry — subtle upward drift with opacity fade, staggered by visual index. First block at 0ms delay, each subsequent block adds ~30ms.

```css
@keyframes blockEnter {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.block-enter { animation: blockEnter .32s cubic-bezier(.22,.68,0,1.2) both; }
```

Implemented with `IntersectionObserver` — not a timed delay. Blocks animate when they actually enter the viewport. MutationObserver on the feed container resets the stagger counter and re-observes on every feed re-render.

---

## Design decisions

**Category sections are expandable by click** — clicking a section header (or "+N more") calls `openCategoryView('CategoryName')` which renders all blocks in that category with full detail.

**Left border accent** — each block card in the category view gets a `border-left: 3px solid` in the category color. Scannable at a glance which work type you're in.

**View state guard** — added a check in `renderFeed()` so the category view can't be silently overridden by a routine data poll. Same pattern as Context Windows.

---

## What's next for this feature

The current implementation does inference on the fly. The next step is **persisting** inferred categories back to `blocks-data.json` so the MCP server can use them for seeding:

```
/seed-by-category → pulls all blocks in a category, compressed, across all projects
```

That's when "the tenth campaign benefits from the nine before it" becomes literal. You call `/seed-by-category?cat=Marketing` and the seed pulls decisions and ideas from every marketing-related block you've ever captured, across all projects.

→ Linked discussion: apr18-categories.md for the full architecture rationale
