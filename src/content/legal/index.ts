import cookies from "./cookies.es.json";
import legalNotice from "./legal-notice.es.json";
import privacy from "./privacy.es.json";

/*
 * Textos legales copiados literalmente de la web actual (sportsmanagerconnect.es),
 * solo en español. Se regeneran desde el HTML original; no editar a mano sin
 * revisar con quien sea responsable legal.
 */

export type Inline = { text: string; b?: boolean; href?: string }[];
export type Block =
  | { t: "h"; level: number; c: Inline }
  | { t: "p"; c: Inline }
  | { t: "ul" | "ol"; items: { c: Inline; d: number }[] }
  | { t: "table"; rows: { h: boolean; c: Inline[] }[][] };
export type LegalDoc = { title: string; source: string; blocks: Block[] };

export const legalDocs = {
  "legal-notice": legalNotice as LegalDoc,
  privacy: privacy as LegalDoc,
  cookies: cookies as LegalDoc,
} as const;

export type LegalSlug = keyof typeof legalDocs;
export const legalSlugs = Object.keys(legalDocs) as LegalSlug[];
export const isLegalSlug = (v: string): v is LegalSlug => v in legalDocs;
