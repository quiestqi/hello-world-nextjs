"use client";

import { useActionState } from "react";
import { generateIllustration } from "./illustration-action";

export function Illustration({ id, title, url, status }: { id: string; title: string; url?: string; status?: string; owner?: boolean }) {
  const [result, action, pending] = useActionState(generateIllustration, {});
  return <figure className="walk-illustration">
    {url ? <img src={url} alt={`Gemini illustrated map of ${title}`} width={1024} height={1024} loading="lazy" /> : <form action={action} className="walk-illustration-placeholder">
      <input type="hidden" name="generation_id" value={id} />
      <h4>A little map of your day.</h4>
      <p>A Gemini illustration inspired by this walk’s actual stops and mood.</p>
      <button disabled={pending || status === "pending"}>{pending ? "Gemini is drawing your map…" : status === "pending" ? "Map is being drawn…" : "Generate illustrated map"}</button>
      {result.error && <p role="alert" className="walk-error">{result.error}</p>}
      {result.success && <p role="status">{result.success}</p>}
    </form>}
    <figcaption>Gemini theme illustration · schematic, not for navigation. Use the real map below for location details.</figcaption>
  </figure>;
}
