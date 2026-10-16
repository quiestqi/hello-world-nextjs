begin;
alter table public.literary_places add column if not exists map_reference jsonb;
alter table public.literary_places add column if not exists gringoire_route_eligible boolean not null default false;
create table if not exists public.literary_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), used boolean not null default false
);
create index if not exists literary_attempts_user_time on public.literary_attempts(user_id,created_at);
create table if not exists public.literary_routes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id uuid not null unique references public.literary_attempts(id), content jsonb not null,
 duration integer not null check(duration in(60,90,120)), model text not null, created_at timestamptz not null default now()
);
create table if not exists public.literary_route_prompts (
 route_id uuid primary key references public.literary_routes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, prompt text not null
);
create table if not exists public.literary_votes (
 user_id uuid not null references auth.users(id) on delete cascade,
 route_id uuid not null references public.literary_routes(id) on delete cascade,
 value smallint not null check(value in(-1,1)), created_at timestamptz not null default now(),
 primary key(user_id,route_id)
);
alter table public.literary_attempts enable row level security;
alter table public.literary_routes enable row level security;
alter table public.literary_route_prompts enable row level security;
alter table public.literary_votes enable row level security;
revoke all on public.literary_attempts,public.literary_routes,public.literary_route_prompts,public.literary_votes from public,anon,authenticated;
grant select on public.literary_attempts,public.literary_routes,public.literary_route_prompts,public.literary_votes to authenticated;
grant insert(user_id,route_id,value) on public.literary_votes to authenticated;
drop policy if exists literary_attempts_own on public.literary_attempts;
create policy literary_attempts_own on public.literary_attempts for select to authenticated using((select auth.uid())=user_id);
drop policy if exists literary_routes_read on public.literary_routes;
create policy literary_routes_read on public.literary_routes for select to authenticated using(true);
drop policy if exists literary_prompts_own on public.literary_route_prompts;
create policy literary_prompts_own on public.literary_route_prompts for select to authenticated using((select auth.uid())=user_id);
drop policy if exists literary_votes_own_read on public.literary_votes;
create policy literary_votes_own_read on public.literary_votes for select to authenticated using((select auth.uid())=user_id);
drop policy if exists literary_votes_own_insert on public.literary_votes;
create policy literary_votes_own_insert on public.literary_votes for insert to authenticated with check((select auth.uid())=user_id);

create or replace function public.reserve_literary_generation() returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); attempt uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.profiles where id=uid and length(trim(first_name))>0 and length(trim(last_name))>0) then raise exception 'Complete your profile'; end if;
 perform pg_advisory_xact_lock(hashtextextended('literary:'||uid::text,0));
 if (select count(*) from public.literary_attempts where user_id=uid and created_at>now()-interval '24 hours')>=5 then raise exception 'Daily generation limit reached'; end if;
 insert into public.literary_attempts(user_id) values(uid) returning id into attempt;
 return attempt;
end $$;

create or replace function public.save_literary_route(p_attempt uuid,p_content jsonb,p_duration integer,p_model text,p_prompt text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); gid uuid; stop jsonb; ids text[]:='{}'; minutes integer:=0;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_duration is null or p_duration not in(60,90,120) or p_model is null or length(p_model) not between 1 and 100 or p_prompt is null or length(p_prompt) not between 1 and 60000 then raise exception 'Invalid metadata'; end if;
 if jsonb_typeof(p_content->'title') is distinct from 'string' or length(p_content->>'title') not between 1 and 80 or jsonb_typeof(p_content->'summary') is distinct from 'string' or length(p_content->>'summary') not between 1 and 500 or jsonb_typeof(p_content->'stops') is distinct from 'array' then raise exception 'Invalid content'; end if;
 if jsonb_array_length(p_content->'stops') not between 3 and 4 then raise exception 'Invalid stops'; end if;
 for stop in select * from jsonb_array_elements(p_content->'stops') loop
  if not exists(select 1 from public.literary_places where id=stop->>'place_id' and gringoire_route_eligible)
   or (stop->>'place_id')=any(ids) or jsonb_typeof(stop->'reason') is distinct from 'string' or length(stop->>'reason') not between 1 and 300
   or jsonb_typeof(stop->'scene_id') is distinct from 'string' or not exists(select 1 from public.literary_scenes where id=stop->>'scene_id')
   or coalesce(stop->>'minutes','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid stop'; end if;
  -- The selected scene must belong to this place or its nested spaces, and include Gringoire physically.
  if not exists(
   with recursive family as (
    select id from public.literary_places where id=stop->>'place_id'
    union all select p.id from public.literary_places p join family f on p.data->>'parent_id'=f.id
   ) select 1 from public.literary_scenes s join family f on f.id=s.place_id,
   lateral jsonb_array_elements(s.data->'character_relations') r
   where s.id=stop->>'scene_id' and r->>'character_id'='gringoire' and r->>'relation' in('present','passed_through','spectator_inside','outside_only','approached_or_at_bridgehead_not_confirmed_crossing')
  ) then raise exception 'Unsupported character-scene relation'; end if;
  if (stop->>'minutes')::integer not between 5 and 30 then raise exception 'Invalid duration'; end if;
  minutes:=minutes+(stop->>'minutes')::integer;
  ids:=array_append(ids,stop->>'place_id');
 end loop;
 if minutes>p_duration-10 then raise exception 'Exceeds duration'; end if;
 update public.literary_attempts set used=true where id=p_attempt and user_id=uid and not used and created_at>now()-interval '5 minutes';
 if not found then raise exception 'Invalid reservation'; end if;
 insert into public.literary_routes(user_id,attempt_id,content,duration,model) values(uid,p_attempt,p_content,p_duration,p_model) returning id into gid;
 insert into public.literary_route_prompts(route_id,user_id,prompt) values(gid,uid,p_prompt);
 return gid;
end $$;

create or replace function public.literary_vote_totals(p_ids uuid[]) returns table(route_id uuid,upvotes bigint,downvotes bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if coalesce(array_length(p_ids,1),0)>50 then raise exception 'Too many routes'; end if;
 return query select v.route_id,count(*) filter(where v.value=1),count(*) filter(where v.value=-1) from public.literary_votes v where v.route_id=any(p_ids) group by v.route_id;
end $$;
revoke all on function public.reserve_literary_generation(),public.save_literary_route(uuid,jsonb,integer,text,text),public.literary_vote_totals(uuid[]) from public,anon;
grant execute on function public.reserve_literary_generation(),public.save_literary_route(uuid,jsonb,integer,text,text),public.literary_vote_totals(uuid[]) to authenticated;
commit;
