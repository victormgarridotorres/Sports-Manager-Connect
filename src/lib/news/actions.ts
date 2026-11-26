"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import type { FieldErrorKey, FormState } from "@/lib/auth/form-state";
import { createClient } from "@/lib/supabase/server";
import { IMPORT_MAX_AGE_DAYS, IMPORT_MAX_PER_FEED } from "./options";
import { fetchFeed } from "./rss";
import { truncate } from "./rss-parse";
import { articleSchema, sourceSchema } from "./schemas";

/*
 * Acciones de la redacción. La BD (RLS) solo deja escribir a quien está en
 * news_editors; aquí además se comprueba para dar un mensaje claro.
 */

async function editor() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  if (!userId) return { supabase, ok: false as const, error: "sessionExpired" as const };
  const { data: isEditor } = await supabase.rpc("is_news_editor");
  return isEditor === true ? { supabase, ok: true as const } : { supabase, ok: false as const, error: "notAllowed" as const };
}

const localeOf = (fd: FormData) => {
  const l = fd.get("locale");
  return typeof l === "string" && hasLocale(l) ? l : "es";
};
const entries = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== ""));

export type ImportState = FormState & { imported?: number; failed?: string[]; preview?: string[] };

/** Trae las últimas noticias de las fuentes activas (o de una) y las guarda como BORRADOR. */
export async function importNews(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const ctx = await editor();
  if (!ctx.ok) return { status: "error", error: ctx.error };
  const { supabase } = ctx;
  const only = fd.get("sourceId");
  let q = supabase.from("news_sources").select("id, name, feed_url, language, country, default_section").eq("active", true);
  if (typeof only === "string" && only) q = supabase.from("news_sources").select("id, name, feed_url, language, country, default_section").eq("id", only);
  const { data: sources } = await q;
  if (!sources?.length) return { status: "error", error: "noActiveSources" };

  const minDate = Date.now() - IMPORT_MAX_AGE_DAYS * 86_400_000;
  let imported = 0;
  const failed: string[] = [];
  await Promise.all(
    sources.map(async (s) => {
      try {
        const items = (await fetchFeed(s.feed_url))
          .filter((i) => !i.publishedAt || new Date(i.publishedAt).getTime() >= minDate)
          .slice(0, IMPORT_MAX_PER_FEED);
        let added = 0;
        if (items.length) {
          const { data, error } = await supabase
            .from("news_articles")
            .upsert(
              items.map((i) => ({
                status: "draft",
                section: s.default_section,
                country: s.country,
                language: s.language,
                title: i.title.length >= 5 ? i.title : `${i.title} · ${s.name}`,
                summary: i.summary ? truncate(i.summary, 600) : null,
                source_id: s.id,
                source_name: s.name,
                source_url: i.link,
                source_published_at: i.publishedAt,
              })),
              { onConflict: "source_url", ignoreDuplicates: true },
            )
            .select("id");
          if (error) throw new Error(error.message.slice(0, 120));
          added = data?.length ?? 0;
        }
        imported += added;
        await supabase.from("news_sources").update({ last_fetched_at: new Date().toISOString(), last_item_count: added, last_error: null }).eq("id", s.id);
      } catch (e) {
        failed.push(s.name);
        const msg = e instanceof Error ? (e.name === "TimeoutError" ? "Tiempo de espera agotado" : e.message) : "Error";
        await supabase.from("news_sources").update({ last_fetched_at: new Date().toISOString(), last_error: msg.slice(0, 300) }).eq("id", s.id);
      }
    }),
  );
  refresh();
  return { status: "success", imported, failed };
}

/** Prueba una fuente sin guardar nada: devuelve los primeros titulares. */
export async function testSource(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const ctx = await editor();
  if (!ctx.ok) return { status: "error", error: ctx.error };
  const id = String(fd.get("sourceId") ?? "");
  const { data: s } = await ctx.supabase.from("news_sources").select("id, feed_url").eq("id", id).maybeSingle();
  if (!s) return { status: "error", error: "generic" };
  try {
    const items = await fetchFeed(s.feed_url);
    await ctx.supabase.from("news_sources").update({ last_error: items.length ? null : "0 noticias" }).eq("id", s.id);
    refresh();
    return { status: "success", preview: items.slice(0, 5).map((i) => i.title), imported: items.length };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "TimeoutError" ? "Tiempo de espera agotado" : e.message) : "Error";
    await ctx.supabase.from("news_sources").update({ last_error: msg.slice(0, 300) }).eq("id", s.id);
    refresh();
    return { status: "error", error: "feedFailed", failed: [msg] };
  }
}

export async function saveSource(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await editor();
  if (!ctx.ok) return { status: "error", error: ctx.error };
  const parsed = sourceSchema.safeParse(entries(fd));
  if (!parsed.success) {
    const fields: Record<string, FieldErrorKey> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] = "invalid";
    return { status: "error", error: "invalidForm", fields };
  }
  const { id, ...row } = parsed.data;
  const { error } = id
    ? await ctx.supabase.from("news_sources").update(row).eq("id", id)
    : await ctx.supabase.from("news_sources").insert(row);
  if (error) return { status: "error", error: error.code === "23505" ? "duplicate" : "generic" };
  refresh();
  return { status: "success" };
}

export async function setSourceActive(fd: FormData): Promise<void> {
  const ctx = await editor();
  if (!ctx.ok) return;
  await ctx.supabase.from("news_sources").update({ active: fd.get("active") === "1" }).eq("id", String(fd.get("sourceId") ?? ""));
  refresh();
}

export async function deleteSource(fd: FormData): Promise<void> {
  const ctx = await editor();
  if (!ctx.ok) return;
  await ctx.supabase.from("news_sources").delete().eq("id", String(fd.get("sourceId") ?? ""));
  refresh();
}

/** Guarda una noticia como borrador, la publica, la retira o la descarta. */
export async function saveArticle(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await editor();
  if (!ctx.ok) return { status: "error", error: ctx.error };
  const parsed = articleSchema.safeParse(entries(fd));
  if (!parsed.success) {
    const fields: Record<string, FieldErrorKey> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] = i.path[0] === "title" ? "newsTitle" : "invalid";
    return { status: "error", error: "invalidForm", fields };
  }
  const { id, intent, ...data } = parsed.data;
  const status = intent === "publish" ? "published" : intent === "discard" ? "discarded" : "draft";
  if (status === "published") {
    const hasBody = !!data.body;
    const hasSource = id ? !!(await ctx.supabase.from("news_articles").select("source_url").eq("id", id).maybeSingle()).data?.source_url : false;
    if (!data.summary || data.summary.length < 20) return { status: "error", error: "invalidForm", fields: { summary: "newsSummary" } };
    if (!hasBody && !hasSource) return { status: "error", error: "invalidForm", fields: { body: "newsBody" } };
  }
  const row = { ...data, status, ...(intent === "unpublish" ? { published_at: null } : {}) };
  const res = id
    ? await ctx.supabase.from("news_articles").update(row).eq("id", id).select("id").single()
    : await ctx.supabase.from("news_articles").insert(row).select("id").single();
  if (res.error || !res.data) {
    console.error("[news:save]", res.error?.code, res.error?.message);
    return { status: "error", error: res.error?.code === "23514" ? "invalidForm" : "generic" };
  }
  updateTag("news");
  const locale = localeOf(fd);
  if (status === "published") redirect(`/${locale}/news/${res.data.id}?published=1`);
  redirect(`/${locale}/news/editor?tab=${status === "discarded" ? "discarded" : "draft"}&saved=1`);
}

export async function deleteArticle(fd: FormData): Promise<void> {
  const ctx = await editor();
  if (!ctx.ok) return;
  await ctx.supabase.from("news_articles").delete().eq("id", String(fd.get("id") ?? ""));
  updateTag("news");
  redirect(`/${localeOf(fd)}/news/editor?tab=${String(fd.get("tab") ?? "draft")}`);
}

/** Descarta de golpe varios borradores (los que no interesan). */
export async function discardDrafts(fd: FormData): Promise<void> {
  const ctx = await editor();
  if (!ctx.ok) return;
  const ids = fd.getAll("ids").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  if (ids.length) await ctx.supabase.from("news_articles").update({ status: "discarded" }).in("id", ids).eq("status", "draft");
  refresh();
}
