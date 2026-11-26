"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { hasLocale } from "@/i18n/config";
import type { FieldErrorKey, FormState } from "@/lib/auth/form-state";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { editPostSchema, editTopicSchema, identitySchema, moderateSchema, replySchema, reportSchema, topicSchema } from "./schemas";

/*
 * Acciones del foro. Toda la escritura pasa por funciones de la BD
 * (forum_create_topic, forum_reply…), que comprueban permisos, alias,
 * límites antispam y que nunca exponen quién hay detrás de un alias.
 */

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}
const expired: FormState = { status: "error", error: "sessionExpired" };
const localeOf = (fd: FormData) => {
  const l = fd.get("locale");
  return typeof l === "string" && hasLocale(l) ? l : "es";
};
const entries = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string" && v !== ""));

const fieldKey: Record<string, FieldErrorKey> = { alias: "alias", title: "topicTitle", body: "topicBody" };
function invalid(error: z.ZodError): FormState {
  const fields: Record<string, FieldErrorKey> = {};
  for (const issue of error.issues) {
    const f = String(issue.path[0] ?? "");
    if (f && !fields[f]) fields[f] = fieldKey[f] ?? "invalid";
  }
  return { status: "error", error: "invalidForm", fields };
}

function dbError(error: { code?: string; message?: string; hint?: string }, ctx: string): FormState {
  if (error.hint === "alias_required") return { status: "error", error: "aliasRequired" };
  if (error.hint === "rate_limited") return { status: "error", error: "rateLimited" };
  if (error.hint === "topic_closed") return { status: "error", error: "topicClosed" };
  if (error.hint === "has_replies") return { status: "error", error: "topicHasReplies" };
  if (error.code === "23505") return { status: "error", error: "aliasTaken" };
  if (error.code === "42501" || error.message?.includes("row-level security")) return { status: "error", error: "notAllowed" };
  console.error(`[forum:${ctx}]`, error.code, error.message);
  return { status: "error", error: "generic" };
}

/** Crea o cambia el alias y el avatar del foro. */
export async function saveForumIdentity(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = identitySchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await session();
  if (!userId) return expired;

  const { data: free } = await supabase.rpc("forum_alias_available", { p_alias: parsed.data.alias });
  if (free === false) return { status: "error", error: "aliasTaken", fields: { alias: "aliasTaken" } };

  const { data: existing } = await supabase.from("forum_identities").select("profile_id").eq("profile_id", userId).maybeSingle();
  const { error } = existing
    ? await supabase.from("forum_identities").update(parsed.data).eq("profile_id", userId)
    : await supabase.from("forum_identities").insert(parsed.data);
  if (error) {
    const st = dbError(error, "identity");
    return st.status === "error" && st.error === "aliasTaken" ? { ...st, fields: { alias: "aliasTaken" } } : st;
  }
  const locale = localeOf(fd);
  const next = fd.get("next");
  if (typeof next === "string" && next) redirect(safeNextPath(next, `/${locale}/community`));
  refresh();
  return { status: "success" };
}

export async function createTopic(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = topicSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await session();
  if (!userId) return expired;
  const { data, error } = await supabase.rpc("forum_create_topic", {
    p_category: parsed.data.category,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
  });
  if (error || !data) return dbError(error ?? {}, "create");
  redirect(`/${localeOf(fd)}/community/t/${data}?posted=1`);
}

export async function replyToTopic(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = replySchema.safeParse(entries(fd));
  if (!parsed.success) return { status: "error", error: "invalidForm", fields: { body: "required" } };
  const { supabase, userId } = await session();
  if (!userId) return expired;
  const { error } = await supabase.rpc("forum_reply", { p_topic: parsed.data.topicId, p_body: parsed.data.body });
  if (error) return dbError(error, "reply");
  refresh();
  return { status: "success" };
}

export async function editTopic(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = editTopicSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await session();
  if (!userId) return expired;
  const { error } = await supabase.rpc("forum_edit_topic", { p_id: parsed.data.topicId, p_title: parsed.data.title, p_body: parsed.data.body });
  if (error) return dbError(error, "editTopic");
  refresh();
  return { status: "success" };
}

export async function editPost(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = editPostSchema.safeParse(entries(fd));
  if (!parsed.success) return { status: "error", error: "invalidForm", fields: { body: "required" } };
  const { supabase, userId } = await session();
  if (!userId) return expired;
  const { error } = await supabase.rpc("forum_edit_post", { p_id: parsed.data.postId, p_body: parsed.data.body });
  if (error) return dbError(error, "editPost");
  refresh();
  return { status: "success" };
}

export async function deleteTopic(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get("topicId") ?? "");
  const category = String(fd.get("category") ?? "");
  const { supabase, userId } = await session();
  if (!userId) return expired;
  const { error } = await supabase.rpc("forum_delete_topic", { p_id: id });
  if (error) return dbError(error, "deleteTopic");
  redirect(`/${localeOf(fd)}/community/${encodeURIComponent(category)}?deleted=1`);
}

export async function deletePost(fd: FormData): Promise<void> {
  const { supabase, userId } = await session();
  if (!userId) return;
  const { error } = await supabase.rpc("forum_delete_post", { p_id: String(fd.get("postId") ?? "") });
  if (error) console.error("[forum:deletePost]", error.code, error.message);
  refresh();
}

export async function reportContent(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = reportSchema.safeParse(entries(fd));
  if (!parsed.success) return { status: "error", error: "invalidForm" };
  const { supabase, userId } = await session();
  if (!userId) return expired;
  const { error } = await supabase.rpc("forum_report", {
    p_topic: parsed.data.topicId ?? null,
    p_post: parsed.data.postId ?? null,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note ?? null,
  });
  if (error) return dbError(error, "report");
  refresh();
  return { status: "success" };
}

export async function moderate(fd: FormData): Promise<void> {
  const parsed = moderateSchema.safeParse(entries(fd));
  if (!parsed.success) return;
  const { supabase, userId } = await session();
  if (!userId) return;
  const { error } = await supabase.rpc("forum_moderate", {
    p_action: parsed.data.action,
    p_topic: parsed.data.topicId ?? null,
    p_post: parsed.data.postId ?? null,
  });
  if (error) console.error("[forum:moderate]", error.code, error.message);
  refresh();
}
