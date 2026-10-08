"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Place } from "@/lib/routes";
import { placeCoordinates } from "@/lib/place-coordinates";
import "leaflet/dist/leaflet.css";

export function RouteMap({ stops }: { stops: Place[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Loading your route map…");
  // A vote refresh should preserve the map's zoom when its stops are unchanged.
  const encodedStops = JSON.stringify(stops.map(({ id, name, address }) => ({ id, name, address })));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let map: LeafletMap | undefined;
    let resize: ResizeObserver | undefined;
    const entries = JSON.parse(encodedStops) as Pick<Place, "id" | "name" | "address">[];
    async function initialize() {
      try {
        const L = await import("leaflet");
        if (cancelled) return;
        if (entries.some(p => !placeCoordinates[p.id])) {
          setMessage("Map locations are unavailable. Use the walking directions below.");
          return;
        }
        const coordinates = entries.map(p => {
          const { lat, lng } = placeCoordinates[p.id];
          return L.latLng(lat, lng);
        });
        map = L.map(element!, { scrollWheelZoom: false, zoomSnap: 0.5 });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        }).on("tileerror", () => {
          if (!cancelled) setMessage("Street tiles are unavailable. Your stop markers and walking directions still work.");
        }).addTo(map);
        L.polyline(coordinates, { color: "#263e32", weight: 3, dashArray: "6 7", opacity: 0.7 }).addTo(map);
        entries.forEach((place, index) => {
          // Text nodes keep venue names/addresses out of Leaflet's HTML parsing.
          const popup = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = `${index + 1}. ${place.name}`;
          const address = document.createElement("p");
          address.textContent = place.address;
          popup.append(title, address);
          L.circleMarker(coordinates[index], {
            radius: 6, color: "#fffef9", weight: 2, fillColor: "#263e32", fillOpacity: 1,
          }).bindTooltip(String(index + 1), {
            permanent: true,
            direction: place.id === "jefferson-garden" ? "left" : "right",
            className: "walk-map-number", offset: [0, 0],
          }).bindPopup(popup).addTo(map!);
        });
        map.fitBounds(L.latLngBounds(coordinates), { padding: [40, 40], maxZoom: 16 });
        resize = new ResizeObserver(() => map?.invalidateSize());
        resize.observe(element!);
        setMessage("");
      } catch {
        if (!cancelled) setMessage("Map unavailable. Use the walking directions below.");
      }
    }
    // Load tiles only for a map the visitor is actually viewing.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); void initialize(); }
    });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); resize?.disconnect(); map?.remove(); };
  }, [encodedStops]);

  return <figure className="walk-route-map">
    <div className="walk-map-heading"><strong>Your route at a glance</strong><span>Tap a numbered stop</span></div>
    <div ref={container} className="walk-map-canvas" role="region" aria-label="Interactive map of this walk's numbered stops" />
    {message && <p className="walk-small" role="status">{message}</p>}
    <figcaption>Numbers match the stops below. Dotted lines show visit order; use walking directions for the street route.</figcaption>
  </figure>;
}
