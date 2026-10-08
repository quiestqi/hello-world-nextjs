import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMapDesign } from '../lib/map-design.ts';
const design = { background:'#FAF6ED',ink:'#263E32',accent:'#E8B765',foliage:'#729864',subtitle:'A quiet coffee morning',decorations:['sun','leaves'],captions:['Start with a warm cup','A pocket of green','A bookish little detour'] };
test('accepts a bounded map design with one caption per real stop',()=>assert.equal(validateMapDesign(design,3),design));
test('rejects URLs and generated markup in SVG color attributes',()=>{
 for(const ink of ['url(https://example.com/image)','red" onload="alert(1)','#fff','<script/>']) assert.throws(()=>validateMapDesign({...design,ink},3));
});
test('rejects missing stop captions, excessive text and unsupported artwork',()=>{
 assert.throws(()=>validateMapDesign({...design,captions:['Invented stop']},3));
 assert.throws(()=>validateMapDesign({...design,subtitle:'x'.repeat(71)},3));
 assert.throws(()=>validateMapDesign({...design,decorations:['javascript:alert(1)']},3));
});
