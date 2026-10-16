"use client";
import { createContext, useContext, useTransition, Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { translateText, type Locale } from "@/lib/localization";
import { changeLocale } from "./actions";
const LocaleContext = createContext<Locale>("en");
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) { return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>; }
export function useLocale() { return useContext(LocaleContext); }
function translateTree(children: ReactNode, locale: Locale): ReactNode {
  return Children.map(children, child => {
    if (typeof child === "string") return translateText(child, locale);
    if (!isValidElement(child)) return child;
    const node = child as ReactElement<Record<string, unknown>>;
    if (node.props["data-no-translate"]) return child;
    const props: Record<string, unknown> = {};
    if (typeof node.type === "string") for (const key of ["aria-label", "placeholder", "title", "alt"]) if (typeof node.props[key] === "string") props[key] = translateText(node.props[key] as string, locale);
    if (node.props.children !== undefined) props.children = translateTree(node.props.children as ReactNode, locale);
    return cloneElement(node, props);
  });
}
export function Localized({ children }: { children: ReactNode }) { return <>{translateTree(children, useLocale())}</>; }
export function LanguageSwitch() {
  const locale = useLocale(); const router = useRouter(); const [pending, start] = useTransition();
  return <button type="button" className="language-switch" disabled={pending} aria-label={locale === "en" ? "Switch to Chinese" : "切换为英文"} onClick={() => start(async () => { await changeLocale(locale === "en" ? "zh" : "en"); router.refresh(); })}>{pending ? "…" : locale === "en" ? "中文 / EN" : "中 / English"}</button>;
}
