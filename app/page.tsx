import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured } from "@/lib/auth-config";
import { signOut } from "@/app/auth/actions";
import Explorer from "@/app/paris/explorer";
import type { NotebookEntry } from "@/lib/paris-data";

export default async function Home() {
  if (!isAuthConfigured()) redirect("/preview");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Explorer preview storageMode="device" storageKey="staged-paris:preview:v1" />;
  const { data: profile, error } = await supabase.from("profiles").select("first_name,last_name").eq("id", user.id).single();
  if (error) return <main style={{ padding: 40 }}>Unable to load profile, please try again later.</main>;
  if (!profile.first_name?.trim() || !profile.last_name?.trim()) redirect("/profile");
  const { data: entries, error: notebookError } = await supabase.from("literary_notebooks").select("place_id,saved,visited,note").eq("user_id", user.id);
  return <Explorer name={profile.first_name} storageMode={notebookError ? "device" : "cloud"} storageKey={`staged-paris:account:${user.id}`} initialEntries={(entries ?? []) as NotebookEntry[]} cloudUnavailable={!!notebookError} signOutAction={signOut} />;
}
