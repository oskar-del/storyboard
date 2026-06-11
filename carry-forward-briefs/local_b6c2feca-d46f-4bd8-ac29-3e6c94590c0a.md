# Carry-Forward Brief: NBHCB | H&H Brain
**Session:** local_b6c2feca-d46f-4bd8-ac29-3e6c94590c0a
**Updated:** 2026-06-11T10:53:00
**Status:** Running (very long session, 843+ turns as of last check)
**Project:** New Build Homes / Hansson Hertzell

## What's happening
Long-running combined NBHCB + H&H oversight brain session. Currently debugging why Background Properties feed listings aren't appearing on newbuildhomescostablanca.com — specifically investigating the Pedreguer area. Checking the codebase, live site, and property reference IDs to isolate the issue.

## Last known actions
- Read skills via Read tool to check Background Properties feed config
- Ran multiple bash commands to inspect codebase
- Navigating newbuildhomescostablanca.com via browser to check Pedreguer listings
- Investigating client-side filtering (URL params don't work, filtering is JS-based)
- Looking at property reference IDs to determine which feed they belong to

## Key findings so far
- Background Properties feed URL is NOT in the skills files — it's in the newbuildhomescostablanca codebase
- The live site uses client-side filtering, so URL params like ?location=pedreguer don't filter server-side
- Need to check property reference ID prefixes to identify which come from Background Properties vs REDSP
- User may have asked about "Palsa" (possibly Fotocasa?)

## Context to carry forward
- Codebase is NOT mounted in this session — can only browse live site or use bash to check public endpoints
- Background Properties feed config lives in the Next.js repo, not available here
- If session resumes, check property reference ID patterns visible on live site to identify feed source
- The artifact showing live NBHCB/H&H data was previously being rebuilt

## Watch out for
- Very long context — approaching or past limits
- Feed URL not accessible without repo mount — may need to check Vercel env vars or ask user
