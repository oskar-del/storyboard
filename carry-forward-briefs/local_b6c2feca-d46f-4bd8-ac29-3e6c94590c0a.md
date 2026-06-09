# Carry-Forward Brief: NBHCB | H&H Brain

**Session ID:** local_b6c2feca-d46f-4bd8-ac29-3e6c94590c0a
**Project:** New Build Homes / Hansson Hertzell (brain/agent session)
**Status:** Running (270+ assistant turns)
**Brief written:** 2026-06-09T10:51:49

## What's happening

Syncing the local property JSON cache with the live XML feed data. The live feed has grown significantly and the cached JSON is stale.

## Current state

- Live feed: **3,359 properties** (current)
- Cached JSON: **2,258 properties** (stale)
- A sync script has been written and run
- Problem hit: output JSON is **15MB** (too large; previous cache was ~3.5MB)
- Currently debugging/trimming the output to get back to a reasonable size

## Key decision

The old JSON at 3.5MB was acceptable; the new 15MB output suggests the sync script may be including extra fields or not stripping data correctly.

## Next steps when resuming

- Identify why the synced JSON is 4-5x larger than expected
- Strip unnecessary fields or apply compression/field filtering
- Verify final output is ~3-4MB and property count matches the live feed (~3,359)
- Confirm downstream services (website, API routes) pick up the refreshed cache
