"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/auth/form-state";
import { createClient } from "@/lib/supabase/server";

/*
 * Acciones del panel. Cada función de la BD comprueba que quien llama es
 * administrador y deja constancia en admin_log.
 */

const id = z.guid();
const note = z.string().trim().max(500).optional();

function fail(error: { code?: string; message?: string; hint?: string }, ctx: string): FormState {
  if (error.hint === "self") return { status: "error", error: "adminSelf" };
  if (error.hint === "admin") return { status: "error", error: "adminProtected" };
  if (error.code === "42501") return { status: "error", error: "notAllowed" };
  console.error(`[admin:${ctx}]`, error.code, error.message);
  return { status: "error", error: "generic" };
}

export async function setVerification(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = z
    .object({ userId: id, status: z.enum(["pending", "verified", "rejected"]), note })
    .safeParse({ userId: fd.get("userId"), status: fd.get("status"), note: fd.get("note") || undefined });
  if (!parsed.success) return { status: "error", error: "invalidForm" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_verification", { p_id: parsed.data.userId, p_status: parsed.data.status, p_note: parsed.data.status === "rejected" ? (parsed.data.note ?? null) : null });
  if (error) return fail(error, "verification");
  refresh();
  return { status: "success" };
}

export async function setSuspended(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = z
    .object({ userId: id, suspend: z.enum(["1", "0"]), note })
    .safeParse({ userId: fd.get("userId"), suspend: fd.get("suspend"), note: fd.get("note") || undefined });
  if (!parsed.success) return { status: "error", error: "invalidForm" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_suspended", { p_id: parsed.data.userId, p_suspended: parsed.data.suspend === "1", p_reason: parsed.data.note ?? null });
  if (error) return fail(error, "suspend");
  refresh();
  return { status: "success" };
}

export async function setStaff(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = z
    .object({ userId: id, role: z.enum(["admin", "editor", "moderator"]), on: z.enum(["1", "0"]) })
    .safeParse({ userId: fd.get("userId"), role: fd.get("role"), on: fd.get("on") });
  if (!parsed.success) return { status: "error", error: "invalidForm" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_staff", { p_id: parsed.data.userId, p_role: parsed.data.role, p_on: parsed.data.on === "1" });
  if (error) return fail(error, "staff");
  refresh();
  return { status: "success" };
}

export async function resolveReports(fd: FormData): Promise<void> {
  const parsed = z
    .object({ topicId: id.optional(), postId: id.optional(), action: z.enum(["dismiss", "hide"]) })
    .safeParse({ topicId: fd.get("topicId") || undefined, postId: fd.get("postId") || undefined, action: fd.get("action") });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_reports", { p_topic: parsed.data.topicId ?? null, p_post: parsed.data.postId ?? null, p_action: parsed.data.action });
  if (error) console.error("[admin:reports]", error.code, error.message);
  refresh();
}
