begin;
-- Administrator-managed quota exceptions. Clients cannot read or modify the list.
create table if not exists public.literary_test_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.literary_test_accounts enable row level security;
revoke all on public.literary_test_accounts from public,anon,authenticated;

create or replace function public.is_literary_test_account() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.literary_test_accounts where user_id=auth.uid());
$$;
revoke all on function public.is_literary_test_account() from public,anon;
grant execute on function public.is_literary_test_account() to authenticated;

create or replace function public.reserve_literary_generation() returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); attempt uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.profiles where id=uid and length(trim(first_name))>0 and length(trim(last_name))>0) then raise exception 'Complete your profile'; end if;
 perform pg_advisory_xact_lock(hashtextextended('literary:'||uid::text,0));
 if not public.is_literary_test_account() and (select count(*) from public.literary_attempts where user_id=uid and created_at>now()-interval '24 hours')>=5 then raise exception 'Daily generation limit reached'; end if;
 insert into public.literary_attempts(user_id) values(uid) returning id into attempt;
 return attempt;
end $$;
revoke all on function public.reserve_literary_generation() from public,anon;
grant execute on function public.reserve_literary_generation() to authenticated;
commit;
