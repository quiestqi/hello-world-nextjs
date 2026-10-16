export type LiteraryStop = { place_id: string; scene_id: string; reason: string; minutes: number };
export type LiteraryRoute = { perspective?: string; title: string; summary: string; stops: LiteraryStop[] };
export type RouteCandidate = { id: string; name: string; lat: number; lng: number; scenes: { id: string; summary: string; book: number; chapter: number }[] };
export const journeyThemes = ["First Arrival in Paris", "Poet and City", "Choices in the Story", "Sanctuary and solitude", "Stages and street life", "Between two banks"] as const;
export function walkingDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const x = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function validateLiteraryRoute(input: unknown, candidates: RouteCandidate[], duration: number): LiteraryRoute {
  if (!input || typeof input !== "object") throw Error("Invalid route");
  const route = input as Record<string, unknown>;
  const text = (v: unknown, limit: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= limit;
  if (!text(route.title, 80) || !text(route.summary, 500) || !Array.isArray(route.stops) || route.stops.length < 3 || route.stops.length > 4) throw Error("Invalid structure");
  const seen = new Set<string>();
  const stops: LiteraryStop[] = [];
  let minutes = 0;
  let distance = 0;
  let previous: RouteCandidate | undefined;
  for (const item of route.stops) {
    if (!item || typeof item !== "object") throw Error("Invalid stop");
    const s = item as Record<string, unknown>;
    const p = candidates.find(p => p.id === s.place_id);
    if (!p) throw Error("Unknown route place");
    if (seen.has(p.id)) throw Error("Duplicate route place");
    if (!p.scenes.some(scene => scene.id === s.scene_id)) throw Error("Scene does not match place");
    if (!text(s.reason, 300)) throw Error("Stop reason exceeds text bounds");
    if (!Number.isInteger(s.minutes) || Number(s.minutes) < 5 || Number(s.minutes) > 30) throw Error("Invalid stop minutes");
    if (previous) {
      const segment = walkingDistanceKm(previous, p);
      if (segment > 3) throw Error("Stops too far apart");
      distance += segment;
    }
    previous = p;
    seen.add(p.id);
    minutes += Number(s.minutes);
    stops.push({ place_id: p.id, scene_id: String(s.scene_id), reason: String(s.reason), minutes: Number(s.minutes) });
  }
  // Conservative walking allowance, not a claim to have computed street navigation.
  if (minutes + Math.ceil(distance * 1.5 / 3.5 * 60) > duration || distance > 5) throw Error("Exceeds time budget");
  return { title: route.title.trim(), summary: route.summary.trim(), stops };
}
export function literaryDirections(stops: LiteraryStop[], candidates: RouteCandidate[]) {
  const points = stops.map(s => candidates.find(c => c.id === s.place_id)).filter((p): p is RouteCandidate => Boolean(p));
  if (points.length !== stops.length || points.length < 2) return null;
  const coordinate = (p: RouteCandidate) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({ api: "1", travelmode: "walking", origin: coordinate(points[0]), destination: coordinate(points.at(-1)!) });
  if (points.length > 2) params.set("waypoints", points.slice(1, -1).map(coordinate).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

export function planCatalogueJourney(candidates: RouteCandidate[], theme: string, duration: number, previous: string[][] = [], perspective = { id: "gringoire", name: "Pierre Gringoire" }, start = "any", preferCatalogueOrder = false): LiteraryRoute {
  if (![60, 90, 120].includes(duration) || !journeyThemes.some(t => t === theme)) throw Error("Invalid preferences");
  const priorities: Record<string, string[]> = {
    "First Arrival in Paris": ["palais", "greve", "notre-dame", "cite-west", "coutellerie"],
    "Poet and City": ["cite-west", "palais", "halles-alleys", "coutellerie", "notre-dame"],
    "Choices in the Story": ["bernardins", "notre-dame", "greve", "baudoyer", "bastille"],
  };
  const preferredScene: Record<string, string> = { palais: "mystere", greve: "dance-greve", "notre-dame": "church-conversation" };
  const priority = priorities[theme] || (theme === "Sanctuary and solitude" ? ["notre-dame", "cite-west", "palais"] : theme === "Stages and street life" ? ["greve", "palais", "halles-alleys"] : ["cite-west", "pont-saint-michel", "pont-au-change"]);
  const ranked = [...candidates].sort((a, b) => {
    const rank = (id: string) => priority.includes(id) ? priority.indexOf(id) : priority.length;
    return preferCatalogueOrder ? 0 : rank(a.id) - rank(b.id);
  });
  const signature = (ids: string[]) => [...ids].sort().join("|");
  const used = new Set(previous.map(signature));
  let fallback: LiteraryRoute | undefined;
  for (const a of ranked) for (const b of ranked) for (const c of ranked) {
    if ((start !== "any" && a.id !== start) || a.id === b.id || a.id === c.id || b.id === c.id || !a.scenes.length || !b.scenes.length || !c.scenes.length) continue;
    const route = {
      title: `${perspective.id === "free" ? "Free Exploration" : perspective.name + "'s Paris"}: ${theme}`,
      summary: `From ${perspective.id === "free" ? "the story spaces of the entire novel" : "the places " + perspective.name + " visits or passes through in the novel"}, arrange a solo exploration at your own pace. The following are database rule recommendations, not AI-generated; differences between reference locations and novel locations can be viewed on the map.`,
      stops: [a, b, c].map(p => {
        const scene = p.scenes.find(s => s.id === preferredScene[p.id]) || p.scenes[0];
        return { place_id: p.id, scene_id: scene.id, reason: `Read Book ${scene.book}, Chapter ${scene.chapter}: ${scene.summary}`.slice(0, 300), minutes: duration === 60 ? 5 : 10 };
      }),
    };
    try {
      const valid = validateLiteraryRoute(route, candidates, duration);
      fallback ??= valid;
      if (!used.has(signature(valid.stops.map(s => s.place_id)))) return valid;
    } catch { /* Skip combinations that exceed the walking budget. */ }
  }
  if (fallback) return fallback;
  throw Error("Not enough walkable sourced locations");
}
