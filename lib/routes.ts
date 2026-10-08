export type Place = { id: string; name: string; kind: string; address: string; description: string; visit_note: string; source_url: string; neighborhood?: string; latitude?: number; longitude?: number; coordinate_source_url?: string };
export type Walk = { title: string; summary: string; stops: { place_id: string; reason: string; activity: string; minutes: number }[] };
export const moods = ["Slow morning", "Architecture & photos", "Catch up with friends"] as const;
export const neighborhoods = ["West Village", "SoHo / Nolita", "Columbia / Upper West Side"] as const;
export type Variation = { neighborhood: string; startId: string; highlightId: string; previous?: Walk };

export function chooseVariation(places: Place[], neighborhood: string, previous?: Walk, random = Math.random): Variation {
  const previousIds = new Set(previous?.stops.map(s => s.place_id));
  const cafes = places.filter(p => p.kind === "coffee" && p.id !== previous?.stops[0]?.place_id);
  const destinations = places.filter(p => p.kind !== "coffee");
  const fresh = destinations.filter(p => !previousIds.has(p.id));
  if (!cafes.length || destinations.length < 2) throw new Error("Not enough places for a varied walk");
  const highlights = fresh.length ? fresh : destinations;
  return { neighborhood, startId: cafes[Math.floor(random() * cafes.length)].id, highlightId: highlights[Math.floor(random() * highlights.length)].id, previous };
}

export function validateWalk(value: unknown, places: Place[], duration: number, variation?: Variation): Walk {
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
  if (places.find(p => p.id === route.stops[0].place_id)?.kind !== "coffee" || route.stops.filter(s => places.find(p => p.id === s.place_id)?.kind === "coffee").length !== 1 || minutes > duration - 15) throw new Error("Invalid timing or start");
  if (variation) {
    if (route.stops[0].place_id !== variation.startId || !ids.has(variation.highlightId)) throw new Error("Missing varied start or highlight");
    const signature = (stops: Walk["stops"]) => stops.map(s => s.place_id).sort().join("|");
    if (variation.previous && signature(route.stops) === signature(variation.previous.stops)) throw new Error("Repeated route");
  }
  return route;
}

export function buildPrompt(places: Place[], mood: string, duration: number, variation?: Variation) {
  const instructions = variation ? `Start at ${variation.startId}; this is mandatory. Include ${variation.highlightId}. Pick the remaining stops to make a coherent walk. Previous route to avoid, even with a different title: ${JSON.stringify(variation.previous?.stops.map(s => s.place_id) ?? [])}.` : "Start at a coffee shop.";
  return `Create a ${variation?.neighborhood ?? "West Village"} coffee-first walking itinerary for Sam, a Columbia College junior new to NYC exploring with a student budget. Mood: ${mood}. Total outing: ${duration} minutes. ${instructions} Choose 3 or 4 distinct stops ONLY from this catalogue, with exactly one coffee shop. Stay in the selected area. Order geographically sensibly using the coordinates; choose nearby remaining stops, especially for a one-hour outing. Reserve at least 15 minutes for walking and more if the distance needs it; stop minutes must sum to no more than ${duration - 15}. Prefer free public stops after one coffee. Respect the visiting notes: do not promise access or require purchases at bookshops; religious sites are exterior views. Do not invent businesses, addresses, hours, prices, travel times or guarantees of access. Write a short title, summary, and for each stop an imaginative reason and a concrete activity. Return JSON with title, summary, stops: [{place_id, reason, activity, minutes}]. Catalogue (trusted addresses and visit notes): ${JSON.stringify(places)}`;
}

export function mapsUrl(stops: Place[]) {
  const params = new URLSearchParams({ api: "1", travelmode: "walking", origin: stops[0].address, destination: stops.at(-1)!.address, waypoints: stops.slice(1, -1).map(p => p.address).join("|") });
  return `https://www.google.com/maps/dir/?${params}`;
}
