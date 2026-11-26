"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { markRead } from "@/lib/messages/actions";
import { browserClient } from "@/lib/supabase/client";

/**
 * Mantiene la bandeja al día: escucha mensajes nuevos con Supabase Realtime (la
 * RLS hace que cada uno reciba solo los suyos) y, por si Realtime no está
 * disponible, refresca cada 30 s mientras la pestaña está visible.
 * Si hay una conversación abierta, la marca como leída.
 */
export function RealtimeSync({ conversationId }: { conversationId?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (conversationId) void markRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const supabase = browserClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refreshSoon = () => {
      if (timer) return;
      timer = setTimeout(async () => {
        timer = null;
        if (conversationId) await markRead(conversationId);
        router.refresh();
      }, 250);
    };
    const channel = supabase
      .channel(conversationId ? `conv:${conversationId}` : "inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", ...(conversationId ? { filter: `conversation_id=eq.${conversationId}` } : {}) },
        refreshSoon,
      )
      .subscribe();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => {
      clearInterval(poll);
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  return null;
}
