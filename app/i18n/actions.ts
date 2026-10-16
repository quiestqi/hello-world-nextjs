"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
export async function changeLocale(locale: string) {
  if (locale !== "en" && locale !== "zh") return;
  (await cookies()).set("staged-city-locale", locale, { path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  revalidatePath("/", "layout");
}
