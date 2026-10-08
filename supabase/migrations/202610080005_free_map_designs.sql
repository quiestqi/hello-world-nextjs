begin;
create table public.illustration_designs (
 generation_id uuid primary key references public.generation_illustrations(generation_id) on delete cascade,
 design jsonb not null, model text not null, created_at timestamptz not null default now()
);
alter table public.illustration_designs enable row level security;
revoke all on public.illustration_designs from anon,authenticated;
grant select on public.illustration_designs to authenticated;
create policy map_design_logged_in_read on public.illustration_designs for select to authenticated using(true);
create function public.save_illustration_design(p_id uuid,p_path text,p_model text,p_design jsonb) returns void language plpgsql security definer set search_path='' as $$
declare n integer; v text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select jsonb_array_length(content->'stops') into n from public.generations where id=p_id;
 if jsonb_typeof(p_design) is distinct from 'object' or pg_column_size(p_design)>10000 then raise exception 'Invalid design'; end if;
 foreach v in array array['background','ink','accent','foliage'] loop
  if coalesce(p_design->>v,'') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid colour'; end if;
 end loop;
 if jsonb_typeof(p_design->'captions') is distinct from 'array' or jsonb_typeof(p_design->'decorations') is distinct from 'array' then raise exception 'Invalid design arrays'; end if;
 if jsonb_array_length(p_design->'captions')<>n or jsonb_array_length(p_design->'decorations')>3 or length(coalesce(p_design->>'subtitle','')) not between 1 and 70 then raise exception 'Invalid design text'; end if;
 for v in select jsonb_array_elements_text(p_design->'captions') loop if length(v) not between 1 and 40 then raise exception 'Invalid caption'; end if; end loop;
 for v in select jsonb_array_elements_text(p_design->'decorations') loop if v not in ('sun','leaves','stars','camera','conversation') then raise exception 'Invalid decoration'; end if; end loop;
 update public.generation_illustrations set status='ready',storage_path=null,model=left(p_model,100),updated_at=now() where generation_id=p_id and user_id=auth.uid() and storage_path=p_path and status='pending';
 if not found then raise exception 'Invalid reservation'; end if;
 insert into public.illustration_designs(generation_id,design,model) values(p_id,p_design,left(p_model,100));
end $$;
revoke all on function public.save_illustration_design(uuid,text,text,jsonb) from public,anon;
grant execute on function public.save_illustration_design(uuid,text,text,jsonb) to authenticated;
commit;
