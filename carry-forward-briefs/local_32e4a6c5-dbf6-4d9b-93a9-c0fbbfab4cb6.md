# Carry-Forward Brief: Newbuild social pipeline
**Session:** local_32e4a6c5-dbf6-4d9b-93a9-c0fbbfab4cb6  
**Status:** Running  
**Briefed:** 2026-05-18T15:50:38.381841

## What's happening
Automated social media pipeline for newbuildhomescostablanca.com — generating property/area posts and scheduling them across channels via Postiz, then logging to Airtable.

## Last known state
- 5 posts scheduled for tomorrow (May 19, 2026) at optimal CEST times via Postiz API
- Currently logging the scheduled posts to Airtable (create_records_for_table calls in progress, 2 batches)
- Task tracking updated throughout

## Next steps when resuming
- Confirm Airtable records created for all 5 posts
- Verify Postiz shows posts queued for May 19
- Check if any channel had scheduling errors (TikTok/YouTube often need video assets)
