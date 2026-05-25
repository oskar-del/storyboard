-- Automatically create a profiles row whenever a new user signs up via
-- Supabase Auth. This fires on INSERT into auth.users — covers magic links,
-- OAuth, invite acceptance, and email/password sign-up.
--
-- The profile is created with:
--   username  = email prefix (e.g. "sainath" from "sainath@example.com")
--   author_key = same as username (user can update it in Settings)
--
-- The /auth/callback route also calls ensureProfile() as a belt-and-
-- suspenders fallback in case this trigger hasn't been applied yet.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- runs as postgres, not the calling user
set search_path = public  -- prevent search_path injection
as $$
declare
  _username text;
begin
  -- Derive username from email prefix, strip non-alphanumeric chars
  _username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));

  -- Fallback if email is empty or prefix is blank
  if _username = '' then
    _username := 'user_' || left(new.id::text, 8);
  end if;

  -- Insert profile; ON CONFLICT DO NOTHING handles re-runs or race conditions
  insert into public.profiles (id, username, author_key)
  values (new.id, _username, _username)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Drop old trigger if it exists (safe to re-run)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
