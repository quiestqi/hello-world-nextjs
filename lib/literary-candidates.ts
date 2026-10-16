import { anchors, places, scenesAt, physicalRelations } from "./paris-data";
import { translateText, type Locale } from "./localization";
import type { RouteCandidate } from "./literary-routes";

export function candidatesForPerspective(perspective: string, locale: Locale = "en"): RouteCandidate[] {
  return places.filter(p => anchors[p.id]).map(p => ({
    id: p.id, name: translateText(p.name_zh, locale), lat: anchors[p.id].lat, lng: anchors[p.id].lng,
    scenes: scenesAt(p.id).filter(s => perspective === "free" || s.character_relations.some(r => r.character_id === perspective && physicalRelations.has(r.relation))).map(s => ({ id: s.id, summary: translateText(s.summary_zh, locale), book: s.book, chapter: s.chapter })),
  })).filter(p => p.scenes.length > 0);
}
export const literaryCandidates = candidatesForPerspective("gringoire");
export const allLiteraryCandidates = candidatesForPerspective("free");
