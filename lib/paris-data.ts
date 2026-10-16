import archive from "@/data/nddp-novel.en.json";
import anchorData from "@/data/paris-map-anchors.json";

export type Character = { id: string; name_zh: string; name_fr: string; entity_type: string };
export type Place = { id: string; name_zh: string; name_fr: string; kind: string; parent_id: string | null; note: string; geographic_scope: string };
export type Scene = { id: string; place_id: string; book: number; chapter: number; summary_zh: string; note: string; character_relations: { character_id: string; relation: string }[]; evidence: { url: string; chapter_title: string; paragraphs: number[] } };
export type Anchor = { lat: number; lng: number; label: string; source_url: string; accuracy: string };
export type NotebookEntry = { place_id: string; saved: boolean; visited: boolean; note: string };
export type MapPoint = { id: string; anchor: Anchor; places: Place[] };
export const places = archive.places as Place[];
export const scenes = archive.scene_place_records as Scene[];
export const characters = archive.characters as Character[];
export const anchors = anchorData as Record<string, Anchor>;
export const placeById = new Map(places.map(p => [p.id, p]));
export const characterById = new Map(characters.map(c => [c.id, c]));
export const physicalRelations = new Set(["present", "passed_through", "spectator_inside", "at_window", "resident", "visited_in_backstory", "lived_as_infant", "repeated_visit_reported", "passed_through_reported", "uses_room", "present_under_alias", "nearby_spectator", "passed_street_entrance", "outside_only", "testifies_inside", "visited_reported", "boat_passage", "present_as_infant", "approached_or_at_bridgehead_not_confirmed_crossing"]);
export const relationLabels: Record<string, string> = {
  present: "Present", passed_through: "Passed Through", spectator_inside: "Attend inside", at_window: "Outside the window", resident: "Reside here", outside_only: "Exterior only", nearby_spectator: "Observe nearby", boat_passage: "Pass by boat", intended_not_taken: "Intended to go but rerouted", former_resident_not_returned_in_this_scene: "Former residence · Not returned this time", approached_or_at_bridgehead_not_confirmed_crossing: "Approach bridgehead · Crossing unconfirmed", body_transferred_after_death: "Body transported here after death", posthumous_identity_inferred: "Remains identity implied by text", remains_identified_by_narrative_clues: "Remains identified by textual clues", identity_recalled_and_later_confirmed: "Identity confirmed later", present_as_infant: "Present in infancy", visited_in_backstory: "Visited in flashback", lived_as_infant: "Lived in childhood", repeated_visit_reported: "Visited multiple times", passed_through_reported: "Passage described", uses_room: "Use this room", present_under_alias: "Present under an alias", passed_street_entrance: "Passed the intersection", testifies_inside: "Testify inside", visited_reported: "Visit described",
};
export function descendants(id: string): string[] {
  return [id, ...places.filter(p => p.parent_id === id).flatMap(p => descendants(p.id))];
}
export function scenesAt(id: string, gringoire = false): Scene[] {
  const family = new Set(descendants(id));
  return scenes.filter(s => family.has(s.place_id) && (!gringoire || s.character_relations.some(r => r.character_id === "gringoire" && physicalRelations.has(r.relation)))).sort((a, b) => a.book - b.book || a.chapter - b.chapter);
}
export function hasFootprint(id: string) { return scenesAt(id, true).length > 0; }
export function anchorFor(id: string): { id: string; anchor: Anchor } | undefined {
  let p = placeById.get(id);
  const seen = new Set<string>();
  while (p && !seen.has(p.id)) {
    seen.add(p.id);
    if (anchors[p.id]) return { id: p.id, anchor: anchors[p.id] };
    // A plaza outside Notre-Dame uses the building as an explicitly modern reference.
    if (p.id === "parvis" || p.id === "cloitre") return anchors["notre-dame"] ? { id: "notre-dame", anchor: anchors["notre-dame"] } : undefined;
    p = p.parent_id ? placeById.get(p.parent_id) : undefined;
  }
}
export function mapPoints(list: Place[]): MapPoint[] {
  const groups = new Map<string, MapPoint>();
  for (const p of list) {
    const point = anchorFor(p.id);
    if (!point) continue;
    if (!groups.has(point.id)) groups.set(point.id, { ...point, places: [] });
    groups.get(point.id)!.places.push(p);
  }
  return [...groups.values()];
}
