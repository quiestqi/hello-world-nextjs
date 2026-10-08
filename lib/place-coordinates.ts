// Curated OSM locations, checked through Nominatim on 2026-10-08.
// Coordinates describe the venue/building, not a guaranteed accessible entrance.
// Source: https://www.openstreetmap.org/copyright (ODbL).
export const placeCoordinates: Record<string, { lat: number; lng: number; source: string }> = {
  "partners-village": { lat: 40.7349281, lng: -74.0022788, source: "https://www.openstreetmap.org/node/4909655521" },
  "birch-village": { lat: 40.738363, lng: -74.00023, source: "https://www.openstreetmap.org/way/250490712" },
  "jefferson-library": { lat: 40.734588, lng: -73.999192, source: "https://www.openstreetmap.org/way/249664014" },
  "jefferson-garden": { lat: 40.7344521, lng: -73.9994809, source: "https://www.openstreetmap.org/way/239988120" },
  "washington-square": { lat: 40.7312348, lng: -73.9971025, source: "https://www.openstreetmap.org/way/248166269" },
};
