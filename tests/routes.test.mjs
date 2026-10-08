import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWalk, mapsUrl } from '../lib/routes.ts';

const places = [
  { id: 'coffee', kind: 'coffee', address: '44 Charles Street, New York, NY' },
  { id: 'park', kind: 'park', address: 'Washington Square Arch, New York, NY' },
  { id: 'library', kind: 'library', address: '425 Avenue of the Americas, New York, NY' },
];
const valid = () => ({ title: 'A Village afternoon', summary: 'Coffee and public spaces.', stops: places.map(p => ({ place_id: p.id, minutes: 10, reason: 'Enjoy a detour.', activity: 'Look around.' })) });
test('accepts a coffee-first route within its outing budget', () => assert.deepEqual(validateWalk(valid(), places, 60), valid()));
test('rejects hallucinated and duplicate stops', () => {
  for (const id of ['invented-shop', 'coffee']) {
    const route = valid(); route.stops[1].place_id = id;
    assert.throws(() => validateWalk(route, places, 60));
  }
});
test('rejects malformed model output, non-coffee starts and impossible timing', () => {
  for (const value of [null, {}, { ...valid(), title: '' }, { ...valid(), stops: [null,null,null] }, { ...valid(), stops: valid().stops.reverse() }, { ...valid(), stops: valid().stops.map(s => ({ ...s, minutes: 30 })) }]) {
    assert.throws(() => validateWalk(value, places, 60));
  }
});
test('rejects fractional minutes and excessive generated text', () => {
  const route = valid(); route.stops[1].minutes = 10.5;
  assert.throws(() => validateWalk(route, places, 90));
  route.stops[1].minutes = 10; route.stops[1].activity = 'a'.repeat(301);
  assert.throws(() => validateWalk(route, places, 90));
});
test('walking directions use curated addresses in itinerary order', () => {
  const url = new URL(mapsUrl(places));
  assert.equal(url.searchParams.get('travelmode'), 'walking');
  assert.equal(url.searchParams.get('origin'), places[0].address);
  assert.equal(url.searchParams.get('destination'), places[2].address);
  assert.equal(url.searchParams.get('waypoints'), places[1].address);
});
