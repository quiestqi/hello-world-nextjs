begin;
-- A generation attempt can yield up to three comparable options; quota still counts once.
alter table public.literary_routes drop constraint if exists literary_routes_attempt_id_key;
create or replace function public.save_literary_options(p_attempt uuid,p_options jsonb,p_duration integer,p_model text,p_prompt text) returns uuid[]
language plpgsql security definer set search_path='' as $$
declare option jsonb; result uuid[]:='{}'; route_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(p_options) is distinct from 'array' or jsonb_array_length(p_options) not between 1 and 3 then raise exception 'Invalid options'; end if;
 perform 1 from public.literary_attempts where id=p_attempt and user_id=auth.uid() and not used and created_at>now()-interval '5 minutes' for update;
 if not found then raise exception 'Invalid reservation'; end if;
 for option in select * from jsonb_array_elements(p_options) loop
  update public.literary_attempts set used=false where id=p_attempt and user_id=auth.uid();
  route_id:=public.save_literary_route(p_attempt,option,p_duration,p_model,p_prompt);
  result:=array_append(result,route_id);
 end loop;
 return result;
end $$;
revoke all on function public.save_literary_options(uuid,jsonb,integer,text,text) from public;
grant execute on function public.save_literary_options(uuid,jsonb,integer,text,text) to authenticated;
commit;
