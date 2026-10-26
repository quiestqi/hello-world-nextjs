begin;
-- Named catalogues share a versioned document shape, while access stays RPC-only.
do $$declare t text;begin
 foreach t in array array['terms','ai_generation_examples','llm_models','llm_providers','allowed_signup_domains','whitelisted_emails','images','prompt_chains','prompt_chain_steps','prompt_chain_mix'] loop
 execute format('create table public.%I(id uuid primary key default gen_random_uuid(),data jsonb not null check(jsonb_typeof(data)=''object''),version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz)',t);
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
create table public.configuration_events(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,entity text not null,record_id uuid not null,action text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
create table public.generation_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,source text not null,chain_id uuid,model_id uuid,configuration jsonb not null,status text not null default 'started' check(status in('started','responded','validated','saved','failed')),prompt_snapshot text,media_ids uuid[] not null default '{}',error_category text,created_at timestamptz not null default now(),finished_at timestamptz);
create table public.llm_responses(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.generation_requests(id) on delete cascade,model_key text not null,http_status integer not null,latency_ms integer not null,usage jsonb not null default '{}',body jsonb not null,created_at timestamptz not null default now());
create index generation_requests_recent on public.generation_requests(created_at desc);
create index llm_responses_request on public.llm_responses(request_id);
create table public.generation_step_events(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.generation_requests(id) on delete cascade,stage text not null,status text not null,detail text,created_at timestamptz not null default now());
create table public.signup_admissions(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
insert into public.signup_admissions(user_id) select id from auth.users;
do $$declare t text;begin foreach t in array array['configuration_events','generation_requests','llm_responses','generation_step_events','signup_admissions'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);end loop;end $$;

create function public.week7_table(p_entity text) returns text language plpgsql immutable set search_path='' as $$begin
 if p_entity not in('terms','ai_generation_examples','llm_models','llm_providers','allowed_signup_domains','whitelisted_emails','images','prompt_chains','prompt_chain_steps','prompt_chain_mix','generation_requests','llm_responses','configuration_events') or p_entity is null then raise exception 'Unknown collection';end if;return p_entity;end $$;
revoke all on function public.week7_table(text) from public,anon,authenticated;

create function public.admin_catalogue(p_entity text,p_offset integer default 0,p_search text default '',p_trash boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare t text; result jsonb; condition text;
begin
 if not public.is_superadmin() then raise exception 'Administrator access required' using errcode='42501';end if;
 t:=public.week7_table(p_entity);
 if t in('generation_requests','llm_responses','configuration_events') then condition:='true';else condition:=case when p_trash then 'deleted_at is not null' else 'deleted_at is null' end;end if;
 execute format('select jsonb_build_object(''total'',(select count(*) from public.%1$I where %2$s and to_jsonb(%1$I)::text ilike $1),''rows'',(select coalesce(jsonb_agg(x),''[]''::jsonb) from (select * from public.%1$I where %2$s and to_jsonb(%1$I)::text ilike $1 order by created_at desc,id limit 30 offset $2)x))',t,condition) into result using '%'||left(coalesce(p_search,''),160)||'%',greatest(0,least(coalesce(p_offset,0),100000));
 return result;
end $$;

create function public.admin_observability() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception 'Administrator access required' using errcode='42501';end if;
 return jsonb_build_object('requests',(select count(*) from public.generation_requests),'saved',(select count(*) from public.generation_requests where status='saved'),'failed',(select count(*) from public.generation_requests where status='failed'),'responses',(select count(*) from public.llm_responses),'average_latency_ms',(select round(avg(latency_ms)) from public.llm_responses),'tokens',(select coalesce(sum(coalesce((usage->>'totalTokenCount')::bigint,0)),0) from public.llm_responses),
 'statuses',(select coalesce(jsonb_agg(x),'[]') from(select status,count(*) as count from public.generation_requests group by status)x),
 'days',(select jsonb_agg(x order by day) from(select d::date as day,(select count(*) from public.generation_requests r where r.created_at>=d and r.created_at<d+interval '1 day') as count from generate_series(date_trunc('day',now())-interval '6 days',date_trunc('day',now()),interval '1 day')d)x));end $$;
create function public.admin_trace(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception 'Administrator access required' using errcode='42501';end if;
 return jsonb_build_object('request',(select to_jsonb(r) from public.generation_requests r where id=p_id),'responses',(select coalesce(jsonb_agg(r order by created_at),'[]') from public.llm_responses r where request_id=p_id),'steps',(select coalesce(jsonb_agg(s order by created_at),'[]') from public.generation_step_events s where request_id=p_id));end $$;

create function public.admin_catalogue_write(p_entity text,p_id uuid,p_data jsonb,p_version integer,p_action text default 'save') returns uuid
language plpgsql security definer set search_path='' as $$
declare t text; old_row jsonb; d jsonb:=p_data; rid uuid:=coalesce(p_id,gen_random_uuid()); active boolean; ref uuid;
begin
 if not public.is_superadmin() then raise exception 'Administrator access required' using errcode='42501';end if;
 t:=public.week7_table(p_entity);
 if t in('prompt_chains','prompt_chain_steps','generation_requests','llm_responses','configuration_events') then raise exception 'This collection is read-only';end if;
 if p_action not in('save','delete','restore') or (t='prompt_chain_mix' and (p_action<>'save' or p_id is null)) then raise exception 'Invalid action';end if;
 -- Serialize catalogue changes so concurrently deleting a referenced model cannot invalidate a mix.
 perform pg_advisory_xact_lock(726026);
 if p_id is not null then
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',t) into old_row using p_id;
 if old_row is null then raise exception 'Record not found';end if;
 if (old_row->>'version')::int is distinct from p_version then raise exception 'Record changed. Reload before saving.';end if;
 if p_action='restore' then d:=old_row->'data';elsif old_row->>'deleted_at' is not null then raise exception 'Restore this record before editing';end if;
 end if;
 if p_action<>'delete' then
 if d is null or jsonb_typeof(d)<>'object' or octet_length(d::text)>30000 or length(trim(d->>'name')) not between 1 and 160 or d->>'name' is null then raise exception 'Name is required (maximum 160 characters)';end if;
 if d ? 'enabled' and jsonb_typeof(d->'enabled')<>'boolean' then raise exception 'Invalid enabled flag';end if;
 active:=coalesce((d->>'enabled')::boolean,true);
 if t='terms' and (length(trim(d->>'definition')) not between 1 and 2000 or d->>'definition' is null) then raise exception 'Definition is required';end if;
 if t='ai_generation_examples' then
 if d->>'purpose' not in('journey','poetry','illustration','admin-journey','legacy-walk') or length(trim(d->>'input_text')) not between 1 and 3000 or length(trim(d->>'output_text')) not between 1 and 5000 or d->>'input_text' is null or d->>'output_text' is null then raise exception 'Valid purpose, input and output are required';end if;
 end if;
 if t='llm_providers' then
 if d->>'adapter' not in('gemini','openai','anthropic') or d->>'adapter' is null then raise exception 'Invalid provider adapter';end if;
 if active and d->>'adapter'<>'gemini' then raise exception 'Only Gemini is executable in this app; keep other provider records disabled';end if;
 end if;
 if t='llm_models' then
 if coalesce(d->>'model_key','')!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$' or coalesce(d->>'max_output_tokens','')!~'^[0-9]{4}$' or (d->>'max_output_tokens')::int not between 1024 and 8192 then raise exception 'Invalid model identifier or token limit (1024–8192)';end if;
 ref:=(d->>'provider_id')::uuid;
 if not exists(select 1 from public.llm_providers where id=ref and deleted_at is null and (not active or (data->>'enabled')::boolean)) then raise exception 'Choose an available provider';end if;
 end if;
 if t='prompt_chain_mix' then
 if coalesce(d->>'weight','')!~'^[0-9]{1,4}$' or (d->>'weight')::int not between 0 and 1000 then raise exception 'Weight must be 0–1000';end if;
 if d->>'chain_id' is distinct from old_row->'data'->>'chain_id' or d->>'purpose' is distinct from old_row->'data'->>'purpose' then raise exception 'Chain and purpose are fixed';end if;
 if not exists(select 1 from public.prompt_chains where id=(d->>'chain_id')::uuid and deleted_at is null) then raise exception 'Unknown chain';end if;
 if not exists(select 1 from public.llm_models where id=(d->>'model_id')::uuid and deleted_at is null and (data->>'enabled')::boolean) then raise exception 'Choose an enabled model';end if;
 if (not active or (d->>'weight')::int=0) and not exists(select 1 from public.prompt_chain_mix where id<>p_id and data->>'purpose'=d->>'purpose' and deleted_at is null and (data->>'enabled')::boolean and (data->>'weight')::int>0) then raise exception 'Keep at least one positive, enabled mix for this purpose';end if;
 end if;
 if t='allowed_signup_domains' then
 d:=jsonb_set(d,'{domain}',to_jsonb(lower(trim(coalesce(d->>'domain','')))));
 if d->>'domain' !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then raise exception 'Enter a domain only, without @, protocol or wildcard';end if;
 if exists(select 1 from public.allowed_signup_domains where id<>rid and deleted_at is null and data->>'domain'=d->>'domain') then raise exception 'Domain already exists';end if;
 end if;
 if t='whitelisted_emails' then
 d:=jsonb_set(d,'{email}',to_jsonb(lower(trim(coalesce(d->>'email','')))));
 if d->>'email' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Enter a valid email address';end if;
 if exists(select 1 from public.whitelisted_emails where id<>rid and deleted_at is null and data->>'email'=d->>'email') then raise exception 'Email already exists';end if;
 end if;
 if t='images' then
 if d->>'mime_type' not in('image/jpeg','image/png','image/webp') or coalesce(d->>'size','')!~'^[0-9]{1,7}$' or (d->>'size')::int not between 1 and 5242880 or not exists(select 1 from storage.objects where bucket_id='admin-images' and name=d->>'storage_path') then raise exception 'Upload a JPG, PNG or WebP image, maximum 5 MB';end if;
 if length(trim(coalesce(d->>'alt_text',''))) not between 1 and 500 then raise exception 'Alternative text is required';end if;
 end if;
 end if;
 if t='llm_models' and (p_action='delete' or not coalesce((d->>'enabled')::boolean,true)) and exists(select 1 from public.prompt_chain_mix where deleted_at is null and (data->>'enabled')::boolean and (data->>'weight')::int>0 and data->>'model_id'=rid::text) then raise exception 'This model is used by an enabled mix. Change the mix first.';end if;
 if t='llm_providers' and (p_action='delete' or not coalesce((d->>'enabled')::boolean,true)) and exists(select 1 from public.llm_models where deleted_at is null and (data->>'enabled')::boolean and data->>'provider_id'=rid::text) then raise exception 'This provider has enabled models. Disable or move them first.';end if;
 if p_action='delete' then
 execute format('update public.%I set deleted_at=now(),updated_at=now(),version=version+1 where id=$1',t) using rid;
 elsif p_id is null then execute format('insert into public.%I(id,data) values($1,$2)',t) using rid,d;
 else execute format('update public.%I set data=$2,deleted_at=null,updated_at=now(),version=version+1 where id=$1',t) using rid,d;end if;
 insert into public.configuration_events(actor_id,entity,record_id,action,before_data,after_data) values(auth.uid(),t,rid,case when p_id is null then 'create' else p_action end,old_row->'data',case when p_action='delete' then null else d end);
 return rid;
end $$;

-- Initial records describe the application that actually exists; these are not fabricated generation logs.
insert into public.llm_providers(id,data) values('70000000-0000-4000-8000-000000000001','{"name":"Google AI Studio","adapter":"gemini","enabled":true,"notes":"API key remains in Vercel environment variables. No credentials are stored here."}');
insert into public.llm_models(id,data) values('70000000-0000-4000-8000-000000000002','{"name":"Gemini Flash Lite","provider_id":"70000000-0000-4000-8000-000000000001","model_key":"gemini-flash-lite-latest","max_output_tokens":4096,"enabled":true}');
insert into public.terms(data) values('{"name":"Modern reference point","definition":"A present-day map anchor for a location in Hugo’s novel; it does not prove that the historic building survives.","enabled":true}'),('{"name":"Character perspective","definition":"A way to read places through a character’s documented presence in the novel, without pretending to meet that character.","enabled":true}');
do $$declare purpose text; cid uuid; variant integer; step_names text[]:=array['Verified context','Compose structured text','Validate and save'];begin
 foreach purpose in array array['journey','poetry','illustration','admin-journey','legacy-walk'] loop
 for variant in 1..(case when purpose='journey' then 2 else 1 end) loop
 cid:=gen_random_uuid();
 insert into public.prompt_chains(id,data) values(cid,jsonb_build_object('name',purpose||case when variant=1 then ' / Poetic' else ' / Reflective' end,'purpose',purpose,'description','Verified source context → one Gemini structured-text call → application validation and persistence.','instruction',case when variant=1 then 'Use clear, restrained poetic language. Keep every supplied fact and output schema unchanged.' else 'Use a quiet, reflective voice, noticing thresholds, stone and the river. Keep every supplied fact and output schema unchanged.' end));
 for i in 1..3 loop insert into public.prompt_chain_steps(data) values(jsonb_build_object('name',step_names[i],'chain_id',cid,'position',i,'kind',case when i=2 then 'llm' else 'application' end,'instruction',case when i=1 then 'The application prepares verified context before the model call.' when i=2 then 'Apply the selected chain instruction to the existing task prompt and response schema.' else 'The application validates the returned structure and saves only accepted content.' end));end loop;
 insert into public.prompt_chain_mix(data) values(jsonb_build_object('name',purpose||case when variant=1 then ' / Poetic' else ' / Reflective' end,'purpose',purpose,'chain_id',cid,'model_id','70000000-0000-4000-8000-000000000002','weight',case when variant=1 then 90 else 10 end,'enabled',true));
 end loop;end loop;
end $$;
insert into public.allowed_signup_domains(data) values('{"name":"Columbia University","domain":"columbia.edu","enabled":true}'),('{"name":"Google accounts","domain":"gmail.com","enabled":true}');
insert into public.whitelisted_emails(data) select jsonb_build_object('name','Existing approved administrator','email',u.email,'enabled',true) from auth.users u join public.profiles p on p.id=u.id where p.is_superadmin;

create function public.signup_email_allowed(p_email text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.allowed_signup_domains where deleted_at is null and (data->>'enabled')::boolean and data->>'domain'=split_part(lower(p_email),'@',2)) or exists(select 1 from public.whitelisted_emails where deleted_at is null and (data->>'enabled')::boolean and data->>'email'=lower(p_email));$$;
revoke all on function public.signup_email_allowed(text) from public,anon,authenticated;
create function public.guard_staged_city_signup() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not public.signup_email_allowed(new.email) then raise exception 'Registration is limited to approved email domains or whitelisted addresses';end if;return new;end $$;
revoke all on function public.guard_staged_city_signup() from public,anon,authenticated;
create trigger staged_city_signup_guard before insert on auth.users for each row execute function public.guard_staged_city_signup();

create function public.start_generation_request(p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare mix public.prompt_chain_mix; chain public.prompt_chains; model public.llm_models; provider public.llm_providers; rid uuid; cfg jsonb;
begin
 if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'provider','')<>'google' then raise exception 'Google login required' using errcode='42501';end if;
 if p_source not in('journey','poetry','illustration','admin-journey','legacy-walk') then raise exception 'Unknown generation purpose';end if;
 perform pg_advisory_xact_lock(hashtextextended('trace:'||auth.uid()::text,0));
 if (select count(*) from public.generation_requests where user_id=auth.uid() and created_at>now()-interval '24 hours')>=100 then raise exception 'Generation logging limit reached';end if;
 select * into mix from public.prompt_chain_mix where deleted_at is null and data->>'purpose'=p_source and (data->>'enabled')::boolean and (data->>'weight')::int>0 order by -ln(greatest(random(),0.000000001))/(data->>'weight')::numeric limit 1;
 if not found then raise exception 'No enabled prompt mix for this purpose';end if;
 select * into chain from public.prompt_chains where id=(mix.data->>'chain_id')::uuid and deleted_at is null;
 select * into model from public.llm_models where id=(mix.data->>'model_id')::uuid and deleted_at is null and (data->>'enabled')::boolean;
 select * into provider from public.llm_providers where id=(model.data->>'provider_id')::uuid and deleted_at is null and (data->>'enabled')::boolean;
 if chain.id is null or model.id is null or provider.id is null or provider.data->>'adapter'<>'gemini' then raise exception 'Generation configuration is unavailable';end if;
 cfg:=jsonb_build_object('chain',chain,'model',model,'provider',provider,'mix',mix,'steps',(select jsonb_agg(s order by (s.data->>'position')::int) from public.prompt_chain_steps s where s.data->>'chain_id'=chain.id::text and s.deleted_at is null),'terms',(select coalesce(jsonb_agg(data order by created_at),'[]') from(select data,created_at from public.terms where deleted_at is null and (data->>'enabled')::boolean order by created_at limit 20)t),'examples',(select coalesce(jsonb_agg(data order by created_at),'[]') from(select data,created_at from public.ai_generation_examples where deleted_at is null and (data->>'enabled')::boolean and data->>'purpose'=p_source order by created_at limit 3)e));
 insert into public.generation_requests(user_id,source,chain_id,model_id,configuration) values(auth.uid(),p_source,chain.id,model.id,cfg) returning id into rid;
 insert into public.generation_step_events(request_id,stage,status,detail) values(rid,'context','complete','Application prepared the task context and selected a weighted prompt chain.');
 return jsonb_build_object('id',rid,'configuration',cfg);
end $$;

create function public.record_llm_response(p_request uuid,p_prompt text,p_model text,p_status integer,p_latency integer,p_body jsonb,p_usage jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.generation_requests where id=p_request and user_id=auth.uid() and status='started') then raise exception 'Invalid request' using errcode='42501';end if;
 if p_status not between 100 and 599 or p_latency not between 0 and 180000 or length(p_model) not between 1 and 100 or length(p_prompt)>60000 or octet_length(p_body::text)>150000 or octet_length(p_usage::text)>10000 then raise exception 'Response exceeds logging bounds';end if;
 if (select count(*) from public.llm_responses where request_id=p_request)>=4 then raise exception 'Too many provider attempts';end if;
 insert into public.llm_responses(request_id,model_key,http_status,latency_ms,usage,body) values(p_request,p_model,p_status,p_latency,p_usage,p_body);
 update public.generation_requests set prompt_snapshot=p_prompt where id=p_request;
 insert into public.generation_step_events(request_id,stage,status,detail) values(p_request,'llm',case when p_status between 200 and 299 then 'complete' else 'failed' end,'Provider HTTP '||p_status||'; model '||p_model);
end $$;
create function public.finish_generation_request(p_request uuid,p_status text,p_error text default null,p_media_ids uuid[] default '{}') returns void language plpgsql security definer set search_path='' as $$
declare r public.generation_requests;begin
 select * into r from public.generation_requests where id=p_request and user_id=auth.uid() for update;
 if not found then raise exception 'Invalid request' using errcode='42501';end if;
 if p_status not in('responded','validated','saved','failed') or (r.status in('saved','failed') and p_status<>r.status) or length(coalesce(p_error,''))>300 or cardinality(p_media_ids)>3 then raise exception 'Invalid completion';end if;
 if cardinality(p_media_ids)>0 and exists(select 1 from unnest(p_media_ids) m where not exists(select 1 from public.literary_routes where id=m and user_id=auth.uid()) and not exists(select 1 from public.generations where id=m and creator_id=auth.uid())) then raise exception 'Media is not owned by this user';end if;
 update public.generation_requests set status=p_status,error_category=p_error,media_ids=case when cardinality(p_media_ids)>0 then p_media_ids else media_ids end,finished_at=case when p_status in('saved','failed') then now() else finished_at end where id=p_request;
 insert into public.generation_step_events(request_id,stage,status,detail) values(p_request,case when p_status='responded' then 'llm' else 'validation-and-save' end,p_status,p_error);
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('admin-images','admin-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy admin_library_read on storage.objects for select to authenticated using(bucket_id='admin-images' and (select public.is_superadmin()));
create policy admin_library_upload on storage.objects for insert to authenticated with check(bucket_id='admin-images' and (select public.is_superadmin()));
-- Files are immutable. Library deletes are soft deletes; bytes remain private and recoverable.
revoke all on function public.admin_catalogue(text,integer,text,boolean),public.admin_observability(),public.admin_trace(uuid),public.admin_catalogue_write(text,uuid,jsonb,integer,text),public.start_generation_request(text),public.record_llm_response(uuid,text,text,integer,integer,jsonb,jsonb),public.finish_generation_request(uuid,text,text,uuid[]) from public,anon;
grant execute on function public.admin_catalogue(text,integer,text,boolean),public.admin_observability(),public.admin_trace(uuid),public.admin_catalogue_write(text,uuid,jsonb,integer,text),public.start_generation_request(text),public.record_llm_response(uuid,text,text,integer,integer,jsonb,jsonb),public.finish_generation_request(uuid,text,text,uuid[]) to authenticated;
commit;
