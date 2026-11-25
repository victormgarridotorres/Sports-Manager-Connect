import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BaseProfile, CareerEntry, ClubData, FullProfile, Highlight, PlayerData, ProfessionalData, RosterEntry } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Carga un perfil completo. La BD (RLS + can_view_profile) decide qué puede
 * ver quien pregunta: si no tiene permiso, devuelve null.
 */
export async function loadProfile(id: string): Promise<FullProfile | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, display_name, country, city, bio, languages, avatar_path, visibility, verification_status, preferred_locale, created_at")
    .eq("id", id)
    .maybeSingle<BaseProfile>();
  if (!profile) return null;

  const empty = { player: null, professional: null, club: null, career: [], highlights: [], roster: [] };

  if (profile.role === "player" || profile.role === "professional") {
    const table = profile.role === "player" ? "player_profiles" : "professional_profiles";
    const columns =
      profile.role === "player"
        ? "position, secondary_position, defense_position, secondary_defense_position, birth_year, height_cm, weight_kg, dominant_hand, availability, current_club, current_league"
        : "professional_type, years_experience, availability, current_entity, education, achievements";
    const [details, career, highlights] = await Promise.all([
      supabase.from(table).select(columns).eq("profile_id", id).maybeSingle(),
      supabase.from("career_entries").select("id, start_year, end_year, organization, detail").eq("profile_id", id)
        .order("start_year", { ascending: false }),
      supabase.from("highlights").select("id, provider, video_id, title").eq("profile_id", id)
        .order("created_at", { ascending: true }),
    ]);
    return {
      ...empty,
      profile,
      player: profile.role === "player" ? ((details.data as PlayerData | null) ?? null) : null,
      professional: profile.role === "professional" ? ((details.data as ProfessionalData | null) ?? null) : null,
      career: (career.data as CareerEntry[] | null) ?? [],
      highlights: (highlights.data as Highlight[] | null) ?? [],
    };
  }

  if (profile.role === "club") {
    const { data: club } = await supabase
      .from("clubs")
      .select("id, name, description, city, founded_year, league, venue, website, honours")
      .eq("owner_id", id)
      .maybeSingle<ClubData>();
    const roster = club
      ? ((await supabase.from("club_roster").select("id, player_name, position, shirt_number").eq("club_id", club.id)
          .order("shirt_number", { ascending: true, nullsFirst: false })).data as RosterEntry[] | null) ?? []
      : [];
    return { ...empty, profile, club, roster };
  }

  return { ...empty, profile };
}
