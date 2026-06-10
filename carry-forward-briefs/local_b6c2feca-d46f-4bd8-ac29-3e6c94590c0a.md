# Carry-Forward Brief: NBHCB | H&H Brain
**Session:** local_b6c2feca-d46f-4bd8-ac29-3e6c94590c0a  
**Status:** Running (710 assistant turns)  
**Generated:** 2026-06-09

## Current Focus
Debugging EMAIL-* property filtering bug in NBHCB site. A blog commit (`20a83b6a9edbb3284a1dc336d508a60c16aa9a87` — "blog: add EN market-update article") appears to have overwrote the JSON back to 92 properties with no EMAIL-* entries, undoing prior CRM work.

## What's Being Investigated
- Blog commit added `market-update.ts` but the committed JSON reverted to 92 properties (dropping EMAIL-* properties)
- The CRM is a static import bundled at build time
- Images for missing EMAIL-* properties are present on Netlify (returning 200)
- Hypothesis: the merge logic skips CRM properties with `price: 0`
- 4 EMAIL-* entries DO appear on the live site — unclear why those 4 survived
- A force-redeploy was triggered to clear all caches
- Checking the commit tree directly to understand why JSON shows 92 properties

## Key Context
- Feed is cached (was 4 minutes old at time of checking)
- The old repo JSON also didn't have EMAIL-* entries — so something unusual was happening
- Only blog file `market-update.ts` was touched in the blog commit — JSON revert is unexplained

## Next Steps When Resuming
1. Confirm current deployed JSON property count after force-redeploy settles
2. Check if price: 0 filter is dropping EMAIL-* properties
3. Verify the correct JSON file is being committed and not overwritten by the blog pipeline
4. Ensure CRM EMAIL-* import is persistent across commits
