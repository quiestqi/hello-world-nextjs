export type Place = { id: string; name: string; kind: string; address: string; description: string; visit_note: string; source_url: string };
export type Walk = { title: string; summary: string; stops: { place_id: string; reason: string; activity: string; minutes: number }[] };
export const moods = ["Slow morning", "Architecture & photos", "Catch up with friends"] as const;

export function validateWalk(value: unknown, places: Place[], duration: number): Walk {
  if (!value || typeof value !== "object") throw new Error("Invalid route");
  const route = value as Walk;
  const bounded = (s: unknown, max: number) => typeof s === "string" && s.trim().length > 0 && s.length <= max;
  if (!bounded(route.title, 100) || !bounded(route.summary, 500) || !Array.isArray(route.stops) || route.stops.length < 3 || route.stops.length > 4) throw new Error("Invalid route");
  const ids = new Set<string>();
  let minutes = 0;
  for (const stop of route.stops) {
    if (!stop || !places.some(p => p.id === stop.place_id) || ids.has(stop.place_id) || !bounded(stop.reason, 300) || !bounded(stop.activity, 300) || !Number.isInteger(stop.minutes) || stop.minutes < 5 || stop.minutes > 45) throw new Error("Invalid stop");
    ids.add(stop.place_id);
    minutes += stop.minutes;
  }
  if (places.find(p => p.id === route.stops[0].place_id)?.kind !== "coffee" || minutes > duration - 15) throw new Error("Invalid timing or start");
  return route;
}

export function buildPrompt(places: Place[], mood: string, duration: number) {
  return `Create a Greenwich Village coffee-first walking itinerary for Sam, a Columbia College junior new to NYC exploring with a student budget. Mood: ${mood}. Total outing: ${duration} minutes. Start at a coffee shop, then choose 3 or 4 distinct stops ONLY from this catalogue. Order geographically sensibly. Reserve at least 15 minutes for walking; stop minutes must sum to no more than ${duration - 15}. Prefer free public stops after one coffee. Do not invent businesses, addresses, hours, prices, travel times or guarantees of access. Write a short title, summary, and for each stop an imaginative reason and a concrete activity. Return JSON with title, summary, stops: [{place_id, reason, activity, minutes}]. Catalogue (trusted addresses and visit notes): ${JSON.stringify(places)}`;
}

export function mapsUrl(stops: Place[]) {
  const params = new URLSearchParams({ api: "1", travelmode: "walking", origin: stops[0].address, destination: stops.at(-1)!.address, waypoints: stops.slice(1, -1).map(p => p.address).join("|") });
  return `https://www.google.com/maps/dir/?${params}`;
}
