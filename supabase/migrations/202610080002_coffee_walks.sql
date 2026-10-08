begin;

create table if not exists public.places (
  id text primary key, name text not null, kind text not null check (kind in ('coffee','park','library','garden')),
  address text not null, description text not null, visit_note text not null,
  source_url text not null, verified_on date not null default current_date
);
insert into public.places (id,name,kind,address,description,visit_note,source_url) values
('partners-village','Partners Coffee · West Village','coffee','44 Charles Street, New York, NY 10014','A coffee stop on a residential Village street.','Check the official page for opening hours and current menu.','https://www.partnerscoffee.com/pages/retail-locations'),
('birch-village','Birch Coffee · Seventh Avenue','coffee','56 7th Avenue, New York, NY 10011','Coffee near the northern edge of the Village.','Check the official page for opening hours and current menu.','https://www.birchcoffee.com/pages/visit'),
('washington-square','Washington Square Park','park','Washington Square Arch, Fifth Avenue and Waverly Place, New York, NY','A public park with an arch, fountain and gathering spaces.','Free outdoor stop. Conditions and events may affect access.','https://www.nycgovparks.org/parks/washington-square-park'),
('jefferson-library','Jefferson Market Library','library','425 Avenue of the Americas, New York, NY 10011','A landmark former courthouse and neighborhood library.','Admire the building outside; check NYPL hours before planning an indoor visit.','https://www.nypl.org/locations/jefferson-market'),
('jefferson-garden','Jefferson Market Garden','garden','Greenwich Avenue between Sixth Avenue and West 10th Street, New York, NY','A volunteer-run community garden.','Seasonal: April–October, Tuesday–Sunday. Check official access information. Drinks allowed; no food.','https://www.jeffersonmarketgarden.org/')
on conflict (id) do nothing;

create table if not exists public.generation_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), used boolean not null default false
);
create index if not exists attempts_user_time on public.generation_attempts(user_id,created_at);
create table if not exists public.generations (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references auth.users(id) on delete cascade,
 attempt_id uuid not null unique references public.generation_attempts(id),
 content jsonb not null, mood text not null, duration integer not null check (duration in (60,90,120)),
 model text not null, created_at timestamptz not null default now()
);
create table if not exists public.generation_prompts (
 generation_id uuid primary key references public.generations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, prompt text not null
);
create table if not exists public.votes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 generation_id uuid not null references public.generations(id) on delete cascade,
 value smallint not null check (value in (-1,1)), created_at timestamptz not null default now(),
 unique(user_id,generation_id)
);
create index if not exists votes_generation on public.votes(generation_id);

-- Enable RLS on every application table; leave managed auth/storage schemas intact.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('alter table public.%I enable row level security',t.tablename);
 end loop;
end $$;
revoke all on public.places,public.generations,public.generation_prompts,public.generation_attempts,public.votes from anon,authenticated;
grant select on public.places,public.generations,public.generation_prompts,public.generation_attempts,public.votes to authenticated;
grant insert (user_id,generation_id,value) on public.votes to authenticated;
create policy places_authenticated_read on public.places for select to authenticated using (true);
create policy generations_authenticated_read on public.generations for select to authenticated using (true);
create policy prompts_owner_read on public.generation_prompts for select to authenticated using ((select auth.uid())=user_id);
create policy attempts_owner_read on public.generation_attempts for select to authenticated using ((select auth.uid())=user_id);
create policy votes_owner_read on public.votes for select to authenticated using ((select auth.uid())=user_id);
create policy votes_owner_insert on public.votes for insert to authenticated with check ((select auth.uid())=user_id);

-- Protect existing features even if the project previously had broad permissive policies.
revoke all on public.coffees from anon,authenticated;
grant select on public.coffees to authenticated;
create policy coffees_authenticated_read on public.coffees for select to authenticated using (true);
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(first_name,last_name,avatar_url) on public.profiles to authenticated;
create policy profiles_owner_read_guard on public.profiles as restrictive for select to authenticated using ((select auth.uid())=id);
create policy profiles_owner_update_guard on public.profiles as restrictive for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);

-- Quota is reserved before the model request, under a per-user lock.
create or replace function public.reserve_generation() returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); attempt uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if (select count(*) from public.generation_attempts where user_id=uid and created_at > now()-interval '24 hours') >= 5 then
  raise exception 'Daily generation limit reached';
 end if;
 insert into public.generation_attempts(user_id) values(uid) returning id into attempt;
 return attempt;
end $$;

create or replace function public.save_generation(p_attempt uuid,p_content jsonb,p_prompt text,p_mood text,p_duration integer,p_model text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); gid uuid; stop jsonb; ids text[] := '{}'; total integer := 0;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_duration not in (60,90,120) or p_mood not in ('Slow morning','Architecture & photos','Catch up with friends')
  or length(p_model) not between 1 and 100 or length(p_prompt) not between 1 and 20000 then raise exception 'Invalid input'; end if;
 if jsonb_typeof(p_content->'stops') is distinct from 'array' then raise exception 'Invalid stops'; end if;
 if jsonb_array_length(p_content->'stops') not between 3 and 4
  or jsonb_typeof(p_content->'title') is distinct from 'string' or length(p_content->>'title') not between 1 and 100
  or jsonb_typeof(p_content->'summary') is distinct from 'string' or length(p_content->>'summary') not between 1 and 500 then raise exception 'Invalid content'; end if;
 for stop in select * from jsonb_array_elements(p_content->'stops') loop
  if not exists(select 1 from public.places where id=stop->>'place_id') or (stop->>'place_id')=any(ids)
   or jsonb_typeof(stop->'reason') is distinct from 'string' or length(stop->>'reason') not between 1 and 300
   or jsonb_typeof(stop->'activity') is distinct from 'string' or length(stop->>'activity') not between 1 and 300
   or coalesce(stop->>'minutes','') !~ '^[0-9]+$' then raise exception 'Invalid stop'; end if;
  if (stop->>'minutes')::integer not between 5 and 45 then raise exception 'Invalid stop duration'; end if;
  ids:=array_append(ids,stop->>'place_id'); total:=total+(stop->>'minutes')::integer;
 end loop;
 if total>p_duration-15 or not exists(select 1 from public.places where id=ids[1] and kind='coffee') then raise exception 'Invalid itinerary'; end if;
 update public.generation_attempts set used=true where id=p_attempt and user_id=uid and not used and created_at>now()-interval '5 minutes';
 if not found then raise exception 'Invalid generation reservation'; end if;
 insert into public.generations(creator_id,attempt_id,content,mood,duration,model) values(uid,p_attempt,p_content,p_mood,p_duration,p_model) returning id into gid;
 insert into public.generation_prompts(generation_id,user_id,prompt) values(gid,uid,p_prompt);
 return gid;
end $$;

create or replace function public.vote_totals(p_ids uuid[]) returns table(generation_id uuid,upvotes bigint,downvotes bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if coalesce(array_length(p_ids,1),0)>50 then raise exception 'Too many routes'; end if;
 return query select v.generation_id,count(*) filter(where v.value=1),count(*) filter(where v.value=-1)
 from public.votes v where v.generation_id=any(p_ids) group by v.generation_id;
end $$;
revoke all on function public.reserve_generation(), public.save_generation(uuid,jsonb,text,text,integer,text), public.vote_totals(uuid[]) from public,anon;
grant execute on function public.reserve_generation(), public.save_generation(uuid,jsonb,text,text,integer,text), public.vote_totals(uuid[]) to authenticated;
commit;
