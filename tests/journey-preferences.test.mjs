import test from 'node:test';
import assert from 'node:assert/strict';
import {readJourneyPreferences,rankForInterests,requireStartingPoint} from '../lib/journey-preferences.ts';
import {planCatalogueJourney} from '../lib/literary-routes.ts';
test('preferences reject unknown interests and oversized wishes, and deduplicate interests',()=>{
 const form=new FormData();form.append('interests','Architecture');form.append('interests','Architecture');
 assert.deepEqual(readJourneyPreferences(form),{start:'any',interests:['Architecture'],wish:''});
 form.append('interests','invented');assert.throws(()=>readJourneyPreferences(form));
 const long=new FormData();long.set('wish','x'.repeat(401));assert.throws(()=>readJourneyPreferences(long));
});
test('start is enforced, missing anchors fail instead of silently changing the request',()=>{
 const route={stops:[{place_id:'a'},{place_id:'b'},{place_id:'c'}]};
 assert.deepEqual(requireStartingPoint(route,'b').stops.map(s=>s.place_id),['b','a','c']);
 assert.throws(()=>requireStartingPoint(route,'missing'));
});
test('interests change actual fallback stop selection and chosen start stays first',()=>{
 const candidates=['greve','halles-alleys','coutellerie','notre-dame','palais'].map((id,i)=>({id,name:id,lat:48.855+i*.0001,lng:2.35,scenes:[{id:'s-'+id,summary:'A grounded scene',book:1,chapter:1}]}));
 const ranked=rankForInterests(candidates,['Architecture']);
 const route=planCatalogueJourney(ranked,'First Arrival in Paris',120,[],{id:'free',name:'Free'},'palais',true);
 assert.equal(route.stops[0].place_id,'palais');assert.equal(route.stops[1].place_id,'notre-dame');
});
