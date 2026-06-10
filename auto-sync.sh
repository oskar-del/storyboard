#!/bin/bash
# Storyboard auto-sync — runs every 15 min via LaunchAgent
# Syncs sessions via Cowork scheduled task output, then git pushes

REPO="/Users/oskarpeterson/Documents/AI/AGENCY /storyboard"
LOG="$REPO/auto-sync.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auto-sync triggered" >> "$LOG"

cd "$REPO" || exit 1

# Push any unpushed commits (from Cowork session sync)
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Changes detected — pushing..." >> "$LOG"
  git push origin main >> "$LOG" 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Push complete" >> "$LOG"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Already up-to-date" >> "$LOG"
fi
