"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/auth/form-state";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENT_MAX_BYTES, attachmentTypes, cleanFileName, MESSAGE_MAX_CHARS } from "./options";

/*
 * Acciones de mensajería. La BD comprueba todo (can_message, can_send_in, bloqueos,
 * límites anti-spam); aquí se valida la entrada y se traducen los errores.
 */

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

export type SendState = FormState & { conversationId?: string };

const sendSchema = z.object({
  conversationId: z.preprocess((v) => (v === "" ? undefined : v), z.guid().optional()),
  to: z.preprocess((v) => (v === "" ? undefined : v), z.guid().optional()),
  listing: z.preprocess((v) => (v === "" ? undefined : v), z.guid().optional()),
  body: z.string().max(MESSAGE_MAX_CHARS),
});

function dbError(error: { code?: string; message?: string } | null, ctx: string): SendState {
  const msg = error?.message ?? "";
  if (msg.includes("rate_limited")) return { status: "error", error: "rateLimited" };
  if (msg.includes("cannot_message") || error?.code === "42501" || msg.includes("row-level security")) {
    return { status: "error", error: "cannotMessage" };
  }
  console.error(`[messages:${ctx}]`, error?.code, msg);
  return { status: "error", error: "generic" };
}

export async function sendMessage(_prev: SendState, fd: FormData): Promise<SendState> {
  const parsed = sendSchema.safeParse({
    conversationId: fd.get("conversationId") ?? undefined,
    to: fd.get("to") ?? undefined,
    listing: fd.get("listing") ?? undefined,
    body: String(fd.get("body") ?? ""),
  });
  if (!parsed.success) return { status: "error", error: "invalidForm" };
  const file = fd.get("attachment");
  const hasFile = file instanceof File && file.size > 0;
  const body = parsed.data.body.trim();
  if (!body && !hasFile) return { status: "error", error: "emptyMessage" };
  if (hasFile && !(file.type in attachmentTypes)) return { status: "error", error: "invalidAttachment" };
  if (hasFile && file.size > ATTACHMENT_MAX_BYTES) return { status: "error", error: "attachmentTooLarge" };

  const { supabase, userId } = await session();
  if (!userId) return { status: "error", error: "sessionExpired" };

  // Conversación existente o nueva (start_conversation valida si se puede escribir).
  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    if (!parsed.data.to) return { status: "error", error: "invalidForm" };
    const { data, error } = await supabase.rpc("start_conversation", { p_other: parsed.data.to, p_listing: parsed.data.listing ?? null });
    if (error || !data) return dbError(error, "start");
    conversationId = data as string;
  }

  let attachment: Record<string, unknown> = {};
  if (hasFile) {
    const path = `${conversationId}/${randomUUID()}.${attachmentTypes[file.type]}`;
    const { error } = await supabase.storage.from("message-attachments").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return dbError({ message: error.message }, "upload");
    attachment = { attachment_path: path, attachment_name: cleanFileName(file.name), attachment_size: file.size, attachment_type: file.type };
  }

  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, body, ...attachment });
  if (error) {
    if (attachment.attachment_path) await supabase.storage.from("message-attachments").remove([attachment.attachment_path as string]);
    return dbError(error, "send");
  }
  refresh();
  return { status: "success", conversationId };
}

export async function markRead(conversationId: string): Promise<void> {
  if (!z.guid().safeParse(conversationId).success) return;
  const { supabase, userId } = await session();
  if (!userId) return;
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}

export async function setBlocked(fd: FormData): Promise<void> {
  const other = z.guid().safeParse(fd.get("userId"));
  const block = fd.get("block") === "1";
  if (!other.success) return;
  const { supabase, userId } = await session();
  if (!userId) return;
  const { error } = block
    ? await supabase.from("user_blocks").upsert({ blocker_id: userId, blocked_id: other.data }, { ignoreDuplicates: true })
    : await supabase.from("user_blocks").delete().eq("blocker_id", userId).eq("blocked_id", other.data);
  if (error) console.error("[messages:block]", error.code, error.message);
  refresh();
}

export async function setAcceptMessages(fd: FormData): Promise<void> {
  const { supabase, userId } = await session();
  if (!userId) return;
  const { error } = await supabase.from("account_private").update({ accept_messages: fd.get("accept") === "on" }).eq("profile_id", userId);
  if (error) console.error("[messages:accept]", error.code, error.message);
  refresh();
}
