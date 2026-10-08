"use client";
import { useActionState } from "react";
import { generateWalk, voteOnWalk } from "./actions";
import { moods, neighborhoods } from "@/lib/routes";

export function GenerateForm({ ready, counts }: { ready: boolean; counts: Record<string, number> }) {
  const [state, action, pending] = useActionState(generateWalk, {});
  return <form action={action} className="walk-form">
    <label>Your area<select name="neighborhood">{neighborhoods.map(n => <option key={n}>{n}</option>)}</select><span className="walk-small">{neighborhoods.map(n => `${n}: ${counts[n] ?? 0} places`).join(" · ")}</span></label>
    <label>Your mood<select name="mood">{moods.map(m => <option key={m}>{m}</option>)}</select></label>
    <label>Time to explore<select name="duration" defaultValue="90"><option value="60">One hour</option><option value="90">An hour and a half</option><option value="120">Two hours</option></select></label>
    <button className="walk-button" disabled={!ready || pending}>{pending ? "Creating your walk…" : "Generate my coffee walk →"}</button>
    <p className="walk-small">A different coffee start from your last walk in this area. Up to five attempts per 24 hours. Mostly free stops; no purchase required.</p>
    {!ready && <p role="status">AI generation is being set up. Explore our places below in the meantime.</p>}
    {state.error && <p role="alert" className="walk-error">{state.error}</p>}
    {state.success && <p role="status" className="walk-success">{state.success}</p>}
  </form>;
}

export function VoteForm({ id, voted, up, down }: { id: string; voted?: number; up: number; down: number }) {
  const [state, action, pending] = useActionState(voteOnWalk, {});
  return <form action={action} className="walk-vote">
    <input type="hidden" name="generation_id" value={id} />
    <fieldset disabled={pending || !!voted}>
    <legend>Rate this AI-generated walk</legend>
    <p className="walk-small">Would you try this route? Your vote helps the community choose.</p>
    <div className="walk-vote-buttons">
    <button name="value" value="1" disabled={pending || !!voted} aria-pressed={voted === 1}>↑ Would walk · {up}</button>
    <button name="value" value="-1" disabled={pending || !!voted} aria-pressed={voted === -1}>↓ Not for me · {down}</button>
    </div>
    </fieldset>
    <span className="walk-small" role="status">{pending ? "Saving your vote…" : voted ? `Your ${voted === 1 ? "upvote" : "downvote"} is saved. One vote per person.` : "One vote per person · saved to this route"}</span>
    {state.error && <p role="alert">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}
  </form>;
}
