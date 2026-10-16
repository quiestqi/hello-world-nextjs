import { Localized, LanguageSwitch } from "@/app/i18n/locale-provider";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured } from "@/lib/auth-config";
import { candidatesForPerspective } from "@/lib/literary-candidates";
import { literaryDirections, validateLiteraryRoute, planCatalogueJourney, journeyThemes, type LiteraryRoute } from "@/lib/literary-routes";
import { journeyPerspective } from "@/lib/literary-perspectives";
import { getLocale } from "@/app/i18n/locale-server";
import { routeForLocale } from "@/lib/english-route";
import { scenes } from "@/lib/paris-data";
import { readJourneyPreferences, rankForInterests } from "@/lib/journey-preferences";
import { GenerationArrival } from "../generation-arrival";
import { JourneyCard } from "../journey-card";
import { JourneyMap } from "../journey-map";
import "@/app/paris/paris.css";

export const maxDuration = 180;
type RouteRow = { id: string; user_id: string; content: LiteraryRoute; duration: number; model: string };
export default async function JourneyRoutes({ searchParams }: { searchParams: Promise<{ batch?: string; preview?: string; perspective?: string; theme?: string; duration?: string; start?: string; interests?: string | string[]; wish?: string }> }) {
  const params = await searchParams;
  const locale = await getLocale();
  if (!isAuthConfigured()) redirect("/login");
  const preview = false;
  let rows: RouteRow[] = [], votes: { route_id: string; value: number }[] = [], totals: { route_id: string; upvotes: number; downvotes: number }[] = [], prompts: { route_id: string; prompt: string }[] = [];
  let chosenRoute = "";
  let uid = "", connected = false, votesFailed = false;
  if (!preview) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    uid = user.id;
    const {data:choice}=await supabase.from("literary_journey_choices").select("route_id").eq("user_id",uid).maybeSingle();
    chosenRoute=choice?.route_id || "";
    const { data: profile } = await supabase.from("profiles").select("first_name,last_name").eq("id", uid).single();
    if (!profile?.first_name?.trim() || !profile?.last_name?.trim()) redirect("/profile");
    let query=supabase.from("literary_routes").select("id,user_id,content,duration,model").eq("user_id",uid).order("created_at",{ascending:false}).limit(30);
    if(params.batch && /^[0-9a-f-]{36}$/i.test(params.batch)) query=query.eq("attempt_id",params.batch);
    const {data,error}=await query;
    connected = !error;
    rows = (data || []) as RouteRow[];
    const ids = rows.map(r => r.id);
    if (ids.length) {
      const [v, t, p] = await Promise.all([supabase.from("literary_votes").select("route_id,value").in("route_id", ids), supabase.rpc("literary_vote_totals", { p_ids: ids }), supabase.from("literary_route_prompts").select("route_id,prompt").in("route_id", ids)]);
      votes = v.data || []; totals = t.data || []; prompts = p.data || []; votesFailed = !!v.error || !!t.error;
    }
  }
  const chosen = journeyPerspective(params.perspective || "gringoire") || journeyPerspective("gringoire")!;
  const duration = [60, 90, 120].includes(Number(params.duration)) ? Number(params.duration) : 90;
  const theme = journeyThemes.find(t => t === params.theme) || journeyThemes[0];
  const previewForm = new FormData();
  previewForm.set("start", params.start || "any");
  previewForm.set("wish", params.wish || "");
  for (const i of Array.isArray(params.interests) ? params.interests : params.interests ? [params.interests] : []) previewForm.append("interests", i);
  let preferences;
  try { preferences = readJourneyPreferences(previewForm); } catch { preferences = { start: "any", interests: [], wish: "" }; }
  const previewCandidates = rankForInterests(candidatesForPerspective(chosen.id, locale), preferences.interests);
  if (!previewCandidates.some(c => c.id === preferences.start)) preferences.start = "any";
  const sample: LiteraryRoute = preview ? { ...planCatalogueJourney(previewCandidates, theme, duration, [], chosen, preferences.start, preferences.interests.length > 0), perspective: chosen.id } : { title: "", summary: "", stops: [] };
  const display = preview ? [{ id: "preview", user_id: "", content: sample, duration, model: "Preview Example" }] : rows;
  return <Localized><main className="paris-app journeys-app"><header className="paris-header"><Link className="paris-brand" href={preview ? "/preview" : "/"}><span className="brand-mark">S<span>C</span></span><span>STAGED CITY<small>A CITY, READ DIFFERENTLY</small></span></Link><nav className="paris-tabs"><Link href={preview ? "/preview" : "/"}>01 / Story map</Link><Link href={preview ? "/journeys?preview=1" : "/journeys"}>02 / Your journey</Link><Link href={preview ? "/stories?preview=1" : "/stories"}>03 / City echoes</Link></nav><div className="paris-account"><LanguageSwitch /><Link href={preview ? "/login" : "/profile"}>{preview ? "Log In ↗" : "Profile"}</Link></div></header>
    <div className="journey-page">{params.batch && !preview && rows.length > 0 && <GenerationArrival batch={params.batch} count={rows.length} />}<section className="journey-results-intro"><p className="eyebrow">02 / CHOOSE YOUR JOURNEY</p><h1>Read the city.<br /><em>Write your journey.</em></h1><p>Compare your possible journeys. Open a route, listen to its story, then choose the one you would follow today.</p><Link className="journey-replan" href={preview ? "/journeys?preview=1" : "/journeys"}>← Choose another perspective</Link><Link className="journey-replan" href={preview ? "/journeys?preview=1" : "/journeys"}>Create another possibility →</Link></section>
    {!preview && !connected && <p className="journey-notice">The new Paris route library is not yet connected.<Link href="/explore">Route recommendations and ratings from the original project remain available here ↗</Link></p>}
    <div className="journey-section-heading"><div><p className="eyebrow">YOUR ROUTES / THE CITY AWAITS</p><h2>{preview ? "Take a look at an exploration route first" : "Routes through the city"}</h2></div><p>{preview ? "Database Preview · Unsaved · No Real Ratings" : "Find a walk that speaks to you, then leave your own impression."}</p></div>
    {!display.length && <div className="journey-empty">No routes yet. Choose today&apos;s perspective, story thread, and interests to begin exploring.</div>}
    <div className="journey-cards">{display.map(row => {
      const perspective = journeyPerspective(row.content.perspective || "gringoire");
      if (!perspective) return null;
      const candidates = candidatesForPerspective(perspective.id, locale);
      let route: LiteraryRoute;
      try { route = routeForLocale(validateLiteraryRoute(row.content, candidates, row.duration), candidates, perspective, locale); } catch { return null; }
      const count = totals.find(t => t.route_id === row.id), ownVote = votes.find(v => v.route_id === row.id), prompt = prompts.find(p => p.route_id === row.id);
      const directions = literaryDirections(route.stops, candidates);
      return <JourneyCard key={`${row.id}:${chosenRoute === row.id}`} id={row.id} title={route.title} perspective={perspective.id === "free" ? "Free Exploration" : perspective.name + "'s Perspective"} preview={preview} initialChosen={row.id === chosenRoute} rating={{ value: ownVote?.value, up: Number(count?.upvotes || 0), down: Number(count?.downvotes || 0), failed: votesFailed }}><p className="eyebrow">{preview ? "PREVIEW JOURNEY" : row.user_id === uid ? "YOUR JOURNEY" : "COMMUNITY JOURNEY"}</p>{!preview && <p className="tiny-note">{row.model === "catalogue-planner-v1" ? "Original Database Recommendation · Non-AI Generated" : "AI-Assisted Recommendation · Based on Original Novel Scenes"}</p>}<p>{route.summary}</p><ol>{route.stops.map((stop, i) => { const place = candidates.find(c => c.id === stop.place_id)!; const scene = scenes.find(s => s.id === stop.scene_id)!; return <li key={stop.place_id}><span>{String(i + 1).padStart(2, "0")}</span><div><h4>{place.name}</h4><p>{stop.reason}</p><a href={scene.evidence.url} target="_blank" rel="noreferrer">Novel Book {scene.book}  · Chapter {scene.chapter}  Ch. ↗</a></div></li>; })}</ol><JourneyMap stops={route.stops.map(stop => { const p = candidates.find(c => c.id === stop.place_id)!; return { id: p.id, name: p.name, lat: p.lat, lng: p.lng }; })} />{directions && <a className="journey-directions" href={directions} target="_blank" rel="noreferrer">Open today&apos;s walking directions ↗</a>}<p className="tiny-note">These are modern reference points for a literary walk. Indoor access is not guaranteed, and this is not a reconstruction of the character’s exact itinerary.</p>{prompt && <details className="archive-note"><summary>View my generation sources</summary><p>Model: {row.model}</p><pre className="journey-prompt">{prompt.prompt}</pre></details>}</JourneyCard>;
    })}</div><footer className="journey-footer"><Link href={preview ? "/preview" : "/"}>← Back to Character Map</Link>{!preview && <Link href="/explore">Saved Routes &amp; Ratings ↗</Link>}</footer></div></main></Localized>;
}
