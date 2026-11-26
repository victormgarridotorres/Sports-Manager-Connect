import "server-only";
import type { Role } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  other_role: Role;
  listing_id: string | null;
  listing_title: string | null;
  last_message_at: string;
  preview: string | null;
  last_from_me: boolean;
  unread: boolean;
  blocked: boolean;
};

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  attachment: { name: string; size: number; type: string; url: string | null } | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string | undefined | null): v is string => !!v && UUID.test(v);

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_conversations");
  if (error) {
    console.error("[messages:list]", error.code, error.message);
    return [];
  }
  return (data ?? []) as ConversationSummary[];
}

export async function unreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_conversations");
  return typeof data === "number" ? data : 0;
}

export async function canMessage(otherId: string): Promise<boolean> {
  if (!isUuid(otherId)) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_message", { p_other: otherId });
  return data === true;
}

/** Últimos mensajes de una conversación (RLS: solo si participo), con enlaces temporales a los adjuntos. */
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!isUuid(conversationId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, attachment_path, attachment_name, attachment_size, attachment_type")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[messages:thread]", error.code, error.message);
    return [];
  }
  const rows = (data ?? []).reverse();
  const paths = rows.map((r) => r.attachment_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("message-attachments").createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    sender_id: r.sender_id,
    body: r.body,
    created_at: r.created_at,
    attachment: r.attachment_path
      ? { name: r.attachment_name ?? "file", size: r.attachment_size ?? 0, type: r.attachment_type ?? "", url: signed.get(r.attachment_path) ?? null }
      : null,
  }));
}

/** Datos básicos de alguien con quien aún no hay conversación (respeta su visibilidad). */
export async function getRecipient(otherId: string) {
  if (!isUuid(otherId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_path, role").eq("id", otherId).maybeSingle();
  return data as { id: string; display_name: string; avatar_path: string | null; role: Role } | null;
}

export async function messagePrefs(userId: string) {
  const supabase = await createClient();
  const [{ data: priv }, { data: blocks }] = await Promise.all([
    supabase.from("account_private").select("accept_messages").eq("profile_id", userId).maybeSingle(),
    supabase.from("user_blocks").select("blocked_id, created_at, blocked:profiles!user_blocks_blocked_id_fkey(display_name)").order("created_at", { ascending: false }),
  ]);
  type B = { blocked_id: string; blocked: { display_name: string } | { display_name: string }[] | null };
  return {
    acceptMessages: priv?.accept_messages ?? true,
    blocked: ((blocks ?? []) as unknown as B[]).map((b) => ({
      id: b.blocked_id,
      name: (Array.isArray(b.blocked) ? b.blocked[0]?.display_name : b.blocked?.display_name) ?? null,
    })),
  };
}
