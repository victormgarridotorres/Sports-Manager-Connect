import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/** Cliente SIN cookies (rol anónimo): para contenido público que se puede cachear. */
export function anonClient() {
  const { url, key } = getSupabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
