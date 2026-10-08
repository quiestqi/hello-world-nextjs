begin;
create table public.generation_illustrations (
 generation_id uuid primary key references public.generations(id) on delete cascade,
 user_id uuid not null references auth.users(id), status text not null check(status in ('pending','ready','failed')),
 storage_path text, model text, attempts integer not null default 1 check(attempts between 1 and 2),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.illustration_prompts (
 generation_id uuid primary key references public.generation_illustrations(generation_id) on delete cascade,
 user_id uuid not null references auth.users(id), prompt text not null
);
alter table public.generation_illustrations enable row level security;
alter table public.illustration_prompts enable row level security;
revoke all on public.generation_illustrations,public.illustration_prompts from anon,authenticated;
grant select on public.generation_illustrations,public.illustration_prompts to authenticated;
create policy illustrations_logged_in_read on public.generation_illustrations for select to authenticated using(true);
create policy illustration_prompt_owner on public.illustration_prompts for select to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('walk-illustrations','walk-illustrations',false,10485760,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy illustration_read on storage.objects for select to authenticated using(bucket_id='walk-illustrations' and exists(select 1 from public.generation_illustrations i where i.storage_path=name and i.status='ready'));
create policy illustration_upload on storage.objects for insert to authenticated with check(bucket_id='walk-illustrations' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.generation_illustrations i where i.storage_path=name and i.user_id=(select auth.uid()) and i.status='pending'));
create function public.claim_illustration(p_id uuid,p_prompt text) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); item public.generation_illustrations; dest text;
begin
 if uid is null or length(p_prompt) not between 1 and 12000 or not exists(select 1 from public.generations where id=p_id) then raise exception 'Invalid request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,2));
 select * into item from public.generation_illustrations where generation_id=p_id for update;
 if found and (item.status='ready' or (item.status='pending' and item.updated_at>now()-interval '3 minutes') or item.attempts>=2) then return null; end if;
 if (select count(*) from public.generation_illustrations where user_id=uid and updated_at>now()-interval '24 hours')>=5 then raise exception 'Daily illustration limit'; end if;
 dest:=uid::text||'/'||p_id::text||'/'||gen_random_uuid()::text;
 insert into public.generation_illustrations(generation_id,user_id,status,storage_path) values(p_id,uid,'pending',dest)
 on conflict(generation_id) do update set user_id=uid,status='pending',storage_path=dest,attempts=public.generation_illustrations.attempts+1,updated_at=now();
 insert into public.illustration_prompts(generation_id,user_id,prompt) values(p_id,uid,p_prompt) on conflict(generation_id) do update set user_id=uid,prompt=p_prompt;
 return dest;
end $$;
create function public.finish_illustration(p_id uuid,p_path text,p_model text,p_success boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_success and not exists(select 1 from storage.objects where bucket_id='walk-illustrations' and name=p_path) then raise exception 'Missing image'; end if;
 update public.generation_illustrations set status=case when p_success then 'ready' else 'failed' end,model=left(p_model,100),updated_at=now() where generation_id=p_id and user_id=auth.uid() and storage_path=p_path and status='pending';
 if not found then raise exception 'Invalid reservation'; end if;
end $$;
revoke all on function public.claim_illustration(uuid,text),public.finish_illustration(uuid,text,text,boolean) from public,anon;
grant execute on function public.claim_illustration(uuid,text),public.finish_illustration(uuid,text,text,boolean) to authenticated;
commit;
