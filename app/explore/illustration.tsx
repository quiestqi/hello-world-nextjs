"use client";

import Image from "next/image";
import type { Place } from "@/lib/routes";
import type { MapDesign } from "@/lib/map-design";
import { IllustratedMap } from "./illustrated-map";
import { useActionState } from "react";
import { generateIllustration } from "./illustration-action";

export function Illustration({ id, title, url, status, design, stops }: { id: string; title: string; url?: string; status?: string; owner?: boolean; design?: MapDesign; stops: Place[] }) {
  const [result, action, pending] = useActionState(generateIllustration, {});
  return <figure className="walk-illustration">
    {design ? <IllustratedMap design={design} stops={stops} title={title} /> : url ? <Image unoptimized src={url} alt={`Gemini illustrated map of ${title}`} width={1024} height={1024} loading="lazy" /> : <form action={action} className="walk-illustration-placeholder">
      <input type="hidden" name="generation_id" value={id} />
      <h4>A little map of your day.</h4>
      <p>Gemini designs the colors, mood and details; we draw your route.</p>
      <button disabled={pending || status === "pending"}>{pending ? "Designing your illustrated map…" : status === "pending" ? "Map is being drawn…" : "Generate illustrated map"}</button>
      {result.error && <p role="alert" className="walk-error">{result.error}</p>}
      {result.success && <p role="status">{result.success}</p>}
    </form>}
    <figcaption>Design by Gemini · drawn by Coffee Club · schematic, not for navigation. Use the real map below for location details.</figcaption>
  </figure>;
}
