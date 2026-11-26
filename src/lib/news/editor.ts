import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NewsSection } from "./options";

export type EditorArticle = {
  id: string;
  status: "draft" | "published" | "discarded";
  section: NewsSection;
  country: string | null;
  competition: string | null;
  language: string;
  title: string;
  summary: string | null;
  body: string | null;
  author_name: string | null;
  source_name: string | null;
  source_url: string | null;
  source_published_at: string | null;
  published_at: string | null;
  created_at: string;
};

export type NewsSource = {
  id: string;
  name: string;
  feed_url: string;
  site_url: string | null;
  language: string;
  country: string | null;
  default_section: NewsSection;
  active: boolean;
  last_fetched_at: string | null;
  last_item_count: number | null;
  last_error: string | null;
};

const COLS = "id, status, section, country, competition, language, title, summary, body, author_name, source_name, source_url, source_published_at, published_at, created_at";

export async function isNewsEditor(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_news_editor");
  return data === true;
}

export async function editorList(status: EditorArticle["status"], limit = 60) {
  const supabase = await createClient();
  const order = status === "published" ? "published_at" : "created_at";
  const { data, error, count } = await supabase
    .from("news_articles")
    .select(COLS, { count: "exact" })
    .eq("status", status)
    .order(order, { ascending: false })
    .limit(limit);
  if (error) console.error("[news:editorList]", error.code, error.message);
  return { rows: (data ?? []) as EditorArticle[], total: count ?? 0 };
}

export async function editorCounts() {
  const supabase = await createClient();
  const count = async (status: string) =>
    (await supabase.from("news_articles").select("id", { count: "exact", head: true }).eq("status", status)).count ?? 0;
  const [draft, published, discarded] = await Promise.all([count("draft"), count("published"), count("discarded")]);
  return { draft, published, discarded };
}

export async function editorArticle(id: string): Promise<EditorArticle | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("news_articles").select(COLS).eq("id", id).maybeSingle();
  return (data as EditorArticle | null) ?? null;
}

export async function listSources(): Promise<NewsSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_sources")
    .select("id, name, feed_url, site_url, language, country, default_section, active, last_fetched_at, last_item_count, last_error")
    .order("active", { ascending: false })
    .order("name");
  if (error) console.error("[news:sources]", error.code, error.message);
  return (data ?? []) as NewsSource[];
}
