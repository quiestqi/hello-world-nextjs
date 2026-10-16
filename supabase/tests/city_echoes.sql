-- Transactional privacy and persistence checks. No sample echo survives.
begin;
do $$ declare uid uuid;begin
 select user_id into uid from public.literary_test_accounts limit 1;
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
select public.save_city_echo(48.855,2.35,'__private_echo_test__',false);
select public.save_city_echo(48.855,2.35,'__public_echo_test__',true);
do $$ declare private_count integer;public_count integer;begin
 select count(*) into private_count from public.read_city_echoes() where body='__private_echo_test__';
 select count(*) into public_count from public.read_city_echoes() where body='__public_echo_test__';
 if private_count<>0 or public_count<>1 then raise exception 'Echo privacy failed';end if;
 if has_table_privilege('anon','public.literary_echoes','SELECT') or has_table_privilege('authenticated','public.literary_echoes','INSERT') then raise exception 'Raw echo access too broad';end if;
 if (select count(*) from public.literary_echoes where body in('__private_echo_test__','__public_echo_test__'))<>2 then raise exception 'Owner cannot read own echoes';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 if exists(select 1 from public.literary_echoes where body in('__private_echo_test__','__public_echo_test__')) then raise exception 'Other user can read private echoes';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.read_city_echoes() where body='__private_echo_test__') then raise exception 'Anonymous private leak';end if;
 if not exists(select 1 from public.read_city_echoes() where body='__public_echo_test__') then raise exception 'Public echo unavailable';end if;
end $$;
reset role;
select 'PASS: private and public echo isolation; author identifiers omitted; all samples rolled back' as result;
rollback;
