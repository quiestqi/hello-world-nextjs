import originalTranslations from "@/data/english-translations.json";
import extraTranslations from "@/data/bilingual-ui.json";
export type Locale = "en" | "zh";
const forward = originalTranslations as Record<string, string>;
const reverse: Record<string, string> = Object.fromEntries(Object.entries(forward).map(([zh, en]) => [en, zh]));
Object.assign(reverse, extraTranslations);
export function translateText(text: string, locale: Locale): string {
  if (locale === "en") return forward[text] ?? text;
  const trimmed = text.trim();
  if (!trimmed || /[\u3400-\u9fff]/.test(trimmed)) return text;
  const translated = reverse[text] ?? reverse[trimmed];
  if (translated !== undefined) return text === trimmed ? translated : text.replace(trimmed, translated);
  const perspective = trimmed.match(/^(.+?)(?:’s|'s) (Paris|Perspective|perspective)(.*)$/);
  if (perspective) return `${reverse[perspective[1]] || perspective[1]}的${perspective[2] === "Paris" ? "巴黎" : "视角"}${perspective[3] ? perspective[3].replace(/:\s*(.+)/, (_, theme) => `：${reverse[theme] || theme}`) : ""}`;
  return text;
}
