import areaEmbeds from "@/lib/google-area-embeds.json";

export function AreaMap({ neighborhood }: { neighborhood: string }) {
  const area = neighborhood in areaEmbeds ? neighborhood as keyof typeof areaEmbeds : "West Village";
  const query = area === "Columbia / Upper West Side" ? "Morningside Heights, Manhattan, New York" : `${area.replace(" / Nolita", "")}, Manhattan, New York`;
  return <figure className="walk-area-map">
    <iframe
      src={areaEmbeds[area]}
      title={`Google Maps preview of ${area}`}
      width="600"
      height="450"
      loading="lazy"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
    <figcaption><span>{area}</span><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer">Open in Google Maps ↗</a></figcaption>
  </figure>;
}
