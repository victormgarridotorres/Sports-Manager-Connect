import "server-only";
import { isAllowedFeedUrl, parseFeed, type FeedItem } from "./rss-parse";

const MAX_BYTES = 3 * 1024 * 1024;

/** Descarga y lee un feed. Lanza un Error con un mensaje corto si algo falla. */
export async function fetchFeed(url: string): Promise<FeedItem[]> {
  if (!isAllowedFeedUrl(url)) throw new Error("URL no permitida");
  const res = await fetch(url, {
    headers: { "user-agent": "SportsManagerConnect-NewsBot/1.0 (+RSS)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!isAllowedFeedUrl(res.url || url)) throw new Error("Redirección no permitida");
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new Error("Feed demasiado grande");
  const xml = await res.text();
  if (xml.length > MAX_BYTES) throw new Error("Feed demasiado grande");
  const items = parseFeed(xml);
  if (!items.length && !/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new Error("No parece un feed RSS/Atom");
  return items;
}
