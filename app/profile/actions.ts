"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (!firstName || !lastName) {
    redirect("/profile?error=missing");
  }

  if (firstName.length > 80 || lastName.length > 80) {
    redirect("/profile?error=length");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
    })
    .eq("id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    redirect("/profile?error=save");
  }

  redirect("/profile?saved=1");
}
export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    redirect("/profile?error=photo");
  }

  const formats: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = formats[photo.type];

  if (!extension || photo.size > 5 * 1024 * 1024) {
    redirect("/profile?error=photo");
  }

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (readError) {
    redirect("/profile?error=upload");
  }

  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, photo, { contentType: photo.type });

  if (uploadError) {
    redirect("/profile?error=upload");
  }

  const { data, error: saveError } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id)
    .select("id")
    .single();

  if (saveError || !data) {
    await supabase.storage.from("avatars").remove([path]);
    redirect("/profile?error=upload");
  }

  if (profile.avatar_url) {
    await supabase.storage
      .from("avatars")
      .remove([profile.avatar_url]);
  }

  redirect("/profile?saved=1");
}