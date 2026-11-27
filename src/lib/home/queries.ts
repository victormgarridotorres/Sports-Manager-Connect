import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Availability, PlayerPosition, ProfessionalType } from "@/lib/profile/options";
import type { Role } from "@/lib/auth/permissions";
import type { ListingType } from "@/lib/listings/options";
import { anonClient } from "@/lib/supabase/anon";

/*
 * Datos de la portada. Se leen como visitante anónimo (solo lo público) y se
 * cachean unos minutos: la portada es la página más visitada.
 */

export type HomeStats = { countries: number; players: number; professionals: number; clubs: number; verified: number; available: number; listings: number };
export type NewMember = {
  id: string; role: Role; display_name: string; country: string | null; avatar_path: string | null; created_at: string;
  player_position: PlayerPosition | null; current_club: string | null; professional_type: ProfessionalType | null;
  current_entity: string | null; club_league: string | null;
};
export type HomeMove = {
  id: string; role: Role; display_name: string; country: string | null; avatar_path: string | null;
  player_position: PlayerPosition | null; birth_year: number | null; professional_type: ProfessionalType | null;
  current_club: string | null; availability: Availability; changed_at: string;
};
export type HomeListing = {
  id: string; type: ListingType; org_name: string; title: string; highlight: string | null; subtitle: string | null;
  league: string | null; country: string | null; player_position: PlayerPosition | null; created_at: string; interest: number;
};

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T[]> {
  const { data, error } = await anonClient().rpc(fn, args);
  if (error) console.error(`[home:${fn}]`, error.code ?? "", error.message);
  return (data ?? []) as T[];
}

export async function homeStats(): Promise<HomeStats | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("home");
  const r = (await rpc<Record<keyof HomeStats, number | string>>("home_stats"))[0];
  if (!r) return null;
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as HomeStats;
}

export async function newMembers(limit = 2): Promise<NewMember[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("home");
  return rpc<NewMember>("home_new_members", { p_limit: limit });
}

export async function homeMoves(limit = 5): Promise<HomeMove[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("home");
  return rpc<HomeMove>("home_moves", { p_limit: limit });
}

export async function homeListings(limit = 5): Promise<HomeListing[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("home");
  return rpc<HomeListing>("home_listings", { p_limit: limit });
}
