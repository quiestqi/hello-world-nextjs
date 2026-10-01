"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginWithGoogle() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Sign in to Coffee Club</h1>

      <button
        onClick={loginWithGoogle}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "12px 20px",
          background: "#30563b",
          color: "white",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        {loading ? "Opening Google…" : "Continue with Google"}
      </button>

      {error && <p role="alert">{error}</p>}
    </main>
  );
}