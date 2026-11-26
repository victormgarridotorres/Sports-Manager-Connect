import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { newsSections, paragraphs, readingMinutes } from "@/lib/news/options";
import { decodeEntities, isAllowedFeedUrl, parseFeed, plainText, truncate } from "@/lib/news/rss-parse";
import { articleSchema, sourceSchema } from "@/lib/news/schemas";

const sql = readFileSync("supabase/migrations/20261201000000_phase6_news.sql", "utf8");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>Handball</title>
<item>
  <title>THW Kiel ficha a dos internacionales &amp; renueva</title>
  <link>https://example.com/kiel</link>
  <pubDate>Wed, 25 Nov 2026 10:00:00 GMT</pubDate>
  <description><![CDATA[<p>El <b>THW Kiel</b> confirma&nbsp;dos fichajes.</p><img src="x.jpg"><script>alert(1)</script>]]></description>
</item>
<item><title>Enlace peligroso</title><link>javascript:alert(1)</link></item>
<item><title></title><link>https://example.com/sin-titulo</link></item>
<item><title>Solo guid</title><guid>https://example.com/guid</guid><dc:date>2026-11-20T08:00:00Z</dc:date></item>
</channel></rss>`;

const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title type="html">L&apos;Équipe de France &lt;b&gt;gagne&lt;/b&gt;</title>
<link rel="alternate" href="https://example.fr/match"/><link rel="enclosure" href="https://example.fr/img.jpg"/>
<updated>2026-11-24T18:00:00Z</updated><summary>Victoire face à la Suède.</summary></entry></feed>`;

describe("lector de feeds", () => {
  it("RSS 2.0: titular, enlace, fecha y extracto en texto plano", () => {
    const items = parseFeed(rss);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "THW Kiel ficha a dos internacionales & renueva",
      link: "https://example.com/kiel",
      summary: "El THW Kiel confirma dos fichajes.",
      publishedAt: "2026-11-25T10:00:00.000Z",
    });
    expect(items[1].link).toBe("https://example.com/guid");
    expect(items[1].publishedAt).toBe("2026-11-20T08:00:00.000Z");
  });

  it("descarta enlaces que no son http(s) y entradas sin título", () => {
    expect(parseFeed(rss).map((i) => i.link)).not.toContain("javascript:alert(1)");
  });

  it("Atom: usa el enlace alternate y limpia HTML del título", () => {
    expect(parseFeed(atom)).toEqual([{ title: "L'Équipe de France gagne", link: "https://example.fr/match", summary: "Victoire face à la Suède.", publishedAt: "2026-11-24T18:00:00.000Z" }]);
  });

  it("documento que no es un feed", () => {
    expect(parseFeed("<html><body>hola</body></html>")).toEqual([]);
  });

  it("texto plano, entidades y recorte", () => {
    expect(decodeEntities("&laquo;Hola&raquo; &#241; &#xE9;")).toBe("«Hola» ñ é");
    expect(plainText("<p>a</p><style>x{}</style><br/>b")).toBe("a b");
    expect(truncate("uno dos tres cuatro cinco", 14)).toBe("uno dos tres…");
    expect(truncate("corto", 14)).toBe("corto");
  });

  it.each([
    ["https://handball-planet.com/feed/", true],
    ["http://www.marca.com/rss.xml", true],
    ["ftp://example.com/feed", false],
    ["http://localhost:3000/feed", false],
    ["http://127.0.0.1/feed", false],
    ["http://169.254.169.254/latest", false],
    ["http://[::1]/feed", false],
    ["https://user:pass@example.com/feed", false],
    ["http://intranet/feed", false],
    ["no es una url", false],
  ])("fuente permitida %s → %s", (url, ok) => {
    expect(isAllowedFeedUrl(url)).toBe(ok);
  });
});

describe("noticias: app y BD coinciden", () => {
  it("secciones", () => {
    const m = sql.match(/create type public\.news_section as enum \(([^)]*)\)/)?.[1] ?? "";
    expect([...m.matchAll(/'([^']+)'/g)].map((x) => x[1])).toEqual([...newsSections]);
  });
  it("las fuentes sugeridas empiezan desactivadas", () => {
    expect(sql).toMatch(/active\s+boolean not null default false/);
  });
  it("quién escribió o revisó una noticia no se puede leer", () => {
    const grants = [...sql.matchAll(/grant select \(([^)]*)\)\s*on public\.news_articles/g)].map((m) => m[1]).join(",");
    expect(grants).not.toMatch(/created_by|reviewed_by/);
  });
});

describe("formularios de la redacción", () => {
  const base = { intent: "publish", section: "transfers", language: "es", title: "THW Kiel ficha" };
  it("noticia válida; país opcional; campos vacíos = null", () => {
    const r = articleSchema.safeParse({ ...base, country: "DE", summary: "Resumen suficientemente largo." });
    expect(r.success && r.data.country).toBe("DE");
    const g = articleSchema.safeParse(base);
    expect(g.success && g.data.country).toBe(null);
    expect(g.success && g.data.summary).toBe(null);
  });
  it("rechaza país, sección o intención inválidos", () => {
    expect(articleSchema.safeParse({ ...base, country: "españa" }).success).toBe(false);
    expect(articleSchema.safeParse({ ...base, section: "gossip" }).success).toBe(false);
    expect(articleSchema.safeParse({ ...base, intent: "hack" }).success).toBe(false);
  });
  it("fuente: solo http(s)", () => {
    const s = { name: "Fuente", language: "es", default_section: "other" };
    expect(sourceSchema.safeParse({ ...s, feed_url: "https://x.com/feed" }).success).toBe(true);
    expect(sourceSchema.safeParse({ ...s, feed_url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("párrafos y tiempo de lectura", () => {
    expect(paragraphs("Uno\n\n  Dos\nsigue\n\n\n")).toEqual(["Uno", "Dos\nsigue"]);
    expect(readingMinutes("palabra ".repeat(660))).toBe(3);
    expect(readingMinutes(null)).toBe(1);
  });
});
