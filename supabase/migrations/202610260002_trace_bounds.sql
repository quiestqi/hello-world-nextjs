-- Preserve unlimited test access and validate provider usage counters.
create or replace function public.start_generation_request(p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare mix public.prompt_chain_mix; chain public.prompt_chains; model public.llm_models; provider public.llm_providers; rid uuid; cfg jsonb;
begin
 if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'provider','')<>'google' then raise exception 'Google login required' using errcode='42501';end if;
 if p_source not in('journey','poetry','illustration','admin-journey','legacy-walk') then raise exception 'Unknown generation purpose';end if;
 perform pg_advisory_xact_lock(hashtextextended('trace:'||auth.uid()::text,0));
 if not exists(select 1 from public.literary_test_accounts where user_id=auth.uid()) and (select count(*) from public.generation_requests where user_id=auth.uid() and created_at>now()-interval '24 hours')>=100 then raise exception 'Generation logging limit reached';end if;
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

create or replace function public.record_llm_response(p_request uuid,p_prompt text,p_model text,p_status integer,p_latency integer,p_body jsonb,p_usage jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.generation_requests where id=p_request and user_id=auth.uid() and status='started') then raise exception 'Invalid request' using errcode='42501';end if;
 if p_status not between 100 and 599 or p_latency not between 0 and 180000 or length(p_model) not between 1 and 100 or length(p_prompt)>60000 or octet_length(p_body::text)>150000 or octet_length(p_usage::text)>10000 then raise exception 'Response exceeds logging bounds';end if;
 if jsonb_typeof(p_usage) is distinct from 'object' or exists(select 1 from jsonb_each(p_usage) u where u.key like '%TokenCount' and (u.value::text!~'^[0-9]{1,12}$')) then raise exception 'Invalid token usage';end if;
 if (select count(*) from public.llm_responses where request_id=p_request)>=4 then raise exception 'Too many provider attempts';end if;
 insert into public.llm_responses(request_id,model_key,http_status,latency_ms,usage,body) values(p_request,p_model,p_status,p_latency,p_usage,p_body);
 update public.generation_requests set prompt_snapshot=p_prompt where id=p_request;
 insert into public.generation_step_events(request_id,stage,status,detail) values(p_request,'llm',case when p_status between 200 and 299 then 'complete' else 'failed' end,'Provider HTTP '||p_status||'; model '||p_model);
end $$;

create or replace function public.finish_generation_request(p_request uuid,p_status text,p_error text default null,p_media_ids uuid[] default '{}') returns void language plpgsql security definer set search_path='' as $$
declare r public.generation_requests;begin
 select * into r from public.generation_requests where id=p_request and user_id=auth.uid() for update;
 if not found then raise exception 'Invalid request' using errcode='42501';end if;
 if p_status not in('responded','validated','saved','failed') or (r.status in('saved','failed') and p_status<>r.status) or length(coalesce(p_error,''))>300 or cardinality(p_media_ids)>3 then raise exception 'Invalid completion';end if;
 if cardinality(p_media_ids)>0 and exists(select 1 from unnest(p_media_ids) m where not exists(select 1 from public.literary_routes where id=m and user_id=auth.uid()) and not exists(select 1 from public.generations where id=m and creator_id=auth.uid())) then raise exception 'Media is not owned by this user';end if;
 update public.generation_requests set status=p_status,error_category=p_error,media_ids=case when cardinality(p_media_ids)>0 then p_media_ids else media_ids end,finished_at=case when p_status in('validated','saved','failed') then now() else finished_at end where id=p_request;
 insert into public.generation_step_events(request_id,stage,status,detail) values(p_request,case when p_status='responded' then 'llm' else 'validation-and-save' end,p_status,p_error);
end $$;
