-- Administrator SQL Editor. All test data and quota reservations roll back.
begin;
do $$ declare uid uuid; begin
 select id into uid from public.profiles where length(trim(first_name))>0 and length(trim(last_name))>0 limit 1;
 if uid is null then raise exception 'A completed test profile is required'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare attempt uuid; gid uuid; n bigint; begin
 attempt:=public.reserve_literary_generation();
 gid:=public.save_literary_route(attempt,'{"title":"Rollback test","summary":"Test only","stops":[{"place_id":"palais","scene_id":"mystere","reason":"Test","minutes":10},{"place_id":"greve","scene_id":"dance-greve","reason":"Test","minutes":10},{"place_id":"notre-dame","scene_id":"church-conversation","reason":"Test","minutes":10}]}'::jsonb,90,'test-only','Rollback test prompt');
 if not exists(select 1 from public.literary_route_prompts where route_id=gid) then raise exception 'Own prompt unavailable'; end if;
 insert into public.literary_votes(user_id,route_id,value) values(auth.uid(),gid,1);
 select upvotes into n from public.literary_vote_totals(array[gid]);
 if n<>1 then raise exception 'Aggregate incorrect'; end if;
 begin
  insert into public.literary_votes(user_id,route_id,value) values(auth.uid(),gid,-1);
  raise exception 'Duplicate vote allowed';
 exception when unique_violation then null; end;
 begin
  insert into public.literary_notebooks(user_id,place_id,note) values('00000000-0000-0000-0000-000000000001','palais','not allowed');
  raise exception 'Impersonation allowed';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 if exists(select 1 from public.literary_route_prompts where route_id=gid) or exists(select 1 from public.literary_votes where route_id=gid) then raise exception 'Private records leaked'; end if;
 select upvotes into n from public.literary_vote_totals(array[gid]);
 if n<>1 then raise exception 'Shared aggregate missing'; end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public' and tablename like 'literary_%' and not rowsecurity) then raise exception 'Missing RLS'; end if;
 if has_table_privilege('anon','public.literary_notebooks','SELECT') or has_table_privilege('authenticated','public.literary_routes','INSERT') then raise exception 'Permissions too broad'; end if;
end $$;
select 'PASS: reservation, grounded route save, prompt privacy, voting, duplicate prevention, owner isolation, aggregates and RLS' as result;
rollback;
