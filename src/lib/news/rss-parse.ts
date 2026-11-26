import { XMLParser } from "fast-xml-parser";

/*
 * Lectura de feeds RSS 2.0, RSS 1.0 (RDF) y Atom. Solo nos quedamos con
 * titular, enlace, fecha y un extracto corto en texto plano: nunca se copia
 * el artículo ni sus imágenes (la redacción reescribe el resumen y enlaza).
 */

export type FeedItem = { title: string; link: string; summary: string; publishedAt: string | null };

const named: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–",
  laquo: "«", raquo: "»", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", euro: "€", iexcl: "¡", iquest: "¿",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü", ccedil: "ç",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", Uuml: "Ü", Ccedil: "Ç",
  agrave: "à", egrave: "è", ograve: "ò", acirc: "â", ecirc: "ê", ocirc: "ô", icirc: "î", ucirc: "û",
  atilde: "ã", otilde: "õ", auml: "ä", ouml: "ö", Auml: "Ä", Ouml: "Ö", szlig: "ß",
};

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return named[e] ?? m;
  });
}

/** HTML → texto plano de una línea. */
export function plainText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/p>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:—–-]+$/, "")}…`;
}

const asArray = <T,>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return String((v as Record<string, unknown>)["#text"] ?? "");
  return "";
};

function safeLink(v: string) {
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function date(v: unknown) {
  const s = text(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseFeed(xml: string): FeedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", processEntities: true, htmlEntities: true, trimValues: true });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const out: FeedItem[] = [];
  type Node = Record<string, unknown>;

  const rss = doc.rss as Node | undefined;
  const rdf = (doc["rdf:RDF"] ?? doc.RDF) as Node | undefined;
  const atom = doc.feed as Node | undefined;

  const rssItems = [...asArray((rss?.channel as Node | undefined)?.item as Node[]), ...asArray(rdf?.item as Node[])];
  for (const it of rssItems) {
    const link = safeLink(text(it.link) || text((it.guid as Node | string | undefined) ?? ""));
    const title = plainText(text(it.title));
    if (!link || !title) continue;
    out.push({
      title: truncate(title, 200),
      link,
      summary: truncate(plainText(text(it.description) || text(it["content:encoded"]) || text(it.summary)), 600),
      publishedAt: date(it.pubDate ?? it["dc:date"] ?? it.published),
    });
  }

  for (const e of asArray(atom?.entry as Node[])) {
    const links = asArray(e.link as Node | Node[]);
    const alt = links.find((l) => !l["@rel"] || l["@rel"] === "alternate") ?? links[0];
    const link = safeLink(String(alt?.["@href"] ?? ""));
    const title = plainText(text(e.title));
    if (!link || !title) continue;
    out.push({
      title: truncate(title, 200),
      link,
      summary: truncate(plainText(text(e.summary) || text(e.content)), 600),
      publishedAt: date(e.published ?? e.updated),
    });
  }
  return out;
}

/** Solo direcciones públicas http(s): evita que una fuente apunte a la red interna del servidor. */
export function isAllowedFeedUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":") || h.startsWith("[")) return false; // IPs literales
  return h.includes(".");
}
