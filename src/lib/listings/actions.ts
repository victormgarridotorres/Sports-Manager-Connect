"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { hasLocale } from "@/i18n/config";
import type { FieldErrorKey, FormState } from "@/lib/auth/form-state";
import { createClient } from "@/lib/supabase/server";
import { LISTING_DAYS } from "./options";
import { applicationStatusSchema, applySchema, listingIdSchema, listingSchema } from "./schemas";

/*
 * Acciones del tablón. La BD decide qué puede publicar cada uno
 * (can_publish_listing) y quién puede postularse (can_apply_to_listing).
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

function invalid(error: z.ZodError): FormState {
  const fields: Record<string, FieldErrorKey> = {};
  for (const issue of error.issues) {
    const f = String(issue.path[0] ?? "");
    if (f && !fields[f]) fields[f] = f === "description" ? "description" : "invalid";
  }
  return { status: "error", error: "invalidForm", fields };
}

function dbError(error: { code?: string; message?: string }, ctx: string): FormState {
  if (error.message?.includes("row_limit_reached")) return { status: "error", error: "rowLimit" };
  if (error.code === "42501" || error.message?.includes("row-level security")) return { status: "error", error: "notAllowed" };
  if (error.code === "23505") return { status: "error", error: "duplicate" };
  console.error(`[listings:${ctx}]`, error.code, error.message);
  return { status: "error", error: "generic" };
}

export async function saveListing(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = listingSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await session();
  if (!userId) return expired;

  const id = fd.get("id");
  const locale = localeOf(fd);
  if (typeof id === "string" && id) {
    const ok = listingIdSchema.safeParse({ id });
    if (!ok.success) return { status: "error", error: "generic" };
    const { error } = await supabase.from("listings").update(parsed.data).eq("id", id).eq("owner_id", userId);
    if (error) return dbError(error, "update");
    redirect(`/${locale}/listings/${id}?saved=1`);
  }
  const { data, error } = await supabase.from("listings").insert({ ...parsed.data, owner_id: userId }).select("id").single();
  if (error || !data) return dbError(error ?? {}, "create");
  redirect(`/${locale}/listings/${data.id}?published=1`);
}

export async function setListingStatus(fd: FormData): Promise<void> {
  const parsed = listingIdSchema.safeParse({ id: fd.get("id") });
  const action = fd.get("action");
  if (!parsed.success || (action !== "close" && action !== "reopen" && action !== "renew")) return;
  const { supabase, userId } = await session();
  if (!userId) return;
  const expires = new Date(Date.now() + LISTING_DAYS * 86_400_000).toISOString();
  const patch = action === "close" ? { status: "closed" as const } : { status: "active" as const, expires_at: expires };
  const { error } = await supabase.from("listings").update(patch).eq("id", parsed.data.id).eq("owner_id", userId);
  if (error) console.error("[listings:status]", error.code, error.message);
  refresh();
}

export async function deleteListing(fd: FormData): Promise<void> {
  const parsed = listingIdSchema.safeParse({ id: fd.get("id") });
  if (!parsed.success) return;
  const { supabase, userId } = await session();
  if (!userId) return;
  const { error } = await supabase.from("listings").delete().eq("id", parsed.data.id).eq("owner_id", userId);
  if (error) console.error("[listings:delete]", error.code, error.message);
  redirect(`/${localeOf(fd)}/listings/mine?deleted=1`);
}

export async function applyToListing(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = applySchema.safeParse({ listingId: fd.get("listingId"), message: fd.get("message") });
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, userId } = await session();
  if (!userId) return expired;
  const { error } = await supabase
    .from("listing_applications")
    .insert({ listing_id: parsed.data.listingId, applicant_id: userId, message: parsed.data.message });
  if (error) return dbError(error, "apply");
  refresh();
  return { status: "success" };
}

export async function withdrawApplication(fd: FormData): Promise<void> {
  const parsed = listingIdSchema.safeParse({ id: fd.get("listingId") });
  if (!parsed.success) return;
  const { supabase, userId } = await session();
  if (!userId) return;
  const { error } = await supabase.from("listing_applications").delete().eq("listing_id", parsed.data.id).eq("applicant_id", userId);
  if (error) console.error("[listings:withdraw]", error.code, error.message);
  refresh();
}

export async function setApplicationStatus(fd: FormData): Promise<void> {
  const parsed = applicationStatusSchema.safeParse({ id: fd.get("id"), status: fd.get("status") });
  if (!parsed.success) return;
  const { supabase, userId } = await session();
  if (!userId) return;
  const { error } = await supabase.from("listing_applications").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) console.error("[listings:application-status]", error.code, error.message);
  refresh();
}

export async function setListingSaved(listingId: string, save: boolean): Promise<{ ok: boolean }> {
  const parsed = listingIdSchema.safeParse({ id: listingId });
  if (!parsed.success) return { ok: false };
  const { supabase, userId } = await session();
  if (!userId) return { ok: false };
  const { error } = save
    ? await supabase.from("listing_saves").upsert({ user_id: userId, listing_id: listingId }, { ignoreDuplicates: true })
    : await supabase.from("listing_saves").delete().eq("user_id", userId).eq("listing_id", listingId);
  if (error) {
    console.error("[listings:save]", error.code, error.message);
    return { ok: false };
  }
  refresh();
  return { ok: true };
}
