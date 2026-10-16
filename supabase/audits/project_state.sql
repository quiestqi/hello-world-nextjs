-- Read-only inspection for Supabase SQL Editor (project administrator).
-- Returns schema/security metadata and aggregate counts, never user details.
begin transaction read only;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('coffees', 'profiles', 'places', 'generations',
    'generation_prompts', 'generation_attempts', 'votes',
    'generation_illustrations', 'illustration_prompts', 'illustration_designs')
order by table_name, ordinal_position;

select schemaname, tablename, rowsecurity
from pg_tables where schemaname = 'public' order by tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select t.tgname, pg_get_triggerdef(t.oid) as definition, t.tgenabled
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;

select n.nspname as schema_name, p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
  p.proconfig as function_settings, p.proacl as privileges,
  pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in
  ('handle_new_user', 'reserve_generation', 'save_generation', 'vote_totals',
   'claim_illustration', 'finish_illustration', 'save_illustration_design')
order by p.proname;

select grantee, table_name, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select grantee, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, column_name, grantee, privilege_type;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id in ('avatars', 'walk-illustrations');

-- Missing tables are reported explicitly; no table is created by this audit.
do $$
declare missing_profiles bigint;
begin
  if to_regclass('public.profiles') is null then
    raise notice 'profiles table is missing';
  else
    execute 'select count(*) from auth.users u where not exists
      (select 1 from public.profiles p where p.id = u.id)' into missing_profiles;
    raise notice 'auth users without profile rows: %', missing_profiles;
  end if;
end $$;

rollback;
