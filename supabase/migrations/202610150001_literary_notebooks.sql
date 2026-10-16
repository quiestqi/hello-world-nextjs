begin;
create table if not exists public.literary_places (id text primary key, name_zh text not null, data jsonb not null);
create table if not exists public.literary_characters (id text primary key, name_zh text not null, data jsonb not null);
create table if not exists public.literary_scenes (id text primary key, place_id text not null references public.literary_places(id), data jsonb not null);
create table if not exists public.literary_notebooks (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null references public.literary_places(id),
  saved boolean not null default false,
  visited boolean not null default false,
  note text not null default '' check (char_length(note) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
alter table public.literary_places enable row level security;
alter table public.literary_characters enable row level security;
alter table public.literary_scenes enable row level security;
alter table public.literary_notebooks enable row level security;
revoke all on public.literary_places, public.literary_characters, public.literary_scenes, public.literary_notebooks from public, anon, authenticated;
grant select on public.literary_places, public.literary_characters, public.literary_scenes to authenticated;
grant select, insert, update, delete on public.literary_notebooks to authenticated;
drop policy if exists literary_places_read on public.literary_places;
create policy literary_places_read on public.literary_places for select to authenticated using (true);
drop policy if exists literary_characters_read on public.literary_characters;
create policy literary_characters_read on public.literary_characters for select to authenticated using (true);
drop policy if exists literary_scenes_read on public.literary_scenes;
create policy literary_scenes_read on public.literary_scenes for select to authenticated using (true);
drop policy if exists literary_notebooks_owner on public.literary_notebooks;
create policy literary_notebooks_owner on public.literary_notebooks for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
