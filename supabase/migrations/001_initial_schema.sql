-- Storyboard v2 — initial schema
-- Profiles mirror auth.users for app-level data
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  author_key  text unique not null,  -- maps to STORYBOARD_AUTHOR env (e.g. "oskar")
  preferences jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  north_star text,
  color      text default '#7c6bff',
  created_at timestamptz default now(),
  unique(owner_id, name)
);

-- Collab model: users invited to a project see all its blocks
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member',  -- 'owner' | 'member'
  joined_at  timestamptz default now(),
  primary key (project_id, user_id)
);

-- Blocks: the core content unit. id is text to preserve existing string IDs.
create table public.blocks (
  id           text primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  project_name text not null,
  type         text not null
                 check (type in ('session','decision','idea','milestone','rejection',
                                 'intent','preview','discussion','compaction')),
  status       text not null default 'done'
                 check (status in ('done','in_progress','not_started')),
  title        text not null,
  summary      text,
  seed         text,
  task         text,
  chips        text[],
  decisions    text[],
  ideas        text[],
  tags         text[],
  heat         text,
  replaced_by  text,
  is_live      boolean default false,
  is_candidate boolean default false,
  source       text,
  source_url   text,
  turn_count   int,
  ts           int,         -- YYYYMMDD integer
  date_label   text,        -- "14 May" human display
  author_key   text,
  captured_at  timestamptz default now(),
  updated_at   timestamptz default now()
);

create table public.skills (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  category       text,
  score          int default 0,
  last_scored_at timestamptz,
  unique(user_id, name)
);

create table public.raw_captures (
  id          text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text,
  source      text default 'browser-extension',
  source_url  text,
  turn_count  int default 0,
  transcript  text,
  processed   boolean default false,
  captured_at timestamptz default now()
);

create table public.discussions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  file_name  text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- Waitlist is pre-auth — no user_id foreign key
create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  source       text default 'landing',
  signed_up_at timestamptz default now()
);
