"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildPrompt, moods, validateWalk, type Place } from "@/lib/routes";

type Result = { error?: string; success?: string };
export async function generateWalk(_previous: Result, form: FormData): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in before creating a walk." };
  const mood = String(form.get("mood") ?? "");
  const duration = Number(form.get("duration"));
  if (!moods.some(m => m === mood) || ![60,90,120].includes(duration)) return { error: "Choose a mood and outing length." };
  if (!process.env.GEMINI_API_KEY) return { error: "AI generation is being set up. Please try again later." };
  const { data, error } = await supabase.from("places").select("id,name,kind,address,description,visit_note,source_url");
  if (error || !data?.length) return { error: "Unable to load the place catalogue. Please try again." };
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const places = (data as Place[]).filter(p => p.kind !== "garden" || (date.getMonth() >= 3 && date.getMonth() <= 9 && date.getDay() !== 1));
  const { data: attempt, error: quotaError } = await supabase.rpc("reserve_generation");
  if (quotaError || !attempt) return { error: quotaError?.message.includes("Daily generation") ? "You've used your five attempts for the last 24 hours. Come back tomorrow." : "Unable to start a generation. Please try again." };
  const prompt = buildPrompt(places, mood, duration);
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: {
        responseMimeType: "application/json", maxOutputTokens: 4096,
        responseSchema: { type: "OBJECT", properties: {
          title: { type: "STRING" }, summary: { type: "STRING" }, stops: { type: "ARRAY", minItems: 3, maxItems: 4, items: { type: "OBJECT", properties: {
            place_id: { type: "STRING", enum: places.map(p => p.id) }, reason: { type: "STRING" }, activity: { type: "STRING" }, minutes: { type: "INTEGER" }
          }, required: ["place_id","reason","activity","minutes"] } }
        }, required: ["title","summary","stops"] }
      } }), signal: AbortSignal.timeout(45000), cache: "no-store"
    });
    if (!response.ok) {
      // Log codes only: provider bodies may contain credentials or request data.
      console.error("coffee-walk model request", { model, status: response.status });
      if (response.status === 429) return { error: "AI generation is at its usage limit. Please try again later." };
      if (response.status === 404) return { error: "The configured AI model is unavailable. Please contact the site owner." };
      if (response.status === 400 || response.status === 403) return { error: "The AI service configuration needs attention. Please contact the site owner." };
      throw new Error("Model request failed");
    }
    const output = await response.json();
    const candidate = output.candidates?.[0];
    if (candidate?.finishReason !== "STOP") {
      console.error("coffee-walk incomplete output", { model, reason: candidate?.finishReason ?? "missing" });
      throw new Error("Incomplete generation");
    }
    const text = candidate.content?.parts?.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join("");
    const walk = validateWalk(JSON.parse(text), places, duration);
    const { error: saveError } = await supabase.rpc("save_generation", { p_attempt: attempt, p_content: walk, p_prompt: prompt, p_mood: mood, p_duration: duration, p_model: model });
    if (saveError) {
      console.error("coffee-walk save failed", { code: saveError.code });
      return { error: "Your walk could not be saved. Please try again." };
    }
  } catch (failure) {
    console.error("coffee-walk generation failed", { category: failure instanceof Error ? failure.name : "unknown" });
    return { error: "The AI couldn't finish a valid walk this time. Please try again. This attempt counts toward your daily limit." };
  }
  revalidatePath("/explore");
  return { success: "Your walk is ready! Find it at the top of Community walks below." };
}

export async function voteOnWalk(_previous: Result, form: FormData): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in before voting." };
  const id = String(form.get("generation_id") ?? "");
  const value = Number(form.get("value"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || ![-1,1].includes(value)) return { error: "Invalid vote." };
  const { error } = await supabase.from("votes").insert({ user_id: user.id, generation_id: id, value });
  if (error) return { error: error.code === "23505" ? "You've already voted on this walk." : "Your vote could not be saved. Please try again." };
  revalidatePath("/explore");
  return { success: "Vote saved. Thanks for helping others choose a walk." };
}
