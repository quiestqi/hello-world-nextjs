import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {validateLiteraryRoute} from '../lib/literary-routes.ts';
const require = createRequire(import.meta.url);
// Compile the real catalogue modules with their JSON imports for Node's test runner.
function loadModule(path) {
  if(path.endsWith('.json')) return JSON.parse(readFileSync(path,'utf8'));
  const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const compiled={exports:{}};
  const localRequire=id=>id.startsWith('@/')?loadModule(resolve(id.slice(2))):id.startsWith('.')?loadModule(resolve(dirname(path),id+'.ts')):require(id);
  new Function('require','module','exports',source)(localRequire,compiled,compiled.exports);
  return compiled.exports;
}
const {candidatesForPerspective}=loadModule(resolve('lib/literary-candidates.ts'));
const {journeyPerspectives}=loadModule(resolve('lib/literary-perspectives.ts'));

const {buildVerifiedJourneyPlans,assembleWrittenJourneys}=loadModule(resolve('lib/journey-plans.ts'));
test('all roles and available starts yield three verified options without AI dwell fields',()=>{
 for(const p of journeyPerspectives){const candidates=candidatesForPerspective(p.id);for(const start of ['any',...candidates.map(c=>c.id)]){
 const plans=buildVerifiedJourneyPlans(candidates,'First Arrival in Paris',120,[],p,start);
 assert.ok(plans.length>=3,`${p.id}:${start}`);
 for(const plan of plans){validateLiteraryRoute(plan.route,candidates,120);if(start!=='any')assert.equal(plan.route.stops[0].place_id,start);}
 const text={routes:plans.slice(0,3).map(plan=>({path_id:plan.id,title:'A walk',summary:'A sourced walk',reasons:plan.route.stops.map(()=> 'Read the scene here.')}))};
 const result=assembleWrittenJourneys(text,plans,candidates,120,p.id);
 assert.equal(result.length,3);
 for(let i=0;i<3;i++)assert.deepEqual(result[i].stops.map(s=>({place_id:s.place_id,scene_id:s.scene_id,minutes:s.minutes})),plans[i].route.stops.map(s=>({place_id:s.place_id,scene_id:s.scene_id,minutes:s.minutes})));
 }}
});
test('writing cannot invent paths, duplicate choices or replace original scene identities',()=>{
 const p=journeyPerspectives[0],candidates=candidatesForPerspective(p.id),plans=buildVerifiedJourneyPlans(candidates,'First Arrival in Paris',120,[],p);
 const valid=()=>({routes:plans.slice(0,3).map(plan=>({path_id:plan.id,title:'A walk',summary:'A sourced walk',reasons:plan.route.stops.map(()=> 'Read the scene here.'),stops:[{place_id:'invented',scene_id:'invented',minutes:0}]}))});
 assert.equal(assembleWrittenJourneys(valid(),plans,candidates,120,p.id)[0].stops[0].place_id,plans[0].route.stops[0].place_id);
 const ghost=valid();ghost.routes[0].path_id='invented';assert.throws(()=>assembleWrittenJourneys(ghost,plans,candidates,120,p.id));
 const duplicate=valid();duplicate.routes[1].path_id=duplicate.routes[0].path_id;assert.throws(()=>assembleWrittenJourneys(duplicate,plans,candidates,120,p.id));
 const long=valid();long.routes[0].reasons[0]='x'.repeat(301);assert.throws(()=>assembleWrittenJourneys(long,plans,candidates,120,p.id));
});
