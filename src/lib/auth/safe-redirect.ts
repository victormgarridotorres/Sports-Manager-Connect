import { hasLocale, type Locale } from "@/i18n/config";

/**
 * Valida un parámetro ?next= para evitar open redirects: sólo se aceptan
 * rutas internas que empiecen por un locale soportado ("/es/...").
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  try {
    const url = new URL(next, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return fallback;
    const first = url.pathname.split("/")[1];
    if (!hasLocale(first)) return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

export function localeOfPath(path: string, fallback: Locale): Locale {
  const first = path.split("/")[1];
  return hasLocale(first) ? first : fallback;
}
