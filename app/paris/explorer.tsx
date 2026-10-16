"use client";

import { Localized, LanguageSwitch } from "@/app/i18n/locale-provider";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { anchorFor, characterById, hasFootprint, mapPoints, places, relationLabels, scenesAt, type NotebookEntry, type Place } from "@/lib/paris-data";
import ParisMap from "./paris-map";
import { translateText } from "@/lib/localization";
import { saveNotebook } from "./notebook-actions";
import "./paris.css";

const EMPTY = { saved: false, visited: false, note: "" };
type Props = { notebookOnly?: boolean; name?: string; preview?: boolean; storageMode: "cloud" | "device"; storageKey: string; initialEntries?: NotebookEntry[]; cloudUnavailable?: boolean; signOutAction?: () => Promise<void> };
export default function Explorer({ notebookOnly = false, name, preview = false, storageMode, storageKey, initialEntries = [], cloudUnavailable = false, signOutAction }: Props) {
  const [role, setRole] = useState<"all" | "gringoire">("all");
  const [tab, setTab] = useState<"map" | "journal">(notebookOnly ? "journal" : "map");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("notre-dame");
  const [entries, setEntries] = useState<Record<string, NotebookEntry>>(Object.fromEntries(initialEntries.map(e => [e.place_id, e])));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(storageMode === "cloud");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (storageMode !== "device") return;
    // Defer loading browser-only state; never replace unread storage during hydration.
    const timer = window.setTimeout(() => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(storageKey) || "{}");
        const clean: Record<string, NotebookEntry> = {};
        if (stored && typeof stored === "object") for (const [id, e] of Object.entries(stored)) {
          if (places.some(p => p.id === id) && e && typeof e === "object" && typeof e.note === "string" && typeof e.saved === "boolean" && typeof e.visited === "boolean") clean[id] = { place_id: id, note: e.note.slice(0, 2000), saved: e.saved, visited: e.visited };
        }
        setEntries(clean);
      } catch { setStatus("Unable to read local pilgrim's book; you can still browse all locations."); }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey, storageMode]);

  const filtered = useMemo(() => places.filter(p => {
    if (role === "gringoire" && !hasFootprint(p.id)) return false;
    if (tab === "journal" && !(entries[p.id]?.saved || entries[p.id]?.visited || entries[p.id]?.note)) return false;
    const text = `${p.name_zh} ${translateText(p.name_zh, "zh")} ${p.name_fr} ${scenesAt(p.id).map(s => s.summary_zh).join(" ")}`.toLowerCase();
    return text.includes(query.toLowerCase().trim());
  }), [query, role, tab, entries]);
  const points = useMemo(() => mapPoints(filtered), [filtered]);
  const selected = filtered.find(p => p.id === active) || filtered[0];
  const selectedScenes = selected ? scenesAt(selected.id, role === "gringoire") : [];
  const selectedAnchor = selected ? anchorFor(selected.id) : undefined;
  const entry = selected ? entries[selected.id] || { ...EMPTY, place_id: selected.id } : undefined;
  const draft = selected ? drafts[selected.id] ?? entry?.note ?? "" : "";
  const people = [...new Set(selectedScenes.flatMap(s => s.character_relations.map(r => r.character_id)))];
  const top = filtered.filter(p => !p.parent_id || !filtered.some(parent => parent.id === p.parent_id));

  function select(id: string) { setActive(id); setStatus(""); }
  function persist(next: NotebookEntry) {
    startTransition(async () => {
      if (storageMode === "cloud") {
        const result = await saveNotebook(next);
        if (!result.ok) { setStatus(result.error || "Unable to save, please try again."); return; }
      } else {
        try { localStorage.setItem(storageKey, JSON.stringify({ ...entries, [next.place_id]: next })); }
        catch { setStatus("Storage not permitted by browser, please check storage settings."); return; }
      }
      setEntries(previous => ({ ...previous, [next.place_id]: next }));
      setStatus(storageMode === "cloud" ? "Saved to your pilgrim's book." : "Saved to this device's pilgrim's book.");
    });
  }
  function placeRow(p: Place, nested = false) {
    const selectedRow = selected?.id === p.id;
    const point = anchorFor(p.id);
    const index = points.findIndex(x => x.id === point?.id);
    return <button key={p.id} className={`place-row${selectedRow ? " selected" : ""}${nested ? " nested" : ""}`} onClick={() => select(p.id)} aria-pressed={selectedRow}>
      <span className={`place-number${index < 0 ? " unmapped" : ""}`}>{nested ? "↳" : index >= 0 ? String(index + 1).padStart(2, "0") : "·"}</span>
      <span className="place-row-copy"><strong>{p.name_zh}</strong><small data-no-translate>{p.name_fr}</small></span>
      {entries[p.id]?.visited ? <span className="row-saved" aria-label="Visited">✓</span> : entries[p.id]?.saved ? <span className="row-saved" aria-label="Favorited">◆</span> : <span className="row-arrow">↗</span>}
    </button>;
  }

  return <Localized><main className="paris-app">
    <header className="paris-header">
      <Link href={preview ? "/preview" : "/"} className="paris-brand"><span className="brand-mark">S<span>C</span></span><span>STAGED CITY<small>A CITY, READ DIFFERENTLY</small></span></Link>
      <nav className="paris-tabs" aria-label="Main navigation"><Link href={preview ? "/preview" : "/"}>01 / Story map</Link><Link href={preview ? "/journeys?preview=1" : "/journeys"}>02 / Your journey</Link><Link href={preview ? "/stories?preview=1" : "/stories"}>03 / City echoes</Link></nav>
      <div className="paris-account"><LanguageSwitch />{preview ? <><span className="preview-tag">Experience Preview</span><Link href="/login">Log In ↗</Link></> : <><Link href="/profile">{name || "Profile"}</Link>{signOutAction && <form action={signOutAction}><button>Sign Out</button></form>}</>}</div>
    </header>

    <div className="paris-workspace">
      <aside className="paris-sidebar">
        <div className="sidebar-intro"><p className="eyebrow">01 / NOTRE-DAME DE PARIS</p><h1>See Paris,<br /><em>through a story.</em></h1><p className="intro-text">For lovers of drama, a poetic way into the city.</p></div>
        <div className="work-cover"><div><span className="book-label">VICTOR HUGO · 1831</span><h2>Notre-Dame de Paris</h2><p>Victor Hugo’s Paris</p><span className="edition-label">THE NOVEL / PARIS, 1482</span></div></div>
        <div className="perspective-switch" aria-label="Exploration Perspective"><button className={role === "all" ? "active" : ""} onClick={() => { setRole("all"); setShowWelcome(false); }}>Whole novel</button><button className={role === "gringoire" ? "active" : ""} onClick={() => { setRole("gringoire"); setShowWelcome(true); }}>Gringoire’s footsteps</button></div>
        {role === "gringoire" && <div className="role-note"><span>THE POET</span><p>Through Pierre Gringoire&apos;s eyes, follow his experiences across the city.</p><button onClick={() => setShowWelcome(!showWelcome)}>{showWelcome ? "Collapse character intro −" : "Meet this character +"}</button>{showWelcome && <p className="role-expanded">A poet whose show failed, searching for a place to stay. The map filters spaces he is recorded visiting or passing through in the novel; intended visits that never happened are excluded. Exploration order is yours to decide.</p>}</div>}
        <div className="place-search"><span aria-hidden="true">⌕</span><input aria-label="Search locations or stories" placeholder="Find a place or a story…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}</div>
        <div className="list-heading"><span>{tab === "journal" ? "My places" : "Where the story takes place"}</span><span>{filtered.length}  spaces</span></div>
        <div className="place-list">{top.map(p => <div key={p.id}>{placeRow(p)}{filtered.filter(child => child.parent_id === p.id).map(child => <div key={child.id}>{placeRow(child, true)}{filtered.filter(grandchild => grandchild.parent_id === child.id).map(grandchild => placeRow(grandchild, true))}</div>)}</div>)}{!filtered.length && <div className="list-empty"><span>✧</span><h3>{tab === "journal" ? "Your Paris, awaiting the first entry." : "No location found yet."}</h3><p>{tab === "journal" ? "Save to favorites, mark as visited, or leave a note in the place card." : "Try an English or French place name, or clear your search."}</p><button onClick={() => { setQuery(""); setTab("map"); }}>Back to exploration map ↗</button></div>}</div>
        <footer className="sidebar-footer"><span className="small-asterisk">✳</span><span>Set out alone, at your own pace.<small>{storageMode === "cloud" ? "Pilgrimage log synced with your account" : "Pilgrimage log saved on current device"}</small></span></footer>
      </aside>

      <section className="paris-map-section" aria-label="Map exploration"><ParisMap points={points} activeId={selectedAnchor?.id} onSelect={select} /><div className="map-caption"><div><strong>{role === "gringoire" ? "Gringoire's Paris" : "Story and city overlap here."}</strong><p>{points.length}  modern reference points · remaining spaces read from place list</p></div><span className="compass-rose" aria-hidden="true">N<br />✧</span></div></section>

      <aside className="paris-detail" aria-label="Places and original scenes">
        {selected && entry ? <>
          <div className="detail-topline"><span className="eyebrow">THE PLACE & THE STORY</span><button className={`bookmark-icon${entry.saved ? " saved" : ""}`} onClick={() => persist({ ...entry, note: draft, saved: !entry.saved })} disabled={!ready || pending} aria-label={entry.saved ? "Remove from favorites" : "Save place"} aria-pressed={entry.saved}>{entry.saved ? "◆" : "◇"}</button></div>
          <p className="detail-french" data-no-translate>{selected.name_fr}</p><h2>{selected.name_zh}</h2>
          <div className="detail-tags"><span>{selected.parent_id ? "Architecture and spaces" : "Original locations"}</span><span className={selectedAnchor ? "tag-anchor" : "tag-uncertain"}>{selectedAnchor ? "Modern reference points" : "Historical location unverified"}</span></div>
          {selected.note && <p className="place-note">{selected.note}</p>}
          <div className="detail-section"><div className="section-title"><h3>Who has been here</h3><span>{people.length}</span></div><div className="character-chips">{people.map(id => <span className={id === "gringoire" ? "poet-chip" : ""} key={id}>{characterById.get(id)?.name_zh || id}</span>)}</div><p className="tiny-note">Character relationships detailed in each scene; architectural summary includes its interior spaces.</p></div>
          <div className="detail-section"><div className="section-title"><h3>In the original novel</h3><span>{selectedScenes.length}  episodes</span></div><div className="scene-timeline">{selectedScenes.map(scene => <article className="scene-entry" key={scene.id}><span className="timeline-dot" /><p className="scene-chapter">BOOK {String(scene.book).padStart(2, "0")} <span>Book {scene.book}  · Chapter {scene.chapter} </span></p><p>{scene.summary_zh}</p><details><summary>Character relationships and textual basis <span>+</span></summary><ul>{scene.character_relations.map(r => <li key={r.character_id}><strong>{characterById.get(r.character_id)?.name_zh}</strong><span>{relationLabels[r.relation] || r.relation}</span></li>)}</ul>{scene.place_id !== selected.id && <p className="tiny-note">Specific space: {places.find(p => p.id === scene.place_id)?.name_zh}</p>}{scene.note && <p className="tiny-note">{scene.note}</p>}<a href={scene.evidence.url} target="_blank" rel="noreferrer">Read French original ↗</a></details></article>)}</div></div>
          <div className="today-location"><span className="eyebrow">IN TODAY’S PARIS</span>{selectedAnchor ? <><p>The map marks today&apos;s &quot;{selectedAnchor.anchor.label}&quot;, used to understand the location of this area, not representing original rooms or historical boundaries.</p><a href={selectedAnchor.anchor.source_url} target="_blank" rel="noreferrer">View modern map reference ↗</a></> : <p>No available modern reference location has been determined here yet. Leave the story first, without fabricating an address for it.</p>}</div>
          {notebookOnly && <div className="notebook-panel"><div className="section-title"><h3>Leave a piece of your own Paris</h3><button className={entry.visited ? "visit-button visited" : "visit-button"} disabled={!ready || pending} onClick={() => persist({ ...entry, note: draft, visited: !entry.visited })}>{entry.visited ? "✓ Visited" : "○ Mark as visited"}</button></div><label htmlFor="place-note" className="sr-only">Private notes for this location</label><textarea id="place-note" value={draft} maxLength={2000} onChange={e => setDrafts(previous => ({ ...previous, [selected.id]: e.target.value }))} placeholder="Standing here, what do you notice?" /><div className="note-save-row"><span>{draft.length}/2000 · {storageMode === "cloud" ? "Visible only to you" : "This device only"}</span><button onClick={() => persist({ ...entry, note: draft })} disabled={!ready || pending}>{pending ? "Saving…" : "Save note ↗"}</button></div></div>}
          {!notebookOnly && <Link className="journey-primary map-next-step" href={preview ? "/journeys?preview=1" : "/journeys"}>Make this city your journey →</Link>}
        </> : <div className="detail-empty"><span>✧</span><h2>Let the story bring you closer to the city.</h2><p>Select a location from the map or the list on the left.</p></div>}
        <p className="notebook-status" role="status" aria-live="polite">{status}</p>
        <details className="archive-note"><summary>About this map and data</summary><p>Based on the original French text of Hugo&apos;s Notre-Dame de Paris, Ollendorff 1904 edition. Currently cataloging 51 locations/sub-spaces and 74 scene records, still under revision. Contains plot spoilers.</p><p>Modern references do not equal historical site locations, nor do they imply public access or entry. Please verify walking conditions independently before visiting.</p>{preview && <p>This is an experiential preview; personal notes are stored only in your local browser.</p>}{cloudUnavailable && <p>Cloud pilgrim book is not yet configured; current records are temporarily stored locally.</p>}</details>
      </aside>
    </div>
  </main></Localized>;
}
