"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ profileId: z.guid(), follow: z.boolean() });

/** Seguir / dejar de seguir (favorito). La BD comprueba permiso y visibilidad. */
export async function setFavorite(profileId: string, follow: boolean): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse({ profileId, follow });
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false };

  const { error } = follow
    ? await supabase.from("favorites").upsert({ user_id: userId, profile_id: profileId }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", userId).eq("profile_id", profileId);
  if (error) {
    console.error("[favorites]", error.code, error.message);
    return { ok: false };
  }
  refresh();
  return { ok: true };
}
