import type { Metadata } from "next";
import "./globals.css";
import "./manuscript.css";
import CursorFlock from "./components/cursor-flock";
import { LocaleProvider } from "./i18n/locale-provider";
import { getLocale } from "./i18n/locale-server";

export const metadata: Metadata = {
  title: "STAGED CITY — Read the city, write your journey",
  description: "Start from Hugo's Notre-Dame de Paris, follow the characters' footsteps, and explore Paris.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} className="h-full antialiased">
      <body className="min-h-full flex flex-col"><LocaleProvider locale={locale}>{children}<CursorFlock /></LocaleProvider></body>
    </html>
  );
}
