#!/usr/bin/env python3
"""Injects today's Apr 29 sessions into session-log.json and pushes to GitHub."""
import json, subprocess, sys
from datetime import datetime

LOG = "/Users/oskarpeterson/Documents/AI/AGENCY /storyboard/session-log.json"

TODAY_ENTRIES = [
  {
    "id": "sync-storyboard-apr29-ux",
    "type": "session",
    "project": "Storyboard",
    "task": "dashboard-ux",
    "title": "Today view fixed — CSS columns bug, Stories real sessions, visual polish",
    "summary": "Fixed critical Today view layout bug where CSS multi-column was slicing cards across 3 columns. Added today-view class toggle. Fixed Stories sidebar to show real Claude sessions. Word-boundary title truncation. Today is now default landing view.",
    "decisions": [
      "feed.today-view class forces columns:1 when Today is active",
      "Stories sidebar: title first in text-1, project name below in color",
      "Word-boundary truncation at 34 chars with ellipsis",
      "activePeriod defaults to today on load"
    ],
    "ideas": [
      "Right panel of Today view could show yesterday summary",
      "Auto-push session-log.json to GitHub on every sync"
    ],
    "chips": ["Storyboard", "dashboard", "ux-fix", "today-view"],
    "date": "29 Apr", "ts": 20260429,
    "_source": "session-log",
    "_logged": "2026-04-29T14:26:00.000000"
  },
  {
    "id": "sync-hh-social-apr29",
    "type": "session",
    "project": "Hansson Hertzell",
    "task": "social-pipeline",
    "title": "H&H social pipeline — Edificio Vento content plan, 4 captions ready",
    "summary": "Checked H&H Airtable — 11 properties all Edificio Vento Torrevieja €158K–€488K. No Social Posts table, Postiz not connected. Wrote content plan with 4 Facebook/Instagram captions. Identified 4 blockers: Postiz channels, Airtable flags, Remotion template, Social Posts table.",
    "decisions": [
      "Posting schedule: Tue/Thu/Sat for Edificio Vento series",
      "Remotion H&H template: Navy #1E2A38, Gold #B39960, DM Sans"
    ],
    "ideas": ["Add Social Posts table to H&H Airtable", "Build H&H PropertyCard Remotion template"],
    "chips": ["H&H", "social", "Edificio Vento", "content-plan"],
    "date": "29 Apr", "ts": 20260429,
    "_source": "session-log",
    "_logged": "2026-04-29T10:00:00.000000"
  },
  {
    "id": "sync-hh-crm-outreach-apr29",
    "type": "session",
    "project": "Hansson Hertzell",
    "task": "crm-outreach",
    "title": "H&H CRM outreach — Gmail drafts created for active clients",
    "summary": "Created personalised Gmail outreach drafts for H&H CRM clients via Gmail API.",
    "decisions": ["Draft-first — review before sending"],
    "ideas": [],
    "chips": ["H&H", "CRM", "outreach", "Gmail"],
    "date": "29 Apr", "ts": 20260429,
    "_source": "session-log",
    "_logged": "2026-04-29T09:30:00.000000"
  },
  {
    "id": "sync-hh-fb-morning-apr29",
    "type": "session",
    "project": "Hansson Hertzell",
    "task": "fb-group-post",
    "title": "H&H FB group morning post — blocked by screen lock (Run 45)",
    "summary": "Chrome extension connected but all page interaction returned Permission denied. Screen-lock issue. No post shared. Requires unlocked screen + caffeinate -d.",
    "decisions": ["Screen must be unlocked for Chrome extension Facebook permissions"],
    "ideas": ["Schedule FB tasks only during active working hours"],
    "chips": ["H&H", "Facebook", "blocked", "screen-lock"],
    "date": "29 Apr", "ts": 20260429,
    "_source": "session-log",
    "_logged": "2026-04-29T08:00:00.000000"
  },
  {
    "id": "sync-newbuild-social-apr29",
    "type": "session",
    "project": "New Build Homes",
    "task": "social-pipeline",
    "title": "NBHCB social pipeline — 5 posts scheduled across platforms",
    "summary": "Full social pipeline run. All 5 posts scheduled across channels. Logged to Airtable.",
    "decisions": ["5 posts scheduled", "Airtable log updated after scheduling"],
    "ideas": [],
    "chips": ["NBHCB", "social", "scheduled", "Postiz"],
    "date": "29 Apr", "ts": 20260429,
    "_source": "session-log",
    "_logged": "2026-04-29T09:00:00.000000"
  },
  {
    "id": "sync-newbuild-blog-apr29",
    "type": "session",
    "project": "New Build Homes",
    "task": "blog-pipeline",
    "title": "NBHCB blog pipeline — content audit and article approval check",
    "summary": "Blog pipeline ran, auditing approved articles in Airtable and compiling new content to add to the site.",
    "decisions": [],
    "ideas": [],
    "chips": ["NBHCB", "blog", "pipeline"],
    "date": "29 Apr", "ts": 20260429,
    "_source": "session-log",
    "_logged": "2026-04-29T11:00:00.000000"
  },
  {
    "id": "sync-hh-daily-outreach-apr29",
    "type": "session",
    "project": "Hansson Hertzell",
    "task": "daily-outreach",
    "title": "Daily outreach — 10 Gmail drafts for Swedish Costa Blanca leads",
    "summary": "Created 10 personalised Gmail drafts for Swedish clients with Costa Blanca interest. All Swedish-language segment.",
    "decisions": ["Swedish-language drafts", "Costa Blanca general interest segment"],
    "ideas": [],
    "chips": ["H&H", "outreach", "Swedish", "Gmail"],
    "date": "29 Apr", "ts": 20260429,
    "_source": "session-log",
    "_logged": "2026-04-29T11:30:00.000000"
  }
]

with open(LOG, "r") as f:
    data = json.load(f)

existing_ids = {e["id"] for e in data}
added = 0
for entry in TODAY_ENTRIES:
    if entry["id"] not in existing_ids:
        data.insert(0, entry)
        added += 1

with open(LOG, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Added {added} entries to session-log.json")

# Git commit and push
repo = "/Users/oskarpeterson/Documents/AI/AGENCY /storyboard"
subprocess.run(["git", "-C", repo, "add", "session-log.json"], check=True)
subprocess.run(["git", "-C", repo, "commit", "-m", f"Session sync Apr 29: {added} sessions added"], check=True)
subprocess.run(["git", "-C", repo, "push"], check=True)
print("Pushed to GitHub. Refresh the dashboard.")
