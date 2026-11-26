import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, ListingType } from "./options";
import { listingRpcArgs, type ListingFilters } from "./params";
import type { PlayerPosition, ProfessionalType } from "@/lib/profile/options";
import type { Role } from "@/lib/auth/permissions";

export type ListingRow = {
  id: string;
  owner_id: string;
  type: ListingType;
  org_name: string;
  title: string;
  highlight: string | null;
  subtitle: string | null;
  league: string | null;
  country: string | null;
  position: PlayerPosition | null;
  salary: string | null;
  status: "active" | "closed";
  created_at: string;
  expires_at: string;
  owner_name: string;
  owner_avatar: string | null;
  owner_verified: boolean;
  interest: number;
  applications: number | null;
  is_saved: boolean;
  my_application: ApplicationStatus | null;
  total_count: number;
};

export type ListingDetail = ListingRow & {
  description: string;
  requirements: string | null;
  benefits: string | null;
  about: string | null;
  owner_role: Role;
  owner_city: string | null;
  my_message: string | null;
};

export type Candidate = {
  id: string;
  applicant_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  name: string;
  role: Role;
  avatar_path: string | null;
  country: string | null;
  position: PlayerPosition | null;
  professional_type: ProfessionalType | null;
};

export async function searchListings(filters: ListingFilters, scope: "board" | "mine" | "saved" | "applied" = "board", exclude?: string, limit?: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_listings", listingRpcArgs(filters, scope, exclude, limit));
  if (error) {
    console.error("[listings:search]", error.code, error.message);
    return { rows: [] as ListingRow[], total: 0, error: true };
  }
  const rows = (data ?? []) as ListingRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), error: false };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un anuncio con todo su detalle (o null si no existe o no se puede ver). */
export async function getListing(id: string, viewerId: string): Promise<ListingDetail | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: l } = await supabase
    .from("listings")
    .select("id, owner_id, type, org_name, title, highlight, subtitle, league, country, position, salary, description, requirements, benefits, about, status, created_at, expires_at, owner:profiles!listings_owner_id_fkey(display_name, avatar_path, verification_status, role, city)")
    .eq("id", id)
    .maybeSingle();
  if (!l) return null;
  const owner = (Array.isArray(l.owner) ? l.owner[0] : l.owner) as
    | { display_name: string; avatar_path: string | null; verification_status: string; role: Role; city: string | null }
    | null;

  const [interest, saved, mine, count] = await Promise.all([
    supabase.rpc("listing_interest", { p_listing_id: id }),
    supabase.from("listing_saves").select("listing_id").eq("listing_id", id).eq("user_id", viewerId).maybeSingle(),
    supabase.from("listing_applications").select("status, message").eq("listing_id", id).eq("applicant_id", viewerId).maybeSingle(),
    l.owner_id === viewerId
      ? supabase.from("listing_applications").select("id", { count: "exact", head: true }).eq("listing_id", id)
      : Promise.resolve({ count: null }),
  ]);

  return {
    ...(l as unknown as ListingDetail),
    owner_name: owner?.display_name ?? l.org_name,
    owner_avatar: owner?.avatar_path ?? null,
    owner_verified: owner?.verification_status === "verified",
    owner_role: owner?.role ?? "club",
    owner_city: owner?.city ?? null,
    interest: typeof interest.data === "number" ? interest.data : 0,
    is_saved: !!saved.data,
    my_application: (mine.data?.status as ApplicationStatus | undefined) ?? null,
    my_message: mine.data?.message ?? null,
    applications: count.count ?? null,
    total_count: 1,
  };
}

/** Candidaturas de un anuncio propio (la RLS solo las devuelve al autor). */
export async function getCandidates(listingId: string): Promise<Candidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_applications")
    .select("id, applicant_id, message, status, created_at, applicant:profiles!listing_applications_applicant_id_fkey(display_name, role, avatar_path, country, player:player_profiles(position), pro:professional_profiles(professional_type))")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listings:candidates]", error.code, error.message);
    return [];
  }
  type Row = {
    id: string; applicant_id: string; message: string | null; status: ApplicationStatus; created_at: string;
    applicant: { display_name: string; role: Role; avatar_path: string | null; country: string | null;
      player: { position: PlayerPosition | null } | { position: PlayerPosition | null }[] | null;
      pro: { professional_type: ProfessionalType | null } | { professional_type: ProfessionalType | null }[] | null } | null;
  };
  const first = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    applicant_id: r.applicant_id,
    message: r.message,
    status: r.status,
    created_at: r.created_at,
    name: r.applicant?.display_name ?? "—",
    role: r.applicant?.role ?? "player",
    avatar_path: r.applicant?.avatar_path ?? null,
    country: r.applicant?.country ?? null,
    position: first(r.applicant?.player)?.position ?? null,
    professional_type: first(r.applicant?.pro)?.professional_type ?? null,
  }));
}

/** Tipo de profesional del usuario (para saber si es agente). */
export async function getProfessionalType(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("professional_profiles").select("professional_type").eq("profile_id", userId).maybeSingle();
  return (data?.professional_type as string | null | undefined) ?? null;
}
