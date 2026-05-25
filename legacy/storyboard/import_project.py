#!/usr/bin/env python3
"""
Storyboard Retroactive Import
==============================
Point this at any git repo and it auto-generates storyboard blocks
from commit history, README, and project structure.

Usage:
  python3 import_project.py /path/to/your/project [--project-name "My Project"]

Output:
  Appends blocks to blocks-data.json in the storyboard directory.
"""

import subprocess
import json
import os
import sys
import re
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BLOCKS_FILE = SCRIPT_DIR / "blocks-data.json"

# Heuristics for inferring block type from commit message
SESSION_KEYWORDS = ['feat', 'feature', 'add', 'build', 'implement', 'create', 'ship', 'launch', 'release', 'deploy']
DECISION_KEYWORDS = ['refactor', 'change', 'switch', 'migrate', 'replace', 'remove', 'drop', 'deprecate', 'revert', 'fix:', 'hotfix']
BUG_KEYWORDS = ['fix', 'bug', 'patch', 'resolve', 'repair', 'correct', 'handle error']
INFRA_KEYWORDS = ['config', 'ci', 'deploy', 'docker', 'env', 'setup', 'init', 'scaffold', 'install']

# Project color palette (cycles)
COLORS = ['#6c63ff', '#00b894', '#e17055', '#0984e3', '#fd79a8', '#fdcb6e', '#a29bfe']

def run_git(repo_path, *args):
    result = subprocess.run(
        ['git', '-C', str(repo_path)] + list(args),
        capture_output=True, text=True
    )
    return result.stdout.strip()

def infer_type(msg):
    msg_lower = msg.lower()
    for kw in BUG_KEYWORDS:
        if kw in msg_lower: return 'bug'
    for kw in DECISION_KEYWORDS:
        if kw in msg_lower: return 'decision'
    for kw in INFRA_KEYWORDS:
        if kw in msg_lower: return 'infra'
    for kw in SESSION_KEYWORDS:
        if kw in msg_lower: return 'session'
    return 'session'

def clean_title(msg):
    # Strip conventional commit prefix like "feat(auth): " or "fix: "
    msg = re.sub(r'^(feat|fix|chore|docs|refactor|style|test|ci|build|perf|hotfix)(\([^)]+\))?:\s*', '', msg, flags=re.I)
    msg = msg.strip().rstrip('.')
    if len(msg) > 80:
        msg = msg[:77] + '...'
    return msg or 'Untitled commit'

def ts_to_yyyymmdd(ts):
    return int(datetime.fromtimestamp(int(ts), tz=timezone.utc).strftime('%Y%m%d'))

def get_project_stats(repo_path):
    total_commits = run_git(repo_path, 'rev-list', '--count', 'HEAD')
    first_commit_ts = run_git(repo_path, 'log', '--reverse', '--format=%ct', '--max-count=1')
    last_commit_ts = run_git(repo_path, 'log', '--format=%ct', '--max-count=1')
    
    # Count tracked files
    tracked = run_git(repo_path, 'ls-files', '--full-name')
    file_count = len([f for f in tracked.splitlines() if f.strip()])
    
    return {
        'commits': int(total_commits) if total_commits.isdigit() else 0,
        'files': file_count,
        'first_ts': int(first_commit_ts) if first_commit_ts.isdigit() else 0,
        'last_ts': int(last_commit_ts) if last_commit_ts.isdigit() else 0,
    }

def detect_stack(repo_path):
    tags = []
    p = Path(repo_path)
    if (p / 'package.json').exists(): tags.append('Node')
    if (p / 'next.config.js').exists() or (p / 'next.config.mjs').exists(): tags.append('Next.js')
    if (p / 'requirements.txt').exists() or list(p.glob('*.py')): tags.append('Python')
    if list(p.glob('*.go')): tags.append('Go')
    if (p / 'Dockerfile').exists(): tags.append('Docker')
    if (p / '.github').exists(): tags.append('GitHub Actions')
    return tags[:4]  # Max 4 tags

def extract_readme_context(repo_path):
    for name in ['README.md', 'readme.md', 'README.txt']:
        f = Path(repo_path) / name
        if f.exists():
            content = f.read_text(errors='ignore')[:1200]
            # Extract first non-empty paragraph
            paragraphs = [p.strip() for p in content.split('\n\n') if p.strip() and not p.startswith('#')]
            if paragraphs:
                return paragraphs[0][:300]
    return None

def get_weekly_sessions(repo_path, max_weeks=20):
    """Group commits into weekly sessions — each week = one session block"""
    log = run_git(repo_path, 'log', '--format=%ct|%s|%H', '--no-merges')
    if not log:
        return []
    
    commits = []
    for line in log.splitlines():
        parts = line.split('|', 2)
        if len(parts) == 3:
            commits.append({'ts': int(parts[0]), 'msg': parts[1], 'hash': parts[2][:7]})
    
    # Group by ISO week
    from collections import defaultdict
    weeks = defaultdict(list)
    for c in commits:
        dt = datetime.fromtimestamp(c['ts'], tz=timezone.utc)
        week_key = dt.strftime('%Y-W%V')
        weeks[week_key].append(c)
    
    sessions = []
    for week, week_commits in sorted(weeks.items(), reverse=True)[:max_weeks]:
        if not week_commits: continue
        latest = max(week_commits, key=lambda c: c['ts'])
        dt = datetime.fromtimestamp(latest['ts'], tz=timezone.utc)
        
        # Build title from most significant commit of the week
        titles = [clean_title(c['msg']) for c in week_commits[:3]]
        primary = titles[0]
        extras = ' · '.join(titles[1:3]) if len(titles) > 1 else ''
        title = primary + (f' · {extras}' if extras else '')
        
        # Infer decisions from that week
        decisions = [clean_title(c['msg']) for c in week_commits if infer_type(c['msg']) == 'decision'][:2]
        ideas = [clean_title(c['msg']) for c in week_commits if infer_type(c['msg']) == 'session' and 'feat' in c['msg'].lower()][:2]
        
        sessions.append({
            'ts': latest['ts'],
            'ts_yyyymmdd': ts_to_yyyymmdd(latest['ts']),
            'week': week,
            'commit_count': len(week_commits),
            'title': title[:100],
            'decisions': decisions,
            'ideas': ideas,
        })
    
    return sessions

def import_project(repo_path, project_name=None, color=None):
    repo_path = Path(repo_path).expanduser().resolve()
    
    if not (repo_path / '.git').exists():
        print(f"✗ Not a git repo: {repo_path}")
        sys.exit(1)
    
    # Auto-detect project name
    if not project_name:
        project_name = repo_path.name.replace('-', ' ').replace('_', ' ').title()
    
    if not color:
        color = COLORS[hash(project_name) % len(COLORS)]
    
    print(f"\n🔍 Importing: {project_name}")
    print(f"   Path: {repo_path}")
    
    stats = get_project_stats(repo_path)
    stack = detect_stack(repo_path)
    readme_ctx = extract_readme_context(repo_path)
    sessions = get_weekly_sessions(repo_path)
    
    if not sessions:
        print("✗ No commits found")
        return []
    
    print(f"   {stats['commits']} commits · {stats['files']} files · {len(sessions)} weeks")
    
    # Load existing blocks
    existing = []
    if BLOCKS_FILE.exists():
        try:
            existing = json.loads(BLOCKS_FILE.read_text())
        except:
            existing = []
    
    existing_ids = {b.get('id') for b in existing}
    new_blocks = []
    
    # 1. Project overview block
    proj_id = f"import-{project_name.lower().replace(' ', '-')}-overview"
    if proj_id not in existing_ids:
        first_dt = datetime.fromtimestamp(stats['first_ts'], tz=timezone.utc).strftime('%b %Y') if stats['first_ts'] else '?'
        last_dt = datetime.fromtimestamp(stats['last_ts'], tz=timezone.utc).strftime('%b %Y') if stats['last_ts'] else '?'
        
        new_blocks.append({
            "id": proj_id,
            "type": "session",
            "project": project_name,
            "color": color,
            "title": f"{project_name} — retroactive storyboard",
            "body": readme_ctx or f"Imported from {repo_path.name}",
            "tags": stack + ["imported"],
            "stats": {
                "commits": stats['commits'],
                "files": stats['files'],
                "period": f"{first_dt} → {last_dt}"
            },
            "ts": stats['last_ts'] * 1000 if stats['last_ts'] else ts_to_yyyymmdd(0),
            "featured": True
        })
    
    # 2. Weekly session blocks (most recent first, max 12)
    for s in sessions[:12]:
        block_id = f"import-{project_name.lower().replace(' ', '-')}-{s['week']}"
        if block_id in existing_ids:
            continue
        
        block = {
            "id": block_id,
            "type": "session",
            "project": project_name,
            "color": color,
            "title": s['title'],
            "body": f"{s['commit_count']} commits this week",
            "tags": ["imported"],
            "ts": s['ts'] * 1000,
        }
        if s['decisions']:
            block['decisions'] = s['decisions']
        if s['ideas']:
            block['ideas'] = s['ideas']
        new_blocks.append(block)
    
    if not new_blocks:
        print(f"   ✓ Already imported, no new blocks")
        return []
    
    # Prepend new blocks
    combined = new_blocks + existing
    BLOCKS_FILE.write_text(json.dumps(combined, indent=2, ensure_ascii=False))
    
    print(f"   ✓ Added {len(new_blocks)} blocks → blocks-data.json")
    return new_blocks

def main():
    parser = argparse.ArgumentParser(description='Import a git project into Storyboard')
    parser.add_argument('repo_path', help='Path to git repository')
    parser.add_argument('--project-name', '-n', help='Project display name')
    parser.add_argument('--color', '-c', help='Hex color for project cards')
    args = parser.parse_args()
    
    blocks = import_project(args.repo_path, args.project_name, args.color)
    
    if blocks:
        print(f"\n✅ Done! {len(blocks)} blocks added to storyboard.")
        print(f"   Refresh your dashboard to see the new project.\n")
    else:
        print("\n⚠️  Nothing imported.\n")

if __name__ == '__main__':
    main()
