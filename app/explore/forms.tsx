"use client";
import { useActionState } from "react";
import { generateWalk, voteOnWalk } from "./actions";
import { moods } from "@/lib/routes";

export function GenerateForm({ ready }: { ready: boolean }) {
  const [state, action, pending] = useActionState(generateWalk, {});
  return <form action={action} className="walk-form">
    <label>Your mood<select name="mood">{moods.map(m => <option key={m}>{m}</option>)}</select></label>
    <label>Time to explore<select name="duration" defaultValue="90"><option value="60">One hour</option><option value="90">An hour and a half</option><option value="120">Two hours</option></select></label>
    <button className="walk-button" disabled={!ready || pending}>{pending ? "Creating your walk…" : "Generate my coffee walk →"}</button>
    <p className="walk-small">Up to five attempts per 24 hours. One coffee + mostly free stops. No purchase required.</p>
    {!ready && <p role="status">AI generation is being set up. Explore our places below in the meantime.</p>}
    {state.error && <p role="alert" className="walk-error">{state.error}</p>}
    {state.success && <p role="status" className="walk-success">{state.success}</p>}
  </form>;
}

export function VoteForm({ id, voted, up, down }: { id: string; voted?: number; up: number; down: number }) {
  const [state, action, pending] = useActionState(voteOnWalk, {});
  return <form action={action} className="walk-vote">
    <input type="hidden" name="generation_id" value={id} />
    <button name="value" value="1" disabled={pending || !!voted} aria-pressed={voted === 1}>↑ Would walk · {up}</button>
    <button name="value" value="-1" disabled={pending || !!voted} aria-pressed={voted === -1}>↓ Not for me · {down}</button>
    <span className="walk-small">{pending ? "Saving…" : voted ? "Your vote is saved" : "One vote per person"}</span>
    {state.error && <p role="alert">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}
  </form>;
}
