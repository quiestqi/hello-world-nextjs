"use server";

import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured } from "@/lib/auth-config";
import { placeById, type NotebookEntry } from "@/lib/paris-data";

export async function saveNotebook(input: NotebookEntry): Promise<{ ok: boolean; error?: string }> {
  if (!input || typeof input.place_id !== "string" || !placeById.has(input.place_id) || typeof input.saved !== "boolean" || typeof input.visited !== "boolean" || typeof input.note !== "string" || input.note.length > 2000) return { ok: false, error: "Record content is incomplete, or the notes exceed 2000 characters." };
  if (!isAuthConfigured()) return { ok: false, error: "Cloud records are not yet connected." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Login has expired, please log in again to save." };
  const { error } = await supabase.from("literary_notebooks").upsert({ user_id: user.id, place_id: input.place_id, saved: input.saved, visited: input.visited, note: input.note.trim(), updated_at: new Date().toISOString() }, { onConflict: "user_id,place_id" });
  return error ? { ok: false, error: "Cloud save failed, please keep your notes and try again." } : { ok: true };
}
