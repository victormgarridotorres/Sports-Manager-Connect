"use server";

import { refresh } from "next/cache";
import type { z } from "zod";
import type { FieldErrorKey, FormState } from "@/lib/auth/form-state";
import { createClient } from "@/lib/supabase/server";
import {
  basicsSchema,
  careerSchema,
  clubSchema,
  highlightSchema,
  idSchema,
  playerSchema,
  professionalSchema,
  rosterSchema,
} from "./schemas";

/*
 * Acciones del editor de perfil. Cada una vuelve a comprobar la sesión y la
 * BD aplica RLS: aunque alguien manipule el formulario, sólo puede tocar lo suyo.
 */

type DbError = { code?: string; message?: string } | null;

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

function invalid(error: z.ZodError): FormState {
  const fields: Record<string, FieldErrorKey> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || fields[field]) continue;
    fields[field] = issue.message === "video" ? "video" : field === "displayName" ? "displayName" : "invalid";
  }
  return { status: "error", error: "invalidForm", fields };
}

function dbResult(error: DbError, context: string): FormState {
  if (!error) {
    refresh();
    return { status: "success" };
  }
  if (error.message?.includes("row_limit_reached")) return { status: "error", error: "rowLimit" };
  if (error.code === "23505") return { status: "error", error: "duplicate" };
  console.error(`[profile:${context}]`, error.code, error.message);
  return { status: "error", error: "generic" };
}

const notSignedIn: FormState = { status: "error", error: "sessionExpired" };
const entries = (fd: FormData) => Object.fromEntries(fd.entries());

export async function saveBasics(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = basicsSchema.safeParse({ ...entries(fd), languages: fd.getAll("languages") });
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;

  const { displayName, ...rest } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, ...rest })
    .eq("id", userId);
  if (!error) {
    // En los clubes, el nombre visible es el del club.
    await supabase.from("clubs").update({ name: displayName, country: rest.country }).eq("owner_id", userId);
  }
  return dbResult(error, "basics");
}

export async function savePlayer(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = playerSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;
  const { error } = await supabase.from("player_profiles").update(parsed.data).eq("profile_id", userId);
  return dbResult(error, "player");
}

export async function saveProfessional(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = professionalSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;
  const { error } = await supabase.from("professional_profiles").update(parsed.data).eq("profile_id", userId);
  return dbResult(error, "professional");
}

export async function saveClub(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = clubSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;
  const { error } = await supabase.from("clubs").update(parsed.data).eq("owner_id", userId);
  return dbResult(error, "club");
}

export async function addCareerEntry(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = careerSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;
  const { error } = await supabase.from("career_entries").insert({ ...parsed.data, profile_id: userId });
  return dbResult(error, "career");
}

export async function addHighlight(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = highlightSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;
  const { provider, videoId } = parsed.data.url;
  const { error } = await supabase
    .from("highlights")
    .insert({ profile_id: userId, provider, video_id: videoId, title: parsed.data.title });
  return dbResult(error, "highlight");
}

export async function addRosterEntry(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = rosterSchema.safeParse(entries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;
  const { data: club } = await supabase.from("clubs").select("id").eq("owner_id", userId).maybeSingle();
  if (!club) return { status: "error", error: "generic" };
  const { error } = await supabase.from("club_roster").insert({ ...parsed.data, club_id: club.id });
  return dbResult(error, "roster");
}

const deletable = { career: "career_entries", highlight: "highlights", roster: "club_roster" } as const;

/** Borra una fila propia (trayectoria, vídeo o jugador de la plantilla). RLS impide borrar las ajenas. */
export async function deleteItem(fd: FormData): Promise<void> {
  const kind = fd.get("kind");
  const parsed = idSchema.safeParse({ id: fd.get("id") });
  if (!parsed.success || typeof kind !== "string" || !(kind in deletable)) return;
  const { supabase, userId } = await currentUser();
  if (!userId) return;
  const { error } = await supabase.from(deletable[kind as keyof typeof deletable]).delete().eq("id", parsed.data.id);
  if (error) console.error("[profile:delete]", error.code, error.message);
  refresh();
}

// --- Foto de perfil ---------------------------------------------------------

const MAX_AVATAR_BYTES = 1024 * 1024; // el cliente la reduce a 400 px WebP antes de enviarla
const AVATAR_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export async function uploadAvatar(_prev: FormState, fd: FormData): Promise<FormState> {
  const file = fd.get("avatar");
  if (!(file instanceof File) || !(file.type in AVATAR_TYPES)) return { status: "error", error: "invalidImage" };
  if (file.size > MAX_AVATAR_BYTES) return { status: "error", error: "imageTooLarge" };
  const { supabase, userId } = await currentUser();
  if (!userId) return notSignedIn;

  const path = `${userId}/${Date.now()}.${AVATAR_TYPES[file.type]}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (upErr) {
    console.error("[profile:avatar]", upErr.message);
    return { status: "error", error: "generic" };
  }

  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", userId).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    return dbResult(error, "avatar");
  }
  if (before?.avatar_path) await supabase.storage.from("avatars").remove([before.avatar_path]);
  return dbResult(null, "avatar");
}

export async function removeAvatar(): Promise<void> {
  const { supabase, userId } = await currentUser();
  if (!userId) return;
  const { data } = await supabase.from("profiles").select("avatar_path").eq("id", userId).single();
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (data?.avatar_path) await supabase.storage.from("avatars").remove([data.avatar_path]);
  refresh();
}
