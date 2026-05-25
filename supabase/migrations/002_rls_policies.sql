-- Row-level security policies for all user tables

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.blocks          enable row level security;
alter table public.skills          enable row level security;
alter table public.raw_captures    enable row level security;
alter table public.discussions     enable row level security;
alter table public.waitlist        enable row level security;

-- Profiles: each user sees and manages only their own profile
create policy "profiles: own" on public.profiles
  for all using (id = auth.uid())
  with check (id = auth.uid());

-- Projects: owner + invited members can read; only owner can mutate
create policy "projects: read" on public.projects
  for select using (
    owner_id = auth.uid()
    or id in (
      select project_id from public.project_members where user_id = auth.uid()
    )
  );

create policy "projects: owner write" on public.projects
  for insert with check (owner_id = auth.uid());

create policy "projects: owner update" on public.projects
  for update using (owner_id = auth.uid());

create policy "projects: owner delete" on public.projects
  for delete using (owner_id = auth.uid());

-- Project members: members of a project can see the member list; only owner can add/remove
create policy "project_members: read" on public.project_members
  for select using (
    project_id in (
      select project_id from public.project_members where user_id = auth.uid()
    )
  );

create policy "project_members: owner write" on public.project_members
  for insert with check (
    project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  );

create policy "project_members: owner delete" on public.project_members
  for delete using (
    project_id in (
      select id from public.projects where owner_id = auth.uid()
    )
  );

-- Blocks: own blocks OR blocks on projects you're a member of
create policy "blocks: read" on public.blocks
  for select using (
    user_id = auth.uid()
    or project_id in (
      select project_id from public.project_members where user_id = auth.uid()
    )
  );

create policy "blocks: insert" on public.blocks
  for insert with check (user_id = auth.uid());

create policy "blocks: update" on public.blocks
  for update using (
    user_id = auth.uid()
    or project_id in (
      select project_id from public.project_members where user_id = auth.uid()
    )
  );

create policy "blocks: delete" on public.blocks
  for delete using (user_id = auth.uid());

-- Skills: own only
create policy "skills: own" on public.skills
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Raw captures: own only
create policy "raw_captures: own" on public.raw_captures
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Discussions: own only (shared via collab blocks, not here)
create policy "discussions: own" on public.discussions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Waitlist: anonymous insert; read requires service role (no user policy = blocked)
create policy "waitlist: insert" on public.waitlist
  for insert with check (true);
