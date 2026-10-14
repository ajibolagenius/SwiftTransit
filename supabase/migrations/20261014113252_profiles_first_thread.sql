-- Tracer bullet: profiles plus one SELECT and one UPDATE policy (spec 0002 task 2).
-- The role/is_demo pin cannot live in the policy itself: a WITH CHECK
-- subquery reads the row after the update, so it can never compare old values.
-- It is enforced by trigger instead (invariant 8), which is also the pattern
-- for courier_applications below.

create type public.user_role as enum ('customer', 'courier');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  avatar_path text,
  locale text not null default 'en',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Deny by construction, then grant only what the matrix allows. Supabase
-- auto-grants new public tables to anon/authenticated, so the revoke follows
-- every create.
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

create policy "profiles readable by owner"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "owner updates self"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- True when the session is not a client API session. Clients always run as
-- `anon` or `authenticated` (PostgREST switches to those roles); definer
-- functions run as the table owner (`postgres`, via SET ROLE, so current_user
-- changes inside them) and the service role and dashboard SQL are privileged
-- too. The pin triggers use this to exempt exactly the sanctioned write paths.
create function public._is_privileged() returns boolean
language sql stable as $$
  select current_user <> all (array['anon', 'authenticated'])
$$;

-- Invariant 8: role and is_demo are immutable through any client path
-- (complete_registration INSERTs; service role and owner paths pass).
create function public.pin_profile_role() returns trigger
language plpgsql as $$
begin
  if public._is_privileged() then
    return new;
  end if;
  if new.role is distinct from old.role or new.is_demo is distinct from old.is_demo then
    raise exception 'swifttransit.profile.column_locked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger profiles_pin_role
  before update on public.profiles
  for each row execute function public.pin_profile_role();
