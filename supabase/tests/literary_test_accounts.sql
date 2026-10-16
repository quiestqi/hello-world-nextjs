-- Run as administrator. Quota reservations below roll back.
begin;
do $$ declare uid uuid; begin
 select t.user_id into uid from public.literary_test_accounts t join public.profiles p on p.id=t.user_id where length(trim(p.first_name))>0 and length(trim(p.last_name))>0 limit 1;
 if uid is null then raise exception 'Configured tester with complete profile required'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare i integer; begin
 if not public.is_literary_test_account() then raise exception 'Tester not recognized'; end if;
 for i in 1..6 loop perform public.reserve_literary_generation(); end loop;
 if has_table_privilege('authenticated','public.literary_test_accounts','INSERT') or has_table_privilege('authenticated','public.literary_test_accounts','SELECT') then raise exception 'Client can access quota exception list'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 if public.is_literary_test_account() then raise exception 'Unlisted user recognized as tester'; end if;
end $$;
reset role;
select 'PASS: six reservations allowed, test list private, unlisted account not exempt; all test reservations rolled back' as result;
rollback;
