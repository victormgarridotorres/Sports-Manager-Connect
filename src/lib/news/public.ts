import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { anonClient as anon } from "@/lib/supabase/anon";
import { NEWS_PAGE_SIZE, type NewsSection } from "./options";

/*
 * Lectura PÚBLICA de noticias: cliente sin cookies (rol anónimo, RLS solo deja
 * ver lo publicado) y caché de Next con la etiqueta "news". Al publicar o
 * editar, las acciones de la redacción llaman a updateTag("news").
 */

export type NewsCard = {
  id: string;
  section: NewsSection;
  country: string | null;
  competition: string | null;
  language: string;
  title: string;
  summary: string | null;
  source_name: string | null;
  author_name: string | null;
  published_at: string;
};
export type NewsArticle = NewsCard & { body: string | null; source_url: string | null; updated_at: string };

const CARD = "id, section, country, competition, language, title, summary, source_name, author_name, published_at";

export type NewsFilters = { section?: NewsSection; country?: string; page?: number };

export async function listNews(f: NewsFilters): Promise<{ rows: NewsCard[]; total: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("news");
  const page = f.page ?? 1;
  let q = anon().from("news_articles").select(CARD, { count: "exact" }).order("published_at", { ascending: false });
  if (f.section) q = q.eq("section", f.section);
  if (f.country === "global") q = q.is("country", null);
  else if (f.country) q = q.eq("country", f.country);
  const { data, count, error } = await q.range((page - 1) * NEWS_PAGE_SIZE, page * NEWS_PAGE_SIZE - 1);
  if (error) console.error("[news:list]", error.code, error.message);
  return { rows: (data ?? []) as NewsCard[], total: count ?? 0 };
}

export async function latestNews(limit: number): Promise<NewsCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("news");
  const { data, error } = await anon().from("news_articles").select(CARD).order("published_at", { ascending: false }).limit(limit);
  if (error) console.error("[news:latest]", error.code, error.message);
  return (data ?? []) as NewsCard[];
}

/** Países que aparecen en las noticias publicadas (para el filtro). */
export async function newsCountries(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("news");
  const { data } = await anon().from("news_articles").select("country").not("country", "is", null).order("published_at", { ascending: false }).limit(300);
  return [...new Set((data ?? []).map((r) => r.country as string))];
}

export async function getNews(id: string): Promise<NewsArticle | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("news");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await anon()
    .from("news_articles")
    .select(`${CARD}, body, source_url, updated_at`)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("[news:get]", error.code, error.message);
  return (data as NewsArticle | null) ?? null;
}
