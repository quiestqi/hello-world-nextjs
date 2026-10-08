import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return <main style={{ padding: 40 }}>Unable to load your profile. Please try again later.</main>;
  }

  if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
    redirect("/profile");
  }

  const { data: coffees, error } = await supabase
    .from("coffees")
    .select("*")
    .order("id", { ascending: true });

  return (
    <main style={{ padding: 40 }}>
      <h1>Coffee List ☕</h1>

      <nav
        aria-label="Account navigation"
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          margin: "24px 0",
        }}
      >
        <Link href="/members">Members</Link>
        <Link href="/profile">Profile</Link>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </nav>

      {error ? (
        <p role="alert">Unable to load coffees. Please try again later.</p>
      ) : (
        <ul>
          {coffees?.map((coffee) => (
            <li key={coffee.id} style={{ marginBottom: 24 }}>
              <h2>{coffee.name}</h2>
              <p>
                <strong>Origin:</strong> {coffee.origin}
              </p>
              <p>{coffee.description}</p>
            </li>
          ))}
        </ul>
      )}

    </main>
  );
}