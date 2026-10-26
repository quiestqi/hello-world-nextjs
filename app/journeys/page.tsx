import { Localized, LanguageSwitch } from "@/app/i18n/locale-provider";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured } from "@/lib/auth-config";
import { JourneyForm } from "./forms";
import "@/app/paris/paris.css";

export const maxDuration = 180;
export default async function JourneyStart() {
  if (!isAuthConfigured()) redirect("/login");
  const preview = false;
  let connected = false, unlimited = false;
  if (!preview) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase.from("profiles").select("first_name,last_name").eq("id", user.id).single();
    if (!profile?.first_name?.trim() || !profile?.last_name?.trim()) redirect("/profile");
    const { error } = await supabase.from("literary_places").select("id").limit(1);
    connected = !error;
    const { data: testAccount } = await supabase.rpc("is_literary_test_account");
    unlimited = testAccount === true;
  }
  return <Localized><main className="paris-app journeys-app"><header className="paris-header"><Link className="paris-brand" href={preview ? "/preview" : "/"}><span className="brand-mark">S<span>C</span></span><span>STAGED CITY<small>A CITY, READ DIFFERENTLY</small></span></Link><nav className="paris-tabs"><Link href={preview ? "/preview" : "/"}>01 / Story map</Link><Link href={preview ? "/journeys?preview=1" : "/journeys"}>02 / Your journey</Link><Link href={preview ? "/stories?preview=1" : "/stories"}>03 / City echoes</Link></nav><div className="paris-account"><LanguageSwitch /><Link href={preview ? "/login" : "/profile"}>{preview ? "Log In ↗" : "Profile"}</Link></div></header>
    <div className="journey-page journey-start-page"><section className="journey-hero"><div><p className="eyebrow">02 / FIND YOUR OWN THREAD</p><h1>Today,<br /><em>enter Paris with a different gaze.</em></h1><p>Borrow a character’s eyes, choose what draws you in, and let a literary thread lead you through Paris.</p></div></section><section className="journey-start"><JourneyForm enabled={preview || connected} preview={preview} aiEnabled={!!process.env.GEMINI_API_KEY} /><small>{preview ? "Route previews are not saved and do not include real ratings." : unlimited ? "Unlimited test account · Exempt from the daily limit of 5. Recommended order does not reflect the characters' original itineraries." : "Maximum 5 attempts every 24 hours. Recommended order does not reflect the characters' original itineraries."}</small></section>
    <p className="poetry-source">Generation settings and model responses are recorded for authorized administrators. Your free-text traveller wish is omitted from the request log.</p><footer className="journey-footer"><Link href={preview ? "/preview" : "/"}>← Back to Character Map</Link><Link href={preview ? "/journeys/routes?preview=1" : "/journeys/routes"}>View Existing Routes →</Link></footer></div></main></Localized>;
}
