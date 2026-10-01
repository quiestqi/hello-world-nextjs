import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function MembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  if (error) {
    return <main style={{ padding: 40 }}>Unable to load your profile. Please try again later.</main>;
  }

  if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
    redirect("/profile");
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Welcome to Coffee Club, {profile.first_name}!</h1>
      <p>This page is only available to signed-in members.</p>

      <Link
        href="/profile"
        style={{ display: "inline-block", marginTop: 20, textDecoration: "underline" }}
      >
        Edit profile
      </Link>
      <form action={signOut} style={{ marginTop: 24 }}>
  <button
    type="submit"
    style={{
      padding: "12px 20px",
      background: "#30563b",
      color: "white",
      borderRadius: 8,
    }}
  >
    Sign out
  </button>
</form>
    </main>
  );
}