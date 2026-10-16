import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { planCatalogueJourney, validateLiteraryRoute } from '../lib/literary-routes.ts';
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
const {scenesAt,physicalRelations}=loadModule(resolve('lib/paris-data.ts'));
const {journeyPerspectives}=loadModule(resolve('lib/literary-perspectives.ts'));
test('every offered character has enough real sourced places for a walk',()=>{
  for(const perspective of journeyPerspectives) {
    const candidates=candidatesForPerspective(perspective.id);
    assert.ok(candidates.length>=3,perspective.id);
    for(const duration of [60,90,120]) {
      const route=planCatalogueJourney(candidates,'First Arrival in Paris',duration,[],perspective);
      validateLiteraryRoute(route,candidates,duration);
      assert.match(route.title,new RegExp(perspective.name));
      for(const stop of route.stops) {
        const scene=scenesAt(stop.place_id).find(s=>s.id===stop.scene_id);
        assert.ok(scene);
        if(perspective.id!=='free') assert.ok(scene.character_relations.some(r=>r.character_id===perspective.id&&physicalRelations.has(r.relation)));
      }
    }
  }
});
test('free exploration includes places beyond Gringoire and unknown characters have no candidates',()=>{
  const gringoire=new Set(candidatesForPerspective('gringoire').map(p=>p.id));
  assert.ok(candidatesForPerspective('free').some(p=>!gringoire.has(p.id)));
  assert.deepEqual(candidatesForPerspective('invented'),[]);
});
