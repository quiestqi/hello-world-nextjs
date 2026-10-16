"use client";

import { Localized, useLocale } from "@/app/i18n/locale-provider";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { MapPoint } from "@/lib/paris-data";
import "leaflet/dist/leaflet.css";
import { translateText } from "@/lib/localization";

export default function ParisMap({ points, activeId, onSelect }: { points: MapPoint[]; activeId?: string; onSelect: (id: string) => void }) {
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    void import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      const m = L.map(container.current, { zoomControl: false, scrollWheelZoom: true, minZoom: 11, maxZoom: 18, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([48.8565, 2.3495], 14);
      map.current = m;
      L.control.zoom({ position: "bottomright" }).addTo(m);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
        .on("tileerror", () => { if (!cancelled) setMessage("Base map not yet loaded; you can still select locations from the left and read original scenes."); }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      observer = new ResizeObserver(() => { if (!cancelled && map.current === m) m.invalidateSize({ animate: false, pan: false }); });
      observer.observe(container.current);
      setReady(true);
    }).catch(() => { if (!cancelled) setMessage("Map temporarily unavailable, please continue exploring from the location list."); });
    return () => {
      cancelled = true;
      observer?.disconnect();
      const current = map.current;
      current?.stop();
      layer.current?.eachLayer(item => item.unbindTooltip());
      current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !layer.current) return;
    let cancelled = false;
    void import("leaflet").then(L => {
      if (cancelled || !layer.current) return;
      map.current?.stop();
      layer.current.eachLayer(item => item.unbindTooltip());
      layer.current.clearLayers();
      points.forEach((point, index) => {
        const active = point.id === activeId;
        const icon = L.divIcon({ className: "paris-map-pin-host", html: `<span class="paris-map-pin${active ? " is-active" : ""}">${String(index + 1).padStart(2, "0")}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
        const marker = L.marker([point.anchor.lat, point.anchor.lng], { icon, title: translateText(point.places[0].name_zh, locale), keyboard: true });
        const label = document.createElement("span");
        label.textContent = translateText(point.places[0].name_zh, locale);
        marker.bindTooltip(label, { direction: "top", offset: [0, -16] });
        marker.on("click", () => select.current(point.places[0].id));
        marker.addTo(layer.current!);
      });
    });
    return () => { cancelled = true; };
  }, [points, activeId, ready, locale]);

  useEffect(() => {
    if (!ready || !activeId) return;
    const point = points.find(p => p.id === activeId);
    const current = map.current;
    if (point && current) {
      current.stop();
      current.setView([point.anchor.lat, point.anchor.lng], Math.max(current.getZoom(), 14), { animate: false });
    }
  }, [activeId, ready, points]);

  useEffect(() => {
    const element = map.current?.getContainer();
    if (!element) return;
    for (const [selector, label] of [[".leaflet-control-zoom-in", "Zoom in"], [".leaflet-control-zoom-out", "Zoom out"]]) {
      const button = element.querySelector(selector);
      button?.setAttribute("title", locale === "zh" ? label === "Zoom in" ? "放大" : "缩小" : label);
      button?.setAttribute("aria-label", locale === "zh" ? label === "Zoom in" ? "放大" : "缩小" : label);
    }
  }, [ready, locale]);

  function reset() {
    if (!map.current) return;
    map.current.stop();
    if (points.length > 1) map.current.fitBounds(points.map(p => [p.anchor.lat, p.anchor.lng] as [number, number]), { padding: [75, 75], maxZoom: 14, animate: false });
    else map.current.setView([48.8565, 2.3495], 14, { animate: false });
  }

  return <Localized><div className="paris-map-frame">
    <div ref={container} className="paris-map-canvas" role="region" aria-label="Interactive map of original locations in Paris" />
    <div className="map-top-label"><span className="live-dot" />PARIS, THROUGH A STORY <span className="map-coordinates">48°51′ N · 2°21′ E</span></div>
    <button className="map-reset" onClick={reset} aria-label="View all map locations">⌖ <span>All locations</span></button>
    <div className="map-bottom-label"><span className="legend-pin" />Modern reference location <span className="legend-outline" />For historical spaces, please refer to the original text descriptions</div>
    {message && <p className="map-message" role="status">{message}</p>}
  </div></Localized>;
}
