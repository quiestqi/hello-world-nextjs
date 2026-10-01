import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        {user ? (
          <>
            <Link href="/members">Members</Link>
            <Link href="/profile">Profile</Link>

            <form action={signOut}>
              <button type="submit">Sign out</button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            style={{
              padding: "12px 20px",
              background: "#30563b",
              color: "white",
              borderRadius: 8,
            }}
          >
            Sign in / Join Coffee Club
          </Link>
        )}
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