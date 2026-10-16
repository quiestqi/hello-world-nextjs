import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/localization";
export async function getLocale(): Promise<Locale> {
  return (await cookies()).get("staged-city-locale")?.value === "zh" ? "zh" : "en";
}
