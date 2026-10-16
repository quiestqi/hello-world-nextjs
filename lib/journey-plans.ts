import {planCatalogueJourney,validateLiteraryRoute,type LiteraryRoute,type RouteCandidate} from './literary-routes';
export type VerifiedJourneyPlan = {id:string;route:LiteraryRoute};
// Geography, scene identity and dwell values are verified before asking the writer.
export function buildVerifiedJourneyPlans(candidates:RouteCandidate[],theme:string,duration:number,previous:string[][],perspective:{id:string;name:string},start='any',preferCatalogueOrder=false):VerifiedJourneyPlan[]{
 const first=planCatalogueJourney(candidates,theme,duration,previous,perspective,start,preferCatalogueOrder);
 const picked=first.stops.map(s=>s.place_id);
 const ordered=[...candidates].sort((a,b)=>{
  const rank=(id:string)=>picked.includes(id)?picked.indexOf(id):picked.length+candidates.findIndex(c=>c.id===id);
  return rank(a.id)-rank(b.id);
 });
 const valid:LiteraryRoute[]=[first];
 const signatures=new Set([first.stops.map(s=>s.place_id).join('|')]);
 for(const a of ordered)for(const b of ordered)for(const c of ordered){
  if((start!=='any'&&a.id!==start)||a.id===b.id||a.id===c.id||b.id===c.id)continue;
  const signature=[a.id,b.id,c.id].join('|');if(signatures.has(signature))continue;
  const stops=[a,b,c].map(p=>{
   const base=first.stops.find(s=>s.place_id===p.id);
   const scene=p.scenes.find(s=>s.id===base?.scene_id)||p.scenes[0];
   return {place_id:p.id,scene_id:scene.id,reason:`Read Book ${scene.book}, Chapter ${scene.chapter}: ${scene.summary}`.slice(0,300),minutes:duration===60?5:10};
  });
  try{const route=validateLiteraryRoute({...first,stops},candidates,duration);valid.push(route);signatures.add(signature);}catch{/* Exclude physically impractical walks. */}
 }
 // Prefer different place sets before offering different orders through the same set.
 const distinct:LiteraryRoute[]=[],other:LiteraryRoute[]=[];const sets=new Set<string>();
 for(const route of valid){const key=route.stops.map(s=>s.place_id).sort().join('|');if(sets.has(key))other.push(route);else{sets.add(key);distinct.push(route);}}
 return [...distinct,...other].slice(0,12).map((route,i)=>({id:`path-${i+1}`,route}));
}
export function assembleWrittenJourneys(input:unknown,plans:VerifiedJourneyPlan[],candidates:RouteCandidate[],duration:number,perspective:string):LiteraryRoute[]{
 if(!input||typeof input!=='object'||!('routes' in input)||!Array.isArray(input.routes)||input.routes.length!==3)throw Error('Invalid options');
 const seen=new Set<string>();
 return input.routes.map((item:unknown)=>{
  if(!item||typeof item!=='object')throw Error('Invalid options');
  const value=item as Record<string,unknown>;
  const plan=plans.find(p=>p.id===value.path_id);
  if(!plan||seen.has(plan.id))throw Error('Invalid selected path');seen.add(plan.id);
  if(!Array.isArray(value.reasons)||value.reasons.length!==plan.route.stops.length)throw Error('Invalid route reasons');
  const reasons=value.reasons;
  if(reasons.some(reason=>typeof reason!=='string'||!reason.trim()||reason.length>300))throw Error('Stop reason exceeds text bounds');
  const route=validateLiteraryRoute({title:value.title,summary:value.summary,stops:plan.route.stops.map((stop,i)=>({...stop,reason:reasons[i]}))},candidates,duration);
  return {...route,perspective};
 });
}
