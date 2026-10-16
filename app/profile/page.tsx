import { Localized, LanguageSwitch } from "@/app/i18n/locale-provider";
import Link from "next/link";
import { isAuthConfigured } from "@/lib/auth-config";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveProfile, uploadAvatar } from "./actions";
import { ProfileSubmit } from "./profile-submit";
import "@/app/paris/paris.css";
import "./profile.css";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  if (!isAuthConfigured()) redirect("/login");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (error) {
    return <Localized><main className="paris-app profile-app"><div className="profile-page"><p className="eyebrow">YOUR READER’S FILE</p><h1>Data is temporarily closed.</h1><p>Please refresh later and continue your Paris story.</p><Link href="/profile">Reopen →</Link></div></main></Localized>;
  }

  let photoUrl: string | undefined;

  if (profile.avatar_url) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 3600);

    photoUrl = data?.signedUrl;
  }

  const params = await searchParams;
  const incomplete =
    !profile.first_name?.trim() || !profile.last_name?.trim();

  const errors: Record<string, string> = {
    missing: "Please enter your first and last name.",
    length: "First and last name must not exceed 80 characters each.",
    save: "Name not yet saved, please try again.",
    photo: "Please select a JPG, PNG, or WebP image under 5 MB.",
    upload: "Avatar not yet saved, please try again.",
  };
  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "A city wanderer";
  const initials = [profile.first_name, profile.last_name].filter(Boolean).map(part => Array.from(part!.trim())[0]).join("").toUpperCase() || "SC";

  return <Localized><main className="paris-app profile-app">
    <header className="paris-header"><Link className="paris-brand" href="/"><span className="brand-mark">S<span>C</span></span><span>STAGED CITY<small>A CITY, READ DIFFERENTLY</small></span></Link><nav className="paris-tabs" aria-label="Main navigation"><Link href="/">Explore Map</Link><Link href="/journeys">Journeys</Link></nav><div className="paris-account"><LanguageSwitch /><span aria-current="page">Profile</span></div></header>
    <div className="profile-page"><section className="profile-intro"><div><p className="eyebrow">THE READER / YOUR PERSONAL FILE</p><h1>The gaze within the story,<br /><span>Your very own name.</span></h1><p>Before entering another person&apos;s story, leave a small mark of your own.</p></div><span className="profile-file-mark" aria-hidden="true">PARIS<br />READER’S<br />ARCHIVE<br /><b>01 / IDENTITY</b></span></section>
      <div className="profile-layout">
        <aside className="reader-pass" aria-label="Wanderer profile card"><div className="reader-pass-heading"><span>STAGED CITY</span><span>ADMIT ONE</span></div><div className="reader-pass-content"><div className="reader-photo">{photoUrl ? <picture><img src={photoUrl} alt="Your avatar" width={160} height={160} /></picture> : <span aria-label="Initials">{initials}</span>}</div><p className="eyebrow">A READER IN THE CITY</p><h2>{displayName}</h2><p className="reader-email">{user.email}</p><div className="reader-status"><span aria-hidden="true">{incomplete ? "○" : "●"}</span>{incomplete ? "Complete your name to set off" : "Profile ready, set off anytime"}</div></div><div className="reader-pass-stub"><span>ONE READER.<br />COUNTLESS PERSPECTIVES.</span><span className="reader-stamp">PARIS<br />48°51′ N</span></div><p className="reader-pass-note">You may temporarily borrow the gaze of the characters,<br />Or remain entirely yourself.</p></aside>
        <div className="profile-editor">
          {params.saved === "1" && <p role="status" className="profile-message">✓ Avatar updated.</p>}
          {params.error && <p role="alert" className="profile-message profile-error">{errors[params.error] ?? "Action could not be completed, please try again."}</p>}
          <section className="profile-section"><div className="profile-section-title"><span>01</span><div><h2>What should we call you?</h2><p>This is your personal profile, you can edit it anytime.</p></div></div><form action={saveProfile} className="profile-form"><div className="profile-name-fields"><label htmlFor="profile-first">First name <small>FIRST NAME</small><input id="profile-first" name="first_name" defaultValue={profile.first_name ?? ""} required maxLength={80} autoComplete="given-name" /></label><label htmlFor="profile-last">Last name <small>LAST NAME</small><input id="profile-last" name="last_name" defaultValue={profile.last_name ?? ""} required maxLength={80} autoComplete="family-name" /></label></div><ProfileSubmit pendingText="Saving name…">Save name and step into Paris <span aria-hidden="true">→</span></ProfileSubmit></form></section>
          <section className="profile-section"><div className="profile-section-title"><span>02</span><div><h2>Add a photo for this profile <small>Optional</small></h2><p>A familiar face, or a fragment of the city you love.</p></div></div><form action={uploadAvatar} className="profile-form profile-photo-form"><label htmlFor="profile-photo">Select Avatar<input id="profile-photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" required /><small className="profile-file-help">JPG / PNG / WEBP · Max 5 MB</small></label><ProfileSubmit secondary pendingText="Uploading avatar...">{photoUrl ? "Update Avatar" : "Upload Avatar"} <span aria-hidden="true">↗</span></ProfileSubmit></form></section>
          <section className="profile-departure"><p className="eyebrow">THE CITY IS WAITING</p><h2>Next act, on the streets.</h2><div><Link href="/">Explore Paris map <span aria-hidden="true">↗</span></Link><Link href="/journeys">Select today&apos;s perspective <span aria-hidden="true">↗</span></Link><Link href="/journeys/routes">Browse saved routes <span aria-hidden="true">↗</span></Link></div></section>
        </div>
      </div>
      <footer className="profile-footer"><span>YOUR NAME. YOUR PACE. YOUR PARIS.</span><Link href="/">← Back to the city</Link></footer>
    </div>
  </main></Localized>;
}
