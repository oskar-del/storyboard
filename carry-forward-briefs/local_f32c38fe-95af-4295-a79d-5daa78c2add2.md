# Carry-Forward Brief: Weekly GSC Monitoring — CRITICAL SITEMAP REGRESSION
**Session:** local_f32c38fe-95af-4295-a79d-5daa78c2add2
**Status:** Running (34 assistant turns)
**Captured:** 2026-05-14T08:24:14

## ⚠️ CRITICAL FINDING
Sitemap for newbuildhomescostablanca.com has dropped from ~14,000 URLs to only 1,851 URLs. All translated URLs and most blog URLs are missing. The lastmod date of 2026-05-11 suggests a recent deployment broke sitemap generation. This is a HIGH-PRIORITY regression.

## What's happening
Weekly GSC monitoring detected a major sitemap regression. Session is at 34 turns and currently generating the final report after analysis.

## Last known state
- "Critical finding: the sitemap has dropped from ~14,000 to 1,851 URLs — all translated URLs and most blog URLs are missing. The `lastmod` of 2026-05-11 suggests a recent deployment broke sitemap generation. This is a high-priority regression."
- Running TaskUpdate calls to finalize report

## What to expect on resume
Final report should be available. Oskar should urgently check the sitemap generation code — likely a deployment on 2026-05-11 broke i18n sitemap output.

## Action needed
Review the Next.js sitemap.ts or sitemap generation code for any changes made around 2026-05-11 that could have broken multilingual URL output.
