-- Performance indexes for the most common query patterns

-- ── Blocks ─────────────────────────────────────────────────────────────────────

-- Feed view: all blocks by user, newest first (most common query)
create index blocks_user_captured
  on public.blocks(user_id, captured_at desc);

-- Canvas view: blocks by project, newest first
create index blocks_project_ts
  on public.blocks(project_id, ts desc);

-- Type filter (ideas, decisions, sessions)
create index blocks_type
  on public.blocks(user_id, type, captured_at desc);

-- Status filter — only indexes non-done rows (in_progress / not_started are a tiny fraction)
create index blocks_status_active
  on public.blocks(user_id, status, captured_at desc)
  where status != 'done';

-- Tetris mode: live blocks in today's feed
create index blocks_live
  on public.blocks(user_id, is_live, captured_at desc)
  where is_live = true;

-- Candidate blocks (review inbox)
create index blocks_candidate
  on public.blocks(user_id, is_candidate, captured_at desc)
  where is_candidate = true;

-- Full-text search on title + summary
create index blocks_fts
  on public.blocks
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'')));

-- Project name lookup (used in block create to resolve project_id)
create index blocks_project_name
  on public.blocks(user_id, project_name);

-- ── Projects ───────────────────────────────────────────────────────────────────

-- Owner lookup
create index projects_owner
  on public.projects(owner_id);

-- ── Project members ────────────────────────────────────────────────────────────

-- User's project memberships (used in RLS and session/seed)
create index project_members_user
  on public.project_members(user_id);

-- ── Skills ─────────────────────────────────────────────────────────────────────

create index skills_user_score
  on public.skills(user_id, score desc);

-- ── Raw captures ───────────────────────────────────────────────────────────────

-- Unprocessed inbox queue
create index raw_captures_queue
  on public.raw_captures(user_id, processed, captured_at desc)
  where processed = false;

-- ── updated_at trigger ─────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger blocks_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();
