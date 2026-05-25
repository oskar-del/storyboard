-- Tracks invite emails sent by existing users.
-- Used to display "pending invites" in the Settings page and prevent duplicates.

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  invited_by  uuid not null references public.profiles(id) on delete cascade,
  email       text not null,
  sent_at     timestamptz not null default now(),
  unique(email)   -- one pending invite per email address
);

-- RLS: users can only see invites they sent
alter table public.invites enable row level security;

create policy "invites: own" on public.invites
  for all using (invited_by = auth.uid())
  with check (invited_by = auth.uid());

create index invites_sender on public.invites(invited_by, sent_at desc);
