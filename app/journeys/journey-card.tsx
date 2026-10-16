"use client";

import { Localized, useLocale } from "@/app/i18n/locale-provider";
import { useRef, useState, useTransition, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { chooseJourney } from "./actions";
import { JourneyRating } from "./forms";
import { writeJourneyPoem, type PoetryResult } from "./poetry-action";

export function JourneyCard({ id, title, perspective, preview, initialChosen = false, rating, children }: { id: string; title: string; perspective: string; preview: boolean; initialChosen?: boolean; rating: { value?: number; up: number; down: number; failed: boolean }; children: ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const requested = useRef(new Set<string>());
  const [chosen, setChosen] = useState(initialChosen);
  const [choiceStatus, setChoiceStatus] = useState("");
  const [choosing, startChoosing] = useTransition();
  const [open, setOpen] = useState(false);
  const [poems, setPoems] = useState<Record<string, PoetryResult>>({});
  const poem = poems[locale] || {};
  const [pending, startTransition] = useTransition();
  const write = useCallback(() => {
    requested.current.add(locale);
    startTransition(async () => {
      let result: PoetryResult;
      try { result = await writeJourneyPoem(id); }
      catch { result = { error: "The poetic introduction is temporarily unavailable. Please try again later." }; }
      setPoems(previous => ({ ...previous, [locale]: result }));
    });
  }, [id, locale]);
  useEffect(() => { if (open && !preview && !requested.current.has(locale)) write(); }, [open, preview, locale, write]);
  return <Localized><details className="journey-card journey-route-collapse" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="journey-route-summary"><span className="journey-route-label"><h3>{title}</h3><span className="journey-perspective-tag">{perspective}</span>{chosen && <span className="journey-perspective-tag">✓ Today’s choice</span>}</span><span className="journey-route-toggle" aria-hidden="true" /></summary>
    <div className="journey-card-body">
      <section className="journey-poetry" aria-label="Poetic introduction for this stretch" aria-busy={pending}>
        <p className="eyebrow">A FEW WORDS BEFORE YOU GO</p>
        {pending ? <p className="poetry-status" role="status">Weaving these locations into a preamble before setting out...</p> : poem.text ? <><p className="poetry-text" data-no-translate>{poem.text}</p><small>Introduction created by AI for this route · Not original text by Hugo</small></> : <p className="poetry-status" role="status">{preview ? "Log in to read an AI-written departure introduction for this route." : poem.error || "Expand this route to read a preamble before setting out."}</p>}
        {!preview && poem.error && <button type="button" onClick={write} disabled={pending}>Try again ↗</button>}
      </section>
      {children}
      <section className="journey-decision"><p className="eyebrow">YOUR NEXT CHAPTER</p><button className="journey-primary" type="button" aria-pressed={chosen} disabled={choosing || chosen} onClick={() => startChoosing(async () => { if(preview) { setChosen(true); return; } const result=await chooseJourney(id); if(result.success) { setChosen(true); router.refresh(); } setChoiceStatus(result.error || result.success || ""); })}>{chosen ? "✓ My journey for today" : "Choose this journey →"}</button>{choiceStatus && <p role="status">{choiceStatus}</p>}{chosen && <><p>Take this thread into the city. You can leave a feeling on the map whenever you are ready.</p>{rating.failed ? <p role="alert">Ratings temporarily unavailable, please refresh and try again.</p> : <JourneyRating id={id} value={rating.value} up={rating.up} down={rating.down} disabled={preview} />}<Link href={preview ? "/stories?preview=1" : "/stories"}>Leave a city echo ↗</Link></>}</section>
    </div>
  </details></Localized>;
}
