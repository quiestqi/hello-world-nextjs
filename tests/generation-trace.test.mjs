import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(fs.readFileSync('lib/gemini-json.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function gateway(fetcher){
 const calls=[],finished=[];
 const db={rpc:async(name,args)=>{calls.push([name,args]);return name==='start_generation_request'?{data:{id:'trace-1',configuration:{chain:{data:{instruction:'Reflect on thresholds.'}},model:{data:{model_key:'gemini-test-flash',max_output_tokens:2048}},terms:[{name:'stage'}],examples:[{output_text:'Quiet stone.'}]}}}:{error:null};}};
 const exp={};
 const req=name=>name==='server-only'?{}:name==='./supabase/server'?{createClient:async()=>db}:{finishTrace:async(...args)=>finished.push(args),redactTraceText:s=>s.replace(/\b[^\s]+@[^\s]+/g,'[email]')};
 new Function('require','exports','fetch',compiled)(req,exp,fetcher);
 return {run:exp.requestGeminiJson,calls,finished};
}
test('live model configuration and editorial data reach provider; private wish does not reach trace',async()=>{
 let sent;const g=gateway(async(url,init)=>{sent={url,init};return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"title":"Quiet Paris"}'},{text:'internal',thought:true}]}}],usageMetadata:{totalTokenCount:88}}),{status:200});});
 const result=await g.run('secret-key','task private-wish',{}, {source:'journey',logPrompt:'task [wish omitted]'});
 assert.equal(result.traceId,'trace-1');assert.match(sent.url,/gemini-test-flash/);
 const body=JSON.parse(sent.init.body);assert.equal(body.generationConfig.maxOutputTokens,2048);assert.match(body.contents[0].parts[0].text,/Reflect on thresholds/);assert.match(body.contents[0].parts[0].text,/Quiet stone/);
 const log=g.calls.find(([name])=>name==='record_llm_response')[1];assert.doesNotMatch(JSON.stringify(log),/secret-key|private-wish|internal/);assert.match(log.p_prompt,/wish omitted/);assert.equal(log.p_usage.totalTokenCount,88);assert.deepEqual(g.finished,[['trace-1','responded',undefined]]);
});
test('HTTP failure records a safe status and never marks saved',async()=>{
 const g=gateway(async()=>new Response(JSON.stringify({error:{message:'secret provider detail'}}),{status:429}));await g.run('secret-key','task');
 const log=g.calls.find(([name])=>name==='record_llm_response')[1];assert.equal(log.p_status,429);assert.doesNotMatch(JSON.stringify(log),/secret provider detail/);assert.equal(g.finished.at(-1)[1],'failed');
});
test('transport failure becomes a failed trace and propagates to caller',async()=>{
 const g=gateway(async()=>{throw new TypeError('offline');});await assert.rejects(g.run('secret-key','task'),/offline/);assert.ok(g.finished.every(([,status])=>status==='failed'));assert.equal(g.calls.filter(([name])=>name==='record_llm_response').length,0);
});
