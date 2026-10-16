import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const original=JSON.parse(readFileSync(new URL('../data/nddp-novel.json',import.meta.url),'utf8'));
const english=JSON.parse(readFileSync(new URL('../data/nddp-novel.en.json',import.meta.url),'utf8'));
test('English catalogue preserves all identities, character relationships and original evidence',()=>{
 for(const key of ['places','characters','scene_place_records'])assert.deepEqual(english[key].map(x=>x.id),original[key].map(x=>x.id));
 for(let i=0;i<original.scene_place_records.length;i++)for(const key of ['id','place_id','book','chapter','character_relations','evidence'])assert.deepEqual(english.scene_place_records[i][key],original.scene_place_records[i][key]);
 assert.doesNotMatch(JSON.stringify(english),/[\u3400-\u9fff]/);
});
const compiled={exports:{}};const code=ts.transpileModule(readFileSync(new URL('../lib/english-route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('module','exports',code)(compiled,compiled.exports);
test('legacy route display uses English evidence without changing stored content or stop identity',()=>{
 const route={title:'格兰古瓦的巴黎：初到巴黎',summary:'旧记录',stops:[{place_id:'p',scene_id:'s',reason:'旧说明',minutes:10}]};const before=JSON.stringify(route);
 const result=compiled.exports.englishRoute(route,[{id:'p',name:'Palais de Justice',scenes:[{id:'s',summary:'Gringoire presents his play.',book:1,chapter:2}]}],{id:'gringoire',name:'Pierre Gringoire'});
 assert.doesNotMatch(JSON.stringify(result),/[\u3400-\u9fff]/);assert.match(result.stops[0].reason,/Gringoire presents his play/);assert.equal(result.stops[0].place_id,'p');assert.equal(JSON.stringify(route),before);
});

test('Chinese route display restores canonical scene text without modifying stop IDs',()=>{
 const route={title:'Pierre Gringoire’s Paris: First steps in Paris',summary:'A solo walk.',stops:[{place_id:'p',scene_id:'s',reason:'Read the scene.',minutes:10}]};
 const result=compiled.exports.routeForLocale(route,[{id:'p',name:'司法宫',scenes:[{id:'s',summary:'格兰古瓦推动自己的圣迹剧上演。',book:1,chapter:2}]}],{id:'gringoire',name:'Pierre Gringoire'},'zh');
 assert.equal(result.title,'格兰古瓦的巴黎：初到巴黎');assert.match(result.stops[0].reason,/格兰古瓦推动/);assert.equal(result.stops[0].place_id,'p');
});
