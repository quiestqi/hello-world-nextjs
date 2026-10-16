"use server";

import { getLocale } from "@/app/i18n/locale-server";
import { createClient } from "@/lib/supabase/server";
import { requestGeminiJson } from "@/lib/gemini-json";
import { candidatesForPerspective } from "@/lib/literary-candidates";
import { journeyPerspective } from "@/lib/literary-perspectives";
import { validateLiteraryRoute } from "@/lib/literary-routes";
import { poetryPrompt, validateJourneyPoem } from "@/lib/journey-poetry";

export type PoetryResult = { text?: string; error?: string };
// Public route-based text only; auth is checked before consulting the cache.
// Instance-local limits supplement the authenticated, route-bound action.
const cache = new Map<string, { text: string; expires: number }>();
const inFlight = new Map<string, Promise<PoetryResult>>();
const recent = new Map<string, number[]>();

export async function writeJourneyPoem(id: string): Promise<PoetryResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { error: "Poetic introduction temporarily unavailable." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to read the poetic introduction for this path." };
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "Poetic introduction temporarily unavailable, please check back later to read this path." };
  const { data: row, error } = await supabase.from("literary_routes").select("content,duration,model").eq("id", id).single();
  if (error || !row) return { error: "Unable to load this route temporarily, please refresh and try again." };
  const perspective = journeyPerspective(row.content.perspective || "gringoire");
  if (!perspective) return { error: "Unable to load the perspective for this route temporarily." };
  const locale = await getLocale();
  const candidates = candidatesForPerspective(perspective.id, locale);
  let prompt: string;
  try { prompt = poetryPrompt(validateLiteraryRoute(row.content, candidates, row.duration), candidates, perspective, locale); }
  catch { return { error: "The source material basis for this route is incomplete, so the introduction cannot be written yet." }; }
  const cacheKey = `${id}:${process.env.GEMINI_MODEL || "default"}:${prompt}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return { text: cached.text };
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;
  const now = Date.now();
  const attempts = (recent.get(user.id) || []).filter(t => now - t < 60000);
  if (attempts.length >= 3) return { error: "Take your time reading a section of the path first, and unfold new poetic introductions later." };
  if (recent.size > 1000) recent.clear();
  recent.set(user.id, [...attempts, now]);
  const work = (async (): Promise<PoetryResult> => {
    try {
      const { response } = await requestGeminiJson(key, prompt, { type: "OBJECT", properties: { text: { type: "STRING" } }, required: ["text"] });
      if (!response.ok) return { error: "The poetic introduction is not yet finished, please try again later." };
      const output = await response.json();
      const candidate = output.candidates?.[0];
      if (candidate?.finishReason !== "STOP") throw Error("Incomplete poem");
      const raw = candidate.content?.parts?.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join("");
      const text = validateJourneyPoem(JSON.parse(raw), locale);
      // Place names are checked so the introduction stays tied to this route.
      if (!candidates.filter(p => row.content.stops.some((s: { place_id: string }) => s.place_id === p.id)).every(p => text.includes(p.name))) throw Error("Missing route places");
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(cacheKey, { text, expires: Date.now() + 3600000 });
      return { text };
    } catch { return { error: "The poetic introduction is not yet finished, please try again later." }; }
  })();
  inFlight.set(cacheKey, work);
  try { return await work; } finally { inFlight.delete(cacheKey); }
}
