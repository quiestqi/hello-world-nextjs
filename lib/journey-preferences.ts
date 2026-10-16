import type { RouteCandidate } from './literary-routes';
export const cityInterests = ['Architecture', 'Human stories', 'River & open skies'] as const;
export const storyMoods = ['First Arrival in Paris', 'Poet and City', 'Choices in the Story', 'Sanctuary and solitude', 'Stages and street life', 'Between two banks'] as const;
export type JourneyPreferences = { start: string; interests: string[]; wish: string };
const interestPlaces: Record<string, string[]> = {
  Architecture: ['notre-dame', 'palais', 'bastille', 'chatelet'],
  'Human stories': ['greve', 'halles-alleys', 'coutellerie', 'baudoyer', 'bernardins'],
  'River & open skies': ['cite-west', 'pont-saint-michel', 'pont-au-change', 'notre-dame'],
};
export function readJourneyPreferences(form: { get(name: string): unknown; getAll(name: string): unknown[] }): JourneyPreferences {
  const start = String(form.get('start') || 'any');
  const interests = [...new Set(form.getAll('interests').map(String))];
  const wish = String(form.get('wish') || '').trim();
  if (wish.length > 400 || interests.length > 3 || interests.some(i => !cityInterests.some(v => v === i)) || !/^[a-z-]{1,60}$/.test(start)) throw Error('Invalid preferences');
  return { start, interests, wish };
}
export function rankForInterests(candidates: RouteCandidate[], interests: string[]) {
  const scores = (id: string) => interests.reduce((score, interest) => score + (interestPlaces[interest]?.includes(id) ? 1 : 0), 0);
  return [...candidates].sort((a,b) => scores(b.id) - scores(a.id));
}
export function requireStartingPoint<T extends { stops: { place_id: string }[] }>(route: T, start: string): T {
  if (start === 'any') return route;
  const first = route.stops.find(s => s.place_id === start);
  if (!first) throw Error('Requested starting point missing');
  return { ...route, stops: [first, ...route.stops.filter(s => s !== first)] };
}
