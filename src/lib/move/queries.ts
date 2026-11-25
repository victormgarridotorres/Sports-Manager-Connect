import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toRpcArgs, type MoveFilters } from "./params";
import type { Role, VerificationStatus } from "@/lib/auth/permissions";
import type { Availability, DefensePosition, Hand, PlayerPosition, ProfessionalType } from "@/lib/profile/options";

export type MoveRow = {
  id: string;
  role: Role;
  display_name: string;
  country: string | null;
  city: string | null;
  avatar_path: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  position: PlayerPosition | null;
  defense_position: DefensePosition | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  dominant_hand: Hand | null;
  availability: Availability | null;
  current_club: string | null;
  current_league: string | null;
  professional_type: ProfessionalType | null;
  years_experience: number | null;
  current_entity: string | null;
  club_league: string | null;
  founded_year: number | null;
  roster_count: number | null;
  followers: number;
  is_favorite: boolean;
  total_count: number;
};

/** Búsqueda de Move / lista de Favoritos. La BD aplica visibilidad y permisos. */
export async function searchMove(filters: MoveFilters, favoritesOnly = false) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_move", toRpcArgs(filters, favoritesOnly));
  if (error) {
    console.error("[move:search]", error.code, error.message);
    return { rows: [] as MoveRow[], total: 0, error: true };
  }
  const rows = (data ?? []) as MoveRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), error: false };
}

/** ¿Sigo a este perfil? y número de seguidores (para el perfil público). */
export async function followState(profileId: string) {
  const supabase = await createClient();
  const [{ data: count }, { data: mine }] = await Promise.all([
    supabase.rpc("follower_count", { p_profile_id: profileId }),
    supabase.from("favorites").select("profile_id").eq("profile_id", profileId).maybeSingle(),
  ]);
  return { followers: typeof count === "number" ? count : 0, following: !!mine };
}
