"use client";

import { Localized, useLocale } from "@/app/i18n/locale-provider";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { translateText } from "@/lib/localization";

type MapStop = { id: string; name: string; lat: number; lng: number };

export function JourneyMap({ stops }: { stops: MapStop[] }) {
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  // A score refresh must not recreate the map when the route is unchanged.
  const encodedStops = JSON.stringify(stops.map(p => ({ ...p, name: translateText(p.name, locale) })));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let map: LeafletMap | undefined;
    let resize: ResizeObserver | undefined;
    const entries = JSON.parse(encodedStops) as MapStop[];
    async function initialize() {
      try {
        const L = await import("leaflet");
        if (cancelled) return;
        map = L.map(element!, {
          scrollWheelZoom: false, zoomControl: false,
          zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
        });
        L.control.zoom({ position: "bottomright", zoomInTitle: locale === "zh" ? "放大" : "Zoom in", zoomOutTitle: locale === "zh" ? "缩小" : "Zoom out" }).addTo(map);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).on("tileerror", () => {
          if (!cancelled) setMessage("Base map not yet loaded, location markers and navigation below remain viewable.");
        }).addTo(map);
        const coordinates = entries.map(p => L.latLng(p.lat, p.lng));
        L.polyline(coordinates, { color: "#803e40", weight: 3, dashArray: "5 7", opacity: 0.7, interactive: false }).addTo(map);
        entries.forEach((place, index) => {
          const icon = L.divIcon({
            className: "journey-map-pin-host",
            html: `<span class="journey-map-pin">${index + 1}</span>`,
            iconSize: [30, 30], iconAnchor: [15, 15],
          });
          const label = document.createElement("span");
          label.textContent = `${index + 1} · ${place.name}`;
          L.marker(coordinates[index], { icon, title: `${index + 1} · ${place.name}` })
            .bindTooltip(label, { permanent: true, direction: index % 2 === 0 ? "top" : "bottom", offset: [0, index % 2 === 0 ? -17 : 17], className: "journey-map-label" })
            .addTo(map!);
        });
        const fit = () => {
          if (!cancelled && map && element!.clientWidth > 0 && element!.clientHeight > 0) {
            map.invalidateSize({ animate: false, pan: false });
            map.fitBounds(L.latLngBounds(coordinates), { padding: [85, 65], maxZoom: 15, animate: false });
          }
        };
        fit();
        resize = new ResizeObserver(fit);
        resize.observe(element!);
      } catch {
        if (!cancelled) setMessage("Map temporarily unavailable. Please use the walking navigation below to view these locations.");
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); void initialize(); }
    }, { rootMargin: "150px" });
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      resize?.disconnect();
      map?.stop();
      map?.eachLayer(layer => layer.unbindTooltip());
      map?.remove();
    };
  }, [encodedStops, locale]);

  return <Localized><figure className="journey-map">
    <div className="journey-map-heading"><strong>This route, in Paris</strong><span>Explore sequentially by number</span></div>
    <div ref={container} className="journey-map-canvas" role="region" aria-label={`Route Map:${stops.map((p, i) => `${i + 1} ${p.name}`).join("，")}`} />
    {message && <p className="journey-map-message" role="status">{message}</p>}
    <figcaption><div className="journey-map-legend">{stops.map((p, i) => <span key={p.id}><b>{i + 1}</b>{p.name}</span>)}</div><p>Dashed lines indicate the visiting sequence; open walking navigation for actual street directions.</p></figcaption>
  </figure></Localized>;
}
