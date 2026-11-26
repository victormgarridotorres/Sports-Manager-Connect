export const newsSections = ["transfers", "results", "national_teams", "opinion", "other"] as const;
export type NewsSection = (typeof newsSections)[number];
export const isNewsSection = (v: unknown): v is NewsSection => typeof v === "string" && (newsSections as readonly string[]).includes(v);

export const newsLanguages = ["es", "en", "fr", "de", "pt", "it", "pl", "hu", "da", "no", "sv", "hr", "sl"] as const;

export const NEWS_PAGE_SIZE = 13; // 1 principal + 2 secundarias + 10 en la lista
export const IMPORT_MAX_PER_FEED = 25;
export const IMPORT_MAX_AGE_DAYS = 14;
export const SUMMARY_MAX = 700;
export const BODY_MAX = 30000;

/** Degradado de la tarjeta según la sección (no usamos fotos de terceros). */
export const sectionTone: Record<NewsSection, "g1" | "g2" | "g3"> = {
  transfers: "g2",
  results: "g1",
  national_teams: "g3",
  opinion: "g1",
  other: "g2",
};

export function readingMinutes(text: string | null) {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Párrafos de un texto plano (línea en blanco = párrafo nuevo). */
export function paragraphs(text: string | null) {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const sectionIcon: Record<NewsSection, string> = {
  transfers: "🔁",
  results: "🏆",
  national_teams: "🌍",
  opinion: "💬",
  other: "🤾",
};
