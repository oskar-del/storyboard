# Cross-Project Intelligence — The Category Layer

**Date:** Apr 18, 2026  
**Project:** Storyboard  
**Type:** Discussion  
**Produced:** Categories architecture decision · Shared data points concept · Cross-project intelligence model

---

## The conversation

It started with a practical observation: two different projects, both running marketing campaigns. New Build Homes has Facebook ads, email sequences, content pipelines. H&H has the same. They're in different project silos in the dashboard — but the work is the same work. There's no connection between them.

*"If you're running A/B testing on Facebook performance campaigns on H&H but you're doing similar campaigns on the other one, that should be a shared data point."*

That reframes the product significantly. Not just "memory for one project" but "intelligence that compounds across all your work."

---

## What we named

**The missing layer:** Categories sit between Projects and Skills. The structure:

```
SKILL        →  real-estate-blog-writer (a tool)
CATEGORY     →  Content Marketing (a work type)
PROJECT      →  New Build Homes (where it runs)
TASK/BLOCK   →  specific session, decision, automation
```

The skills library already has these categories — `Content`, `SEO`, `Email`, `Dev`, `Distribution`. They're defined. The gap is that blocks and automations aren't tagged to them, so the connection between "SEO work in New Build" and "SEO work in H&H" is invisible.

**The fix:** Every block gets a `category` field alongside `project`. The nav gets a third view mode — By Category — so you can see all your Marketing work, or all your SEO work, across every project at once.

---

## The A/B test insight

The specific case that made this concrete: if H&H runs a Facebook A/B test and finds that lifestyle imagery outperforms spec-heavy creative, that finding lives in an H&H block and never travels anywhere else.

With category tagging, both campaigns are `Marketing > Paid Social`. When you open a new session for New Build Homes paid social, Storyboard surfaces: *"H&H found in March: lifestyle > spec creative on Facebook — 3 decisions, 2 A/B tests logged."*

You start from the compounded learning, not from zero.

What gets shared isn't just the outcome. It's the full chain:
- What was tested (the setup)
- What the signal was (CTR, CPL, conversion)
- What decision was made as a result
- Which skill or automation was updated because of it

This is the difference between shared files and shared intelligence.

---

## The compounding argument

The tenth campaign benefits from the nine before it. Across all your projects.

Each time you run a campaign in any project, the category accumulates. The skills in that category become more precise. The decisions you've made sharpen the defaults. The next person who opens "Marketing" — whether it's you in a new session or a team member later — starts from a position informed by everything that's already been done.

That's not memory. That's compounding institutional knowledge.

---

## Connection to the provenance layers

Categories become most powerful when combined with Discussions and Trails. When H&H's A/B test surfaces in a new New Build session, you don't just see the decision headline. You see the Discussion that produced it — the reasoning, the context — and the Trail that executed it. The compounding happens at every layer, not just the outcome layer.

→ See: `apr18-three-layers.md` for the full provenance architecture

---

## Decisions locked

- **Work categories:** Content · SEO · Dev · Marketing · Legal · Client Relations · Automation
- **Every block gets a `category` field** alongside `project`
- **Nav: third view mode** — By Category (cross-project)
- **Skills library categories already defined** — they flow down to blocks
- **Seeding by category** = pulls context across all projects doing that work type
- **Pitch framing:** *"The tenth campaign benefits from the nine before it"*
