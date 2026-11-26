import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getSupabaseEnv } from "./env";

/** Cliente Supabase para Server Components, Server Actions y Route Handlers. */
export async function createClient() {
  // Supabase lee el reloj (caducidad de la sesión): con Cache Components eso solo
  // puede ocurrir en una petición real, no al prerenderizar.
  await connection();
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: no se pueden escribir cookies.
          // No pasa nada, el proxy ya refresca la sesión en cada petición.
        }
      },
    },
  });
}
