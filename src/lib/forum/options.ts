export const forumCategories = ["transfers", "tactics", "rules", "international", "offtopic", "introductions"] as const;
export type ForumCategory = (typeof forumCategories)[number];
export const isForumCategory = (v: unknown): v is ForumCategory => typeof v === "string" && (forumCategories as readonly string[]).includes(v);

export const categoryIcon: Record<ForumCategory, string> = {
  transfers: "🔁",
  tactics: "📋",
  rules: "🏅",
  international: "🌍",
  offtopic: "💬",
  introductions: "👋",
};

/** Avatares neutros del foro (prototipo: «un icono neutro, no tu foto real»). */
export const forumAvatars = {
  eagle: { emoji: "🦅", bg: "linear-gradient(135deg,#33415c,#16223a)" },
  fox: { emoji: "🦊", bg: "linear-gradient(135deg,#57698c,#2e3f5c)" },
  wolf: { emoji: "🐺", bg: "linear-gradient(135deg,#dd9a2e,#16223a)" },
  lion: { emoji: "🦁", bg: "linear-gradient(135deg,#f0b64a,#c8841c)" },
  tiger: { emoji: "🐯", bg: "linear-gradient(135deg,#33415c,#0f1728)" },
  owl: { emoji: "🦉", bg: "linear-gradient(135deg,#57698c,#16223a)" },
} as const;
export type ForumAvatar = keyof typeof forumAvatars;
export const forumAvatarIds = Object.keys(forumAvatars) as ForumAvatar[];
export const isForumAvatar = (v: unknown): v is ForumAvatar => typeof v === "string" && v in forumAvatars;

/** Mismas reglas que la BD: 3–24 caracteres, sin espacios ni símbolos que confundan (@, /, <, …). */
export const ALIAS_RE = /^[^\s\p{Cc}<>@/\\#%&?"'`]{3,24}$/u;
export const TOPIC_TITLE = { min: 5, max: 140 } as const;
export const TOPIC_BODY = { min: 10, max: 8000 } as const;
export const POST_BODY = { min: 1, max: 8000 } as const;
export const TOPICS_PAGE_SIZE = 20;
export const POSTS_PAGE_SIZE = 50;

export const reportReasons = ["spam", "abuse", "personal_data", "off_topic", "other"] as const;
export type ReportReason = (typeof reportReasons)[number];

const aliasWords: Record<string, { a: string[]; b: string[] }> = {
  es: { a: ["Halcón", "Lince", "Lobo", "Puma", "Zorro", "Búho", "Tigre", "Águila"], b: ["Zurdo", "Veloz", "Central", "Pivote", "Extremo", "Portero", "Táctico", "Lateral"] },
  en: { a: ["Hawk", "Lynx", "Wolf", "Puma", "Fox", "Owl", "Tiger", "Eagle"], b: ["Lefty", "Swift", "Pivot", "Winger", "Keeper", "Tactician", "Backcourt", "Playmaker"] },
  fr: { a: ["Faucon", "Lynx", "Loup", "Puma", "Renard", "Hibou", "Tigre", "Aigle"], b: ["Gaucher", "Rapide", "Pivot", "Ailier", "Gardien", "Tacticien", "Arrière", "Meneur"] },
  de: { a: ["Falke", "Luchs", "Wolf", "Puma", "Fuchs", "Eule", "Tiger", "Adler"], b: ["Linkshänder", "Flink", "Kreis", "Außen", "Keeper", "Taktiker", "Rückraum", "Spielmacher"] },
  pt: { a: ["Falcão", "Lince", "Lobo", "Puma", "Raposa", "Coruja", "Tigre", "Águia"], b: ["Canhoto", "Veloz", "Pivô", "Ponta", "Guarda-redes", "Tático", "Lateral", "Central"] },
};

/** Alias sugerido. Con `seed` (p. ej. el id de usuario) siempre sale el mismo; sin él, uno al azar. */
export function suggestAlias(locale: string, seed?: string) {
  const w = aliasWords[locale] ?? aliasWords.es;
  let n: number;
  if (seed) {
    n = 0;
    for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  } else n = Math.floor(Math.random() * 2 ** 31);
  const a = w.a[n % w.a.length];
  const b = w.b[Math.floor(n / 8) % w.b.length];
  const num = Math.floor(n / 64) % 90 + 10;
  return `${a}_${b}${num}`.slice(0, 24);
}
