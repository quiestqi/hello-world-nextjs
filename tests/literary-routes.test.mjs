import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLiteraryRoute, literaryDirections, planCatalogueJourney } from '../lib/literary-routes.ts';
const catalogue=[{id:'a',name:'A',lat:48.85,lng:2.34,scenes:[{id:'sa'}]},{id:'b',name:'B',lat:48.856,lng:2.35,scenes:[{id:'sb'}]},{id:'c',name:'C',lat:48.853,lng:2.35,scenes:[{id:'sc'}]}];
const route=()=>({title:'巴黎探索',summary:'原著依据',stops:catalogue.map(p=>({place_id:p.id,scene_id:p.scenes[0].id,reason:'观察建筑外部',minutes:10}))});
test('accepts a compact sourced itinerary and keeps navigation order',()=>{const r=validateLiteraryRoute(route(),catalogue,90);const url=new URL(literaryDirections(r.stops,catalogue));assert.equal(url.searchParams.get('origin'),'48.85,2.34');assert.equal(url.searchParams.get('waypoints'),'48.856,2.35');assert.equal(url.searchParams.get('destination'),'48.853,2.35');});
test('rejects invented places, duplicate stops and a scene belonging to another place',()=>{for(const patch of [{place_id:'ghost'},{place_id:'a'},{scene_id:'sa'}]){const r=route();Object.assign(r.stops[1],patch);assert.throws(()=>validateLiteraryRoute(r,catalogue,90));}});
test('rejects impossible distances, fractional minutes and over-budget stops',()=>{const r=route();r.stops[0].minutes=7.5;assert.throws(()=>validateLiteraryRoute(r,catalogue,90));assert.throws(()=>validateLiteraryRoute(route(),catalogue.map(p=>p.id==='c'?{...p,lat:49}:p),90));const long=route();long.stops.forEach(s=>s.minutes=30);assert.throws(()=>validateLiteraryRoute(long,catalogue,60));});

const sourced = [...catalogue, {id:'d',name:'D',lat:48.854,lng:2.345,scenes:[{id:'sd'}]}].map(p=>({...p,scenes:p.scenes.map(s=>({...s,summary:'人物在这里经过。',book:1,chapter:2}))}));
test('catalogue fallback uses sourced stops and respects all duration budgets',()=>{
  for(const theme of ['First Arrival in Paris','Poet and City','Choices in the Story']) for(const duration of [60,90,120]) {
    const result=planCatalogueJourney(sourced,theme,duration);
    assert.match(result.summary,/not AI/i);
    assert.deepEqual(validateLiteraryRoute(result,sourced,duration),result);
    for(const stop of result.stops) assert.match(stop.reason,/Book 1, Chapter 2/);
  }
});
test('catalogue fallback avoids previous place combinations and rejects insufficient evidence',()=>{
  const first=planCatalogueJourney(sourced,'First Arrival in Paris',60);
  const second=planCatalogueJourney(sourced,'First Arrival in Paris',60,[first.stops.map(s=>s.place_id)]);
  assert.notDeepEqual(second.stops.map(s=>s.place_id).sort(),first.stops.map(s=>s.place_id).sort());
  assert.throws(()=>planCatalogueJourney(sourced.slice(0,2),'First Arrival in Paris',60));
  assert.throws(()=>planCatalogueJourney(sourced,'unknown',60));
});
