-- Administrator SQL Editor: all fixture routes/reservations roll back; does not consume user quota.
begin;
do $$ declare uid uuid; attempt uuid; gid uuid; item jsonb; rejected boolean; begin
 select id into uid from public.profiles where length(trim(first_name))>0 and length(trim(last_name))>0 limit 1;
 if uid is null then raise exception 'Completed profile required'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
 for item in select * from jsonb_array_elements($fixtures$[{"perspective": "gringoire", "title": "Rollback perspective test", "summary": "Test only", "stops": [{"place_id": "palais", "scene_id": "mystere", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "pont-change", "scene_id": "bridge-turnback", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "cite-west", "scene_id": "cite-bank", "reason": "Rollback evidence test", "minutes": 5}]}, {"perspective": "esmeralda", "title": "Rollback perspective test", "summary": "Test only", "stops": [{"place_id": "palais", "scene_id": "esmeralda-trial", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "pont-saint-michel", "scene_id": "falourdel-attack", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "greve", "scene_id": "dance-greve", "reason": "Rollback evidence test", "minutes": 5}]}, {"perspective": "quasimodo", "title": "Rollback perspective test", "summary": "Test only", "stops": [{"place_id": "palais", "scene_id": "fools-pope", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "greve", "scene_id": "dance-greve", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "notre-dame", "scene_id": "adoption", "reason": "Rollback evidence test", "minutes": 5}]}, {"perspective": "claude", "title": "Rollback perspective test", "summary": "Test only", "stops": [{"place_id": "palais", "scene_id": "dungeon", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "pont-saint-michel", "scene_id": "bridge-phoebus", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "greve", "scene_id": "dance-greve", "reason": "Rollback evidence test", "minutes": 5}]}, {"perspective": "free", "title": "Rollback perspective test", "summary": "Test only", "stops": [{"place_id": "palais", "scene_id": "mystere", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "pont-saint-michel", "scene_id": "bridge-not-taken", "reason": "Rollback evidence test", "minutes": 5}, {"place_id": "pont-change", "scene_id": "bridge-turnback", "reason": "Rollback evidence test", "minutes": 5}]}]$fixtures$::jsonb) loop
  insert into public.literary_attempts(user_id) values(uid) returning id into attempt;
  gid:=public.save_literary_route(attempt,item,90,'test-only','Rollback perspective test');
  if not exists(select 1 from public.literary_routes where id=gid and content->>'perspective'=item->>'perspective') then raise exception 'Perspective not persisted'; end if;
 end loop;
 rejected:=false;
 begin
  perform public.save_literary_route(attempt,jsonb_set(item,'{perspective}','"invented"'),90,'test-only','Invalid perspective test');
 exception when others then
  if sqlerrm='Invalid perspective' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'Invalid perspective accepted'; end if;
 -- Gringoire's theatrical performance cannot be attributed to Quasimodo.
 rejected:=false;
 begin
  item:=jsonb_set(item,'{perspective}','"quasimodo"');
  item:=jsonb_set(item,'{stops,0,place_id}','"palais"');
  item:=jsonb_set(item,'{stops,0,scene_id}','"mystere"');
  perform public.save_literary_route(attempt,item,90,'test-only','Wrong character test');
 exception when others then
  if sqlerrm='Unsupported character-scene relation' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'Wrong character scene accepted'; end if;
end $$;
select 'PASS: all five perspectives saved, invalid perspective and mismatched character evidence rejected; transaction rolled back' as result;
rollback;
