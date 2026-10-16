"use client";

import { Localized, LanguageSwitch } from "@/app/i18n/locale-provider";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "@/app/paris/paris.css";
import "./login.css";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  async function loginWithGoogle() {
    setError(""); setLoading(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
    } catch { setError("Sign-in failed, please try again."); setLoading(false); }
  }
  return <Localized><main className="paris-login theatre-login">
    <div className="theatre-curtain curtain-left" aria-hidden="true" /><div className="theatre-curtain curtain-right" aria-hidden="true" />
    <header className="theatre-masthead"><Link href="/preview" className="theatre-wordmark">STAGED CITY<span>A CITY, READ DIFFERENTLY</span></Link><div className="theatre-header-tools"><LanguageSwitch /><span className="theatre-edition">A LITERARY WALK<br />PARIS / VOL. 01</span></div></header>
    <section className="theatre-stage" aria-labelledby="login-title">
      <div className="stage-rail rail-left" aria-hidden="true" /><div className="stage-rail rail-right" aria-hidden="true" />
      <p className="theatre-act">[ ACT I — THE CITY AWAITS ]</p>
      <h1 id="login-title">STAGED<br /><span>CITY</span><span className="type-cursor" aria-hidden="true">_</span></h1>
      <p className="theatre-invitation">Curtain up. See Paris through a different lens.</p>
      <p className="theatre-description">One book, one city, a solo wandering journey.<br />Step from the pages of Notre-Dame de Paris into your own streets.</p>
      <div className="theatre-ticket"><div className="ticket-top"><span>ADMIT ONE</span><span>YOUR STORY STARTS HERE</span></div><button className="login-primary" onClick={loginWithGoogle} disabled={loading || !configured}><span>{loading ? "Redirecting to Google…" : "Sign in with Google"}</span><span aria-hidden="true">→</span></button><Link className="login-preview" href="/preview">Explore the city first ↗</Link>{error && <p role="alert" className="login-error">{error}</p>}{!configured && <p className="login-help">Sign-in service is disconnected, you can still explore the map.</p>}<div className="ticket-stub"><span>ONE READER. ONE CITY.</span><span>N° 001</span></div></div>
      <p className="theatre-stage-note">No need to be the protagonist of the story.<br />Walk your own path through another person&apos;s eyes.</p>
    </section>
    <footer className="theatre-footer"><span>BASED ON VICTOR HUGO’S<br />NOTRE-DAME DE PARIS / 1831</span><span>48°51′ N · 2°21′ E<br />THE STREETS ARE YOUR STAGE.</span></footer>
  </main></Localized>;
}
