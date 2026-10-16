begin;
do $$ declare uid uuid;begin
 select t.user_id into uid from public.literary_test_accounts t where exists(select 1 from public.literary_routes r where r.user_id=t.user_id) limit 1;
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare a uuid;r public.literary_routes%rowtype;ids uuid[];before_count integer;begin
 select * into r from public.literary_routes where user_id=auth.uid() order by created_at desc limit 1;
 if r.id is null then raise exception 'Saved test route required';end if;
 a:=public.reserve_literary_generation();
 begin
  perform public.save_literary_options(a,jsonb_build_array(r.content,'{}'::jsonb),r.duration,'test','rollback validation');
  raise exception 'Invalid batch accepted';
 exception when others then
  if sqlerrm='Invalid batch accepted' then raise;end if;
 end;
 if exists(select 1 from public.literary_attempts where id=a and used) then raise exception 'Partial batch consumed reservation';end if;
 ids:=public.save_literary_options(a,jsonb_build_array(r.content,r.content,r.content),r.duration,'test','rollback validation');
 if array_length(ids,1)<>3 or (select count(*) from public.literary_routes where attempt_id=a)<>3 then raise exception 'Options not saved together';end if;
 begin
  perform public.save_literary_options(a,jsonb_build_array(r.content),r.duration,'test','replay test');
  raise exception 'Reservation replay accepted';
 exception when others then if sqlerrm='Reservation replay accepted' then raise;end if;end;
 insert into public.literary_journey_choices(user_id,route_id) values(auth.uid(),ids[1]) on conflict(user_id) do update set route_id=excluded.route_id;
 if not exists(select 1 from public.literary_journey_choices where user_id=auth.uid() and route_id=ids[1]) then raise exception 'Choice not persisted';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 if exists(select 1 from public.literary_journey_choices) then raise exception 'Choice leaked to other user';end if;
end $$;
reset role;
select 'PASS: atomic options, one reservation, no replay, private journey choice; all test data rolled back' as result;
rollback;
