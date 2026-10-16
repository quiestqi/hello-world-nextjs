-- Personal pins are private by default. Public readers never receive author identifiers.
create table if not exists public.literary_echoes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 lat double precision not null check (lat between 48.80 and 48.92),
 lng double precision not null check (lng between 2.25 and 2.43),
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 is_public boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.literary_echoes enable row level security;
revoke all on public.literary_echoes from anon, authenticated;
grant select, delete on public.literary_echoes to authenticated;
create policy "Read own echoes" on public.literary_echoes for select to authenticated using (user_id = auth.uid());
create policy "Remove own echoes" on public.literary_echoes for delete to authenticated using (user_id = auth.uid());
create index if not exists literary_echoes_public on public.literary_echoes(created_at desc) where is_public;
create or replace function public.read_city_echoes() returns table(id uuid, lat double precision, lng double precision, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select e.id,e.lat,e.lng,e.body,e.created_at from public.literary_echoes e where e.is_public order by e.created_at desc limit 200;
$$;
revoke all on function public.read_city_echoes() from public;
grant execute on function public.read_city_echoes() to anon,authenticated;
create or replace function public.save_city_echo(p_lat double precision,p_lng double precision,p_body text,p_public boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':echoes',0));
 if (select count(*) from public.literary_echoes where user_id=auth.uid() and created_at>now()-interval '24 hours') >= 20 then raise exception 'Daily echo limit'; end if;
 insert into public.literary_echoes(user_id,lat,lng,body,is_public) values(auth.uid(),p_lat,p_lng,btrim(p_body),p_public) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.save_city_echo(double precision,double precision,text,boolean) from public;
grant execute on function public.save_city_echo(double precision,double precision,text,boolean) to authenticated;
create table if not exists public.literary_journey_choices (
 user_id uuid primary key references auth.users(id) on delete cascade,
 route_id uuid not null references public.literary_routes(id) on delete cascade,
 updated_at timestamptz not null default now()
);
alter table public.literary_journey_choices enable row level security;
revoke all on public.literary_journey_choices from anon,authenticated;
grant select,insert,update on public.literary_journey_choices to authenticated;
create policy "Read own journey choice" on public.literary_journey_choices for select to authenticated using(user_id=auth.uid());
create policy "Choose own saved journey" on public.literary_journey_choices for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.literary_routes r where r.id=route_id and r.user_id=auth.uid()));
create policy "Change own journey choice" on public.literary_journey_choices for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.literary_routes r where r.id=route_id and r.user_id=auth.uid()));
