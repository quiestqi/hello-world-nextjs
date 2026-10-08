-- Run in SQL Editor as postgres. All test mutations are rolled back.
begin;
do $$ declare uid uuid; begin
 select id into uid from auth.users order by created_at limit 1;
 if uid is null then raise exception 'A signed-up test user is required'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare attempt uuid; gid uuid; n integer; result bigint; begin
 attempt:=public.reserve_generation();
 gid:=public.save_generation(attempt,'{"title":"Rollback test","summary":"Test only","stops":[{"place_id":"partners-village","reason":"Test","activity":"Test","minutes":10},{"place_id":"jefferson-library","reason":"Test","activity":"Test","minutes":10},{"place_id":"washington-square","reason":"Test","activity":"Test","minutes":10}]}'::jsonb,'Private test prompt','Slow morning',60,'test-only');
 if not exists(select 1 from public.generation_prompts where generation_id=gid) then raise exception 'Creator cannot read prompt'; end if;
 insert into public.votes(user_id,generation_id,value) values(auth.uid(),gid,1);
 select upvotes into result from public.vote_totals(array[gid]);
 if result<>1 then raise exception 'Wrong aggregate'; end if;
 begin
  insert into public.votes(user_id,generation_id,value) values(auth.uid(),gid,-1);
  raise exception 'Duplicate vote allowed';
 exception when unique_violation then null; end;
 begin
  insert into public.votes(user_id,generation_id,value) values('00000000-0000-0000-0000-000000000001',gid,1);
  raise exception 'Impersonated vote allowed';
 exception when insufficient_privilege then null; end;
 select count(*) into n from public.generation_attempts where user_id=auth.uid() and created_at>now()-interval '24 hours';
 for i in n+1..5 loop perform public.reserve_generation(); end loop;
 begin
  perform public.reserve_generation(); raise exception 'Quota bypassed';
 exception when raise_exception then
  if sqlerrm<>'Daily generation limit reached' then raise; end if;
 end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 if exists(select 1 from public.generation_prompts where generation_id=gid) then raise exception 'Other user read private prompt'; end if;
 if exists(select 1 from public.votes where generation_id=gid) then raise exception 'Other user read raw vote'; end if;
 if exists(select 1 from public.profiles) then raise exception 'Other user read profiles'; end if;
 select upvotes into result from public.vote_totals(array[gid]);
 if result<>1 then raise exception 'Shared aggregate unavailable'; end if;
 if has_column_privilege('authenticated','public.votes','value','UPDATE') or has_table_privilege('authenticated','public.generations','INSERT') then raise exception 'Direct mutation permissions too broad'; end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public' and not rowsecurity) then raise exception 'RLS missing'; end if;
 if has_table_privilege('anon','public.coffees','SELECT') or has_table_privilege('anon','public.generations','SELECT') or has_column_privilege('anon','public.votes','value','INSERT') or has_function_privilege('anon','public.reserve_generation()','EXECUTE') then raise exception 'Anonymous access too broad'; end if;
end $$;
select 'PASS: save, insert vote, duplicate prevention, ownership, aggregates, quota, RLS and anonymous denial' as result;
rollback;
