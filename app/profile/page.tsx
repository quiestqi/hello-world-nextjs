import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveProfile, uploadAvatar } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
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
    return <main style={{ padding: 40 }}>Unable to load your profile. Please try again later.</main>;
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
    length: "First and last names must each be 80 characters or fewer.",
    save: "Unable to save your name. Please try again.",
    photo: "Choose a JPG, PNG or WebP image up to 5 MB.",
    upload: "Unable to save your photo. Please try again.",
  };

  const inputStyle = {
    display: "block",
    width: "100%",
    border: "1px solid #999",
    padding: 10,
    marginTop: 8,
  };

  const buttonStyle = {
    padding: 12,
    background: "#30563b",
    color: "white",
    borderRadius: 8,
  };

  return (
    <main style={{ padding: 40, maxWidth: 500 }}>
      <h1>Profile</h1>
      <p>{user.email}</p>

      {incomplete && <p>Welcome! Please add your first and last name.</p>}

      {params.saved === "1" && (
        <p
          role="status"
          style={{ color: "#166534", background: "#dcfce7", padding: 12 }}
        >
          Saved successfully!
        </p>
      )}

      {params.error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {errors[params.error] ?? "Something went wrong. Please try again."}
        </p>
      )}

      <form
        action={saveProfile}
        style={{ display: "grid", gap: 20, marginTop: 24 }}
      >
        <label>
          First name
          <input
            name="first_name"
            defaultValue={profile.first_name ?? ""}
            required
            maxLength={80}
            autoComplete="given-name"
            style={inputStyle}
          />
        </label>

        <label>
          Last name
          <input
            name="last_name"
            defaultValue={profile.last_name ?? ""}
            required
            maxLength={80}
            autoComplete="family-name"
            style={inputStyle}
          />
        </label>

        <button type="submit" style={buttonStyle}>
          Save name
        </button>
      </form>

      <section style={{ marginTop: 40 }}>
        <h2>Profile photo</h2>

        {photoUrl && (
          <picture>
            <img
              src={photoUrl}
              alt="My profile photo"
              width={120}
              height={120}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                marginTop: 16,
              }}
            />
          </picture>
        )}

        <form
          action={uploadAvatar}
          style={{ display: "grid", gap: 16, marginTop: 20 }}
        >
          <label>
            Choose a photo (JPG, PNG or WebP, up to 5 MB)
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              required
              style={inputStyle}
            />
          </label>

          <button type="submit" style={buttonStyle}>
            Upload photo
          </button>
        </form>
      </section>
    </main>
  );
}