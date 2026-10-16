begin;
create or replace function public.save_literary_route(p_attempt uuid,p_content jsonb,p_duration integer,p_model text,p_prompt text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); gid uuid; stop jsonb; ids text[]:='{}'; minutes integer:=0; perspective text:=coalesce(p_content->>'perspective','gringoire');
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if perspective not in('gringoire','esmeralda','quasimodo','claude','free') then raise exception 'Invalid perspective'; end if;
 if p_duration is null or p_duration not in(60,90,120) or p_model is null or length(p_model) not between 1 and 100 or p_prompt is null or length(p_prompt) not between 1 and 60000 then raise exception 'Invalid metadata'; end if;
 if jsonb_typeof(p_content->'title') is distinct from 'string' or length(p_content->>'title') not between 1 and 80 or jsonb_typeof(p_content->'summary') is distinct from 'string' or length(p_content->>'summary') not between 1 and 500 or jsonb_typeof(p_content->'stops') is distinct from 'array' then raise exception 'Invalid content'; end if;
 if jsonb_array_length(p_content->'stops') not between 3 and 4 then raise exception 'Invalid stops'; end if;
 for stop in select * from jsonb_array_elements(p_content->'stops') loop
  if not exists(select 1 from public.literary_places where id=stop->>'place_id' and map_reference is not null and jsonb_typeof(map_reference)='object')
   or (stop->>'place_id')=any(ids) or jsonb_typeof(stop->'reason') is distinct from 'string' or length(stop->>'reason') not between 1 and 300
   or jsonb_typeof(stop->'scene_id') is distinct from 'string' or not exists(select 1 from public.literary_scenes where id=stop->>'scene_id')
   or coalesce(stop->>'minutes','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid stop'; end if;
  -- The selected scene must belong to this place or its nested spaces, and support the selected perspective (free mode accepts any sourced scene).
  if not exists(
   with recursive family as (
    select id from public.literary_places where id=stop->>'place_id'
    union all select p.id from public.literary_places p join family f on p.data->>'parent_id'=f.id
   ) select 1 from public.literary_scenes s join family f on f.id=s.place_id,
   lateral jsonb_array_elements(s.data->'character_relations') r
   where s.id=stop->>'scene_id' and (perspective='free' or (r->>'character_id'=perspective and r->>'relation' in('present','passed_through','spectator_inside','at_window','resident','visited_in_backstory','lived_as_infant','repeated_visit_reported','passed_through_reported','uses_room','present_under_alias','nearby_spectator','passed_street_entrance','outside_only','testifies_inside','visited_reported','boat_passage','present_as_infant','approached_or_at_bridgehead_not_confirmed_crossing')))
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

commit;
