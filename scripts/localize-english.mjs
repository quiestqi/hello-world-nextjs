if (process.argv.includes('--bilingual')) { await import('./build-bilingual.mjs'); process.exit(0); }
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
const cjk=/[\u3400-\u9fff]/;
const files=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(/\.(tsx?|mjs)$/.test(p))files.push(p);}}
await walk('app'); await walk('lib');
const strings=new Set();
const edits=new Map();
for(const file of files){
 const source=await fs.readFile(file,'utf8'); const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const spans=[];
 function visit(n){
  if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&cjk.test(n.text)){strings.add(n.text);spans.push({start:n.getStart(ast),end:n.getEnd(),text:n.text,type:'literal'});return;}
  if(ts.isJsxText(n)&&cjk.test(n.text)){strings.add(n.text);spans.push({start:n.getStart(ast,false),end:n.getEnd(),text:n.text,type:'jsx'});return;}
  if((ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))&&cjk.test(n.text)){
   const start=n.getStart(ast)+1,end=n.getEnd()-(ts.isTemplateTail(n)?1:2),raw=source.slice(start,end);strings.add(raw);spans.push({start,end,text:raw,type:'template'});return;
  }
  ts.forEachChild(n,visit);
 }visit(ast);if(spans.length)edits.set(file,{source,spans});
}
const archive=JSON.parse(await fs.readFile('data/nddp-novel.json','utf8'));
function collect(x){if(typeof x==='string'&&cjk.test(x))strings.add(x);else if(Array.isArray(x))x.forEach(collect);else if(x&&typeof x==='object')Object.values(x).forEach(collect);}collect(archive);
const list=[...strings]; const cacheFile='data/english-translations.json';let translations={};try{translations=JSON.parse(await fs.readFile(cacheFile,'utf8'));}catch{}
const missing=list.filter(s=>!(s in translations));
console.log(JSON.stringify({uniqueStrings:list.length,missing:missing.length,sourceFiles:edits.size}));
const key=process.env.GEMINI_API_KEY;if(!key)throw Error('Gemini configuration missing');
const batches=[];for(let i=0;i<missing.length;i+=45)batches.push(missing.slice(i,i+45));
for(let begin=0;begin<batches.length;begin+=3){
 const groups=await Promise.all(batches.slice(begin,begin+3).map(async chunk=>{
  const input=chunk.map((text,id)=>({id,text}));
  const prompt=`Translate EVERY Chinese/Han character, including character names, into English or Latin-script French. The output must contain ZERO Chinese characters. Translate all Chinese text into polished, concise English for STAGED CITY, a literary walking website based on Hugo's NOVEL Notre-Dame de Paris. Preserve factual meaning, all numbers, names and distinctions about uncertainty, historical vs modern locations, actual vs merely intended visits. Use standard English names for characters (Pierre Gringoire, Esmeralda, Quasimodo, Claude Frollo). Keep French proper place names when natural, use English descriptive names for interior spaces. Preserve leading/trailing whitespace where it separates text from dynamic values. Short fragments are UI template fragments: translate without inventing missing values. Translate role labels and errors too. Never add HTML, markdown or instructions. Output JSON {translations:[{id,text}]} with the same item count and ids. Data: ${JSON.stringify(input)}`;
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL||'gemini-flash-lite-latest'}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',maxOutputTokens:16000,responseSchema:{type:'OBJECT',properties:{translations:{type:'ARRAY',items:{type:'OBJECT',properties:{id:{type:'INTEGER'},text:{type:'STRING'}},required:['id','text']}}},required:['translations']}}}),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error(`Translation request failed with HTTP ${response.status}`);
  const result=await response.json();const candidate=result.candidates?.[0];if(candidate?.finishReason!=='STOP')throw Error('Incomplete translation');
  const raw=candidate.content.parts.filter(p=>p.text&&!p.thought).map(p=>p.text).join('');const items=JSON.parse(raw).translations;
  if(items.length!==chunk.length||new Set(items.map(p=>p.id)).size!==chunk.length)throw Error('Invalid translation count');
  for(const item of items)if(!Number.isInteger(item.id)||item.id<0||item.id>=chunk.length||typeof item.text!=='string'||cjk.test(item.text)){console.log(JSON.stringify({invalidSource:chunk[item.id],invalidTranslation:item.text}));throw Error('Invalid translation');}
  return items.map(p=>[chunk[p.id],p.text]);
 }));for(const group of groups)Object.assign(translations,Object.fromEntries(group));await fs.writeFile(cacheFile,JSON.stringify(translations,null,2)+'\n');console.log(`Translated ${Math.min(begin+3,batches.length)}/${batches.length} batches`);
}
for(const [file,{source,spans}] of edits){let next=source;for(const span of spans.sort((a,b)=>b.start-a.start)){const translated=translations[span.text];if(translated===undefined)throw Error('Missing text');const replacement=span.type==='literal'?JSON.stringify(translated):span.type==='template'?translated.replace(/`/g,'\\`').replace(/\$\{/g,'\\${'):translated.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/{/g,'&#123;').replace(/}/g,'&#125;');next=next.slice(0,span.start)+replacement+next.slice(span.end);}await fs.writeFile(file,next);}
function localize(x){if(typeof x==='string')return translations[x]??x;if(Array.isArray(x))return x.map(localize);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,localize(v)]));return x;}
await fs.writeFile('data/nddp-novel.en.json',JSON.stringify(localize(archive),null,2)+'\n');
console.log('English UI and parallel source catalogue written; original novel data retained.');
