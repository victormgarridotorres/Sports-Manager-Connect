export const locales = ["es", "en", "fr", "de", "pt"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
};

export const localeFlags: Record<Locale, string> = {
  es: "🇪🇸",
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  pt: "🇵🇹",
};

export function hasLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Devuelve el locale del primer segmento de la ruta, si lo hay. */
export function localeFromPathname(pathname: string): Locale | null {
  const first = pathname.split("/")[1];
  return hasLocale(first) ? first : null;
}

/**
 * Elige el mejor idioma a partir de la cabecera Accept-Language
 * (p. ej. "fr-CH, fr;q=0.9, en;q=0.8"). Sólo se compara el idioma base.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number(q.trim().slice(2)) : 1;
      return { lang: tag.toLowerCase().split("-")[0], quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);
  return ranked.find((entry) => hasLocale(entry.lang))?.lang as Locale | undefined ?? defaultLocale;
}
