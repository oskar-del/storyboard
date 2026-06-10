# Carry-Forward Brief: NBHCB | H&H Brain
**Session:** local_b6c2feca-d46f-4bd8-ac29-3e6c94590c0a
**Status:** Running (843 turns as of 2026-06-10T10:19:23)
**Project:** New Build Homes / Hansson Hertzell

## What's happening
The main "Brain" session combining NBHCB and H&H oversight. Very long-running (843 turns). Currently rebuilding a Cowork artifact to show: actual property additions, email intake queue, and daily activity summary.

## Last known action
- Wrote a file (Write tool)
- Updated a Cowork artifact (mcp__cowork__update_artifact)
- Focus: showing real data in artifact — additions, email intake queue, daily activity

## Context to carry forward
- This is a persistent "brain" session monitoring both NBHCB and H&H pipelines
- Artifact being rebuilt to show live data from connectors (Airtable, Gmail, MailerLite)
- The artifact should auto-refresh via window.cowork.callMcpTool
- If session crashes, the artifact will still be viewable via Cowork artifacts list

## Watch out for
- 843 turns — approaching context limits
- If it crashes mid-artifact-update, the artifact may show stale/partial data
- Resume by loading mcp__cowork__list_artifacts and updating the artifact
